---
title: 16 ｜ 持续集成流水线
description: 用同一个示例完成测试、镜像构建和 GHCR 推送，输出可追溯的镜像 digest。
date: 2026-03-28
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

## 从一次提交得到一个可发布版本

承接 [CI/CD 权责分离](cicd-separation.md)，本篇只负责构建与验证，不持有生产权限。继续使用 `delivery-demo`：提供首页、环境配置响应和健康端点的 Nginx 服务。数据库迁移在第 22 篇作为独立组件加入，不假装静态站点已经具备数据库业务。

环境约定：Linux runner、Docker Buildx、GitHub Actions；本地可用 Docker Desktop。示例构建 `linux/amd64`，目标服务器也应为该架构；ARM 服务器需统一修改构建平台。以下文件放在你自己的练习仓库。

## 沿用镜像，增加自动检查

保留[构建与运行时配置](environment.md)的 `site/`、`nginx/default.conf.template`、Dockerfile 和 `.dockerignore`，不重新建立另一份示例。此时 `/environment` 已能反映 APP_ENV，首页与健康端点分别用于版本和健康验收。创建 `scripts` 目录，保存 `scripts/test.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail
IMAGE="${1:?传入待验证镜像}"
name="delivery-test-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$name" "$IMAGE" >/dev/null
# 在容器内检查，不依赖宿主机端口分配。
for attempt in $(seq 1 30); do
  if docker exec "$name" wget -q -O - http://127.0.0.1/healthz | grep -qx ok; then
    docker exec "$name" wget -q -O - http://127.0.0.1/ | grep -q delivery-demo
    docker exec "$name" wget -q -O - http://127.0.0.1/environment | grep -qx local
    exit 0
  fi
  sleep 1
done
docker logs "$name"
exit 1
```

本地验证：

```bash
docker build -t delivery-demo:test .
bash scripts/test.sh delivery-demo:test
```

这是容器级冒烟检查。真实业务仍需自己的单元测试、接口测试与数据校验；HTTP 健康检查不能替代业务正确性验证。

## 构建一次，推送同一个镜像

将以下内容保存为 `.github/workflows/ci.yml`。PR 运行检查但不推送；只有合并到 `main` 才写入 GHCR。

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Set image name
        run: echo "IMAGE=ghcr.io/${GITHUB_REPOSITORY,,}" >> "$GITHUB_ENV"
      - name: Build local image
        run: docker build --platform linux/amd64 --build-arg BUILD_LABEL="$GITHUB_SHA" -t "$IMAGE:$GITHUB_SHA" .
      - name: Test image
        run: bash scripts/test.sh "$IMAGE:$GITHUB_SHA"
      - uses: docker/login-action@v3
        if: github.event_name == 'push'
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Push and record digest
        if: github.event_name == 'push'
        run: |
          set -euo pipefail
          docker push "$IMAGE:$GITHUB_SHA"
          DIGEST=$(docker buildx imagetools inspect "$IMAGE:$GITHUB_SHA" --format '{{.Manifest.Digest}}')
          printf '%s@%s\n' "$IMAGE" "$DIGEST" > image.txt
          cat image.txt >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@v4
        if: github.event_name == 'push'
        with:
          name: release-image
          path: image.txt
```

示例用版本标签便于阅读；团队维护的生产工作流应把第三方 Action 固定到审核过的完整 commit SHA，并通过依赖更新流程升级。不要将有生产凭据的工作流用于执行不可信 PR 代码。

`image.txt` 是交接记录，形如 `ghcr.io/你的账号/你的仓库@sha256:…`。它与 workflow run、源码 commit 一起归档。后续部署直接消费这条引用，不重新构建，不把邮件发送成功当作发布条件。

## 最小验证与失败排查

- 正常提交：测试成功，GHCR 有对应 commit 标签，Actions 附件包含 digest。
- 删除 `site/healthz` 后提交测试 PR：检查失败，不能进入推送步骤。
- `denied`：检查 Packages 写权限及仓库与 package 的关联；不要直接扩大为账户管理员权限。
- `exec format error`：检查目标架构与构建平台是否一致。
- 推送成功但不能拉取：检查 package 可见性和拉取方凭据，按前面的[制品库与镜像仓库](13-image-registry.md)排查。

## 小结与思考

CI 的交付物是经过验证的镜像及其来源记录。试着将首页改为 `v2`，比较两次 digest；为什么相同 commit 在基础镜像变化后重新构建，不一定得到相同 digest？

参考：[GitHub 发布 Docker 镜像](https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images)。
