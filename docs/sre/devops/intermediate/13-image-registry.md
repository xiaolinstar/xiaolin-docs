---
title: 13 ｜ 镜像仓库治理
description: 用 GHCR 串起镜像命名、鉴权拉取、digest 固定与版本保留。
date: 2026-09-08
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 镜像仓库
  - 制品治理
---

## 让 CD 拿到正确的镜像

[上一课](ci-pipeline.md)已生成 `image.txt`。仓库治理要回答三个问题：拉的是哪一份内容、谁能读写、旧版本能保留多久。课程主线使用 GHCR；若运行环境无法访问 GHCR，可以整体切换 ACR，保持相同的交接契约。

## 选型与权限边界

| 场景 | 选择 | 需要承担的工作 |
| --- | --- | --- |
| GitHub 练习仓库 | GHCR | package 可见性、Actions 权限、目标机网络 |
| 国内云上部署 | ACR | 实例与仓库权限、凭据配置、费用核实 |
| 已有内网平台 | 现有 Harbor | 接入既有账号、证书和保留策略 |
| 单机临时实验 | Docker Registry | 自行处理 TLS、鉴权、备份，不直接作为生产默认 |

CI 账号只写本项目镜像；CD 账号只读需要部署的仓库；删除与保留策略由独立维护权限管理。签名验证放在[制品防篡改与 SBOM](../advanced/sha-SBOM.md)，不能把“能登录仓库”当作“制品可信”。

## 标签用于查找，digest 用于部署

课程沿用完整 commit SHA 标签。时间戳和构建号可作为辅助标签，但不能代替内容摘要。`latest`、`main` 等标签可以指向不同内容，即使标签名不变，实际版本也可能变化。

在有 Docker 的终端，从 CI 附件下载 `image.txt`，执行：

```bash
IMAGE_REF=$(cat image.txt)
printf '%s\n' "$IMAGE_REF" | grep -Eq '^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$'
docker pull "$IMAGE_REF"
docker image inspect "$IMAGE_REF" --format '{{json .RepoDigests}}'
```

成功条件是拉取成功，并能看到预期摘要引用。digest 能标识内容，但期望的 digest 本身必须来自受保护的发布记录。

## 私有镜像拉取

GHCR 私有包的本地拉取可使用具备 `read:packages` 的个人访问令牌（classic），组织启用 SSO 时还需相应授权。不要把令牌写进文档或提交到 Git。

```bash
read -r -p 'GitHub 用户名: ' GHCR_USER
read -r -s -p '只读令牌: ' GHCR_TOKEN
printf '\n'
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
unset GHCR_TOKEN
docker pull "$(cat image.txt)"
```

服务器登录的是执行 Docker 的部署用户。个人电脑登录成功，不代表服务器或 K3s 的 containerd 已有权限。K3s 私有镜像需在目标 namespace 配置 `imagePullSecrets`，见[应用部署](16-k8s-app-deploy.md)。公共练习镜像可省略登录，不要为了省步骤公开真实业务镜像。

## 保留与故障恢复

保留集合应至少包含：当前生产版本、约定回退窗口内的版本、正在验证的候选版本，以及关联 SBOM 和证明。不要仅按“最近 5 个标签”删除镜像，否则频繁测试构建可能挤掉生产回退版本。

每次清理前导出部署引用并做候选列表预览；清理后在独立环境拉取当前版和上一稳定版。digest 固定不会阻止管理员删除底层制品，镜像保留和数据备份仍需单独设计。

| 现象 | 检查顺序 |
| --- | --- |
| `unauthorized` / `denied` | 仓库可见性、账号读取权限、SSO 授权 |
| `manifest unknown` | 镜像路径、标签拼写、保留策略是否删除版本 |
| 连接超时 | DNS、TLS、出口网络，再考虑更换仓库 |
| 拉取成功但不能启动 | CPU 架构、启动命令、应用配置 |

## 最小验收

分别拉取 v1 和 v2 的 digest；确认只读账号不能推送；记录一次旧版拉取结果。交给下一课的输入是 **固定镜像引用和可用的拉取权限**。

参考：[GHCR 鉴权与使用](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)。
