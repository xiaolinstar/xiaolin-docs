---
title: 17 ｜ Compose 持续发布
description: 基于 Compose 完成固定镜像、审批、健康验收和显式回退。
date: 2026-03-28
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

## 发布的输入必须先确定

本课在单台练习服务器部署前面课程的 `delivery-demo`。需要 Docker Compose v2（支持 `up --wait`）、Bash、curl，以及仓库课配置的镜像拉取权限。先完成 Compose 发布，再进入[轻量 K3s 集群](k3s.md)。

前面的本地 web + db 用于验证网络与存储，本课在独立目标目录先发布 web，数据库生命周期独立管理。不要把前面练习目录直接替换成本课文件，或通过 down -v 清除数据；数据库版本演进在后续迁移课处理。

发布记录至少包含镜像 digest、配置版本、目标环境、发起人和审批结果。`git pull` 获取分支最新状态会改变发布输入，所以本例不在服务器拉取浮动分支。

## 定义服务与健康条件

在部署用户拥有的 `/opt/delivery-demo` 中保存 `compose.yaml`：

```yaml
services:
  web:
    image: ${IMAGE_REF:?必须提供镜像 digest 引用}
    ports:
      - "127.0.0.1:8080:80"
    environment:
      APP_ENV: ${APP_ENV:-production}
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O - http://127.0.0.1/healthz | grep -qx ok"]
      interval: 5s
      timeout: 3s
      retries: 6
      start_period: 5s
```

这里仅绑定服务器回环地址。远程查看可建立 SSH 隧道：`ssh -L 8080:127.0.0.1:8080 部署用户@服务器`，再在本机访问 `http://127.0.0.1:8080`。

Compose 不提供跨服务事务，也不会在部分失败时自动恢复旧版。普通 `depends_on` 只描述启动依赖；数据库就绪需配合 `healthcheck` 和 `condition: service_healthy`。单机替换容器可能短暂中断，本课不承诺零停机。

## 将部署结果变成可检查的退出码

在同一目录保存 `deploy.sh`。它只接受 digest 引用，部署前先拉取，部署后验证健康与首页；失败保留现场，回退由操作人明确选择。

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /opt/delivery-demo
ref="${1:?传入镜像 digest 引用}"
[[ "$ref" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || exit 2
# Linux flock 防止手动发布和流水线同时操作。
exec 9>.deploy.lock
flock -n 9 || { echo '已有发布正在执行'; exit 3; }
export IMAGE_REF="$ref"
docker compose config --quiet
docker compose pull
if ! docker compose up -d --wait --wait-timeout 90; then
  docker compose ps
  docker compose logs --tail=100 web
  exit 1
fi
curl --fail --silent --show-error http://127.0.0.1:8080/ | grep -q delivery-demo
# 只有验收成功，才更新稳定版本记录。
if [ -f current-image.txt ]; then cp current-image.txt previous-image.txt; fi
printf '%s\n' "$ref" > current-image.txt
printf '发布通过：%s\n' "$ref"
```

首次执行：

```bash
cd /opt/delivery-demo
bash deploy.sh "$(cat image.txt)"
```

`image.txt` 从 CI 附件取得。发布失败后先收集日志；若确认可回退且已有上一稳定记录，将 **失败前的 `current-image.txt`** 传给脚本。成功发布后主动回退才使用 `previous-image.txt`。不要在发布结束时立即清除回退镜像。

## GitHub Actions 生产审批

在 GitHub 建立 `production` Environment，配置 required reviewers、允许部署的分支，以及以下 Environment secrets：`SERVER_HOST`、`SERVER_USER`、`SERVER_KEY`、`SERVER_FINGERPRINT`。不同套餐和仓库可见性对环境保护规则的支持不同，先确认实际配置生效；仅写 `environment: production` 不会自动创建审批规则。

通过可信渠道核对服务器 SSH host fingerprint。密钥和密码是可配置的认证方式，并非天然互斥；本例用专用部署密钥，不使用个人管理员登录。

保存 `.github/workflows/cd.yml`：

```yaml
name: Deploy Compose
on:
  workflow_dispatch:
    inputs:
      image_ref:
        description: 从审核过的 CI 记录复制完整 digest 引用
        required: true
        type: string
permissions:
  contents: read
concurrency:
  group: compose-production
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Validate input
        env:
          IMAGE_REF: ${{ inputs.image_ref }}
        run: |
          [[ "$IMAGE_REF" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]
      - name: Deploy approved image
        uses: appleboy/ssh-action@v1.2.0
        env:
          IMAGE_REF: ${{ inputs.image_ref }}
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_KEY }}
          fingerprint: ${{ secrets.SERVER_FINGERPRINT }}
          envs: IMAGE_REF
          script: |
            set -eu
            bash /opt/delivery-demo/deploy.sh "$IMAGE_REF"
```

审批人核对 image reference 和 CI 来源；高级篇再把来源校验自动化。服务器上的脚本和 Compose 文件也应版本化并记录变更，本课首次由维护者安装审核过的版本；变更它们属于另一次发布。

## 最小验收与边界

- 提交代码只触发 CI，生产服务器不变化。
- 手动发起 CD 后，配置了 reviewer 的任务等待审批；拒绝后不连接服务器。
- 使用不存在的 digest：在拉取阶段失败，旧容器继续运行。
- 用缺少健康端点的实验镜像：任务失败，不记录为稳定版本；检查日志并恢复失败前的稳定镜像。
- 成功后检查首页、健康端点、容器镜像引用和 workflow 结果一致。

本课验收的是单机发布能力。高可用、业务指标和数据库兼容性分别在后续课程加入，不能由 `up -d` 的成功退出推导出来。

参考：[Compose 启动顺序](https://docs.docker.com/compose/how-tos/startup-order/)、[GitHub Environment 保护](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)。
