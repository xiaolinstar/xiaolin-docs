---
title: 13 ｜ 制品库与镜像仓库
description: 从普通构建产物到容器镜像，理解仓库的分发、版本和权限职责。
date: 2026-09-08
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 镜像仓库
  - 制品治理
---

## 构建完成以后，把结果交给谁

上一课比较了服务器构建和构建后分发。Dockerfile 没有消除原生编译时的交付问题：构建结果需要从一台机器交给另一台机器，还要知道交付的是哪个版本。

基础篇已经通过 scp 传递过文件。仓库将这种传递扩展为有版本、有权限、可追溯的存储与分发服务。本课先手动完成交接，下一阶段再把这些操作放进流水线。

## 普通制品与镜像放在一起理解

| 已有产物 | 常见使用方式 | 仓库承担什么 |
| --- | --- | --- |
| `dist.tar.gz`、JAR、原生二进制 | 构建后上传，部署时下载 | 保存版本包、摘要与关联记录 |
| Maven、npm、PyPI 包 | 按包名或坐标、版本发布和下载 | 向其他项目提供依赖，可能还代理上游包 |
| OCI 容器镜像 | 构建后 push，运行节点 pull | 按镜像协议存取 manifest 与层数据 |

镜像本身也是制品。这里区分“普通制品”和“镜像”，是为了比较格式和消费方式，不是把它们当作互不相关的两类东西。

镜像仓库不能代替所有依赖仓库：构建 Java 项目时可能仍需从 Maven 仓库下载依赖，构建完成后才把运行环境和应用封装为镜像。一个镜像也不会自动解决 CPU 架构、外部数据库和配置兼容性。

## 从普通发布包到镜像

在练习项目目录用现有 site 生成普通发布包：

```bash
mkdir -p artifacts
tar -czf artifacts/site-v1.tar.gz -C site .
# Linux 使用 sha256sum；macOS 可用 shasum -a 256。
shasum -a 256 artifacts/site-v1.tar.gz > artifacts/site-v1.tar.gz.sha256
shasum -a 256 -c artifacts/site-v1.tar.gz.sha256
mkdir -p /tmp/delivery-unpack
tar -xzf artifacts/site-v1.tar.gz -C /tmp/delivery-unpack
cmp site/index.html /tmp/delivery-unpack/index.html
```

解包后还需目标服务器提供 Web 运行环境。换成上一课的镜像时，页面和 Nginx 被一起交付。普通包可存放在团队现有制品服务；本课不要求为了一个压缩包自建 Nexus 或 Artifactory。

摘要帮助检查内容一致性，但期望摘要必须来自可信记录；签名与构建证明留到高级篇。不要把“包与摘要一起上传”当作来源认证已经完成。

## 选择镜像仓库

| 方案 | 适合的起点 | 需要核对 |
| --- | --- | --- |
| Docker Hub | 使用 Docker 生态的公开或私有镜像 | 命名空间、读取限制、网络与费用 |
| GHCR | 源码已在 GitHub，后续使用 Actions | package 权限、可见性、目标服务器连通性 |
| Harbor | 团队已有内网基础设施和维护能力 | TLS、账号、存储、备份、升级与保留策略 |
| 云厂商镜像服务，如 ACR | 与目标云网络和身份体系集成 | 实例能力、认证方式、网络与费用 |

这些都是候选承载方式，不需要按顺序全部部署。课程主线选 GHCR；网络条件不满足时，可整体换成团队可用仓库。服务价格、额度与产品能力应以实际使用时的官方说明为准。

## 手动 push，再按 digest 拉取

在 Bash 中执行，将用户名和仓库名替换为自己的小写路径。向 GHCR 推送可使用有 `write:packages` 的令牌；组织启用 SSO 时还需授权。令牌不写进 Git 或命令历史。

```bash
read -r -p 'GitHub 用户名: ' GHCR_USER
read -r -s -p '镜像写入令牌: ' GHCR_TOKEN
printf '\n'
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
unset GHCR_TOKEN
export IMAGE_NAME="ghcr.io/你的账号/delivery-demo"
docker tag delivery-demo:local "$IMAGE_NAME:lesson13-v1"
docker push "$IMAGE_NAME:lesson13-v1"
docker buildx imagetools inspect "$IMAGE_NAME:lesson13-v1"
```

上面的中文占位符必须替换。读取输出中的顶层 Digest，完整引用形如 `ghcr.io/账号/delivery-demo@sha256:…`。用下列命令生成交接文件：

```bash
DIGEST=$(docker buildx imagetools inspect "$IMAGE_NAME:lesson13-v1" --format '{{.Manifest.Digest}}')
printf '%s@%s\n' "$IMAGE_NAME" "$DIGEST" > image.txt
docker pull "$(cat image.txt)"
```

在目标服务器用只读账号重复 pull，才算验证了交接路径。开发机能拉取不代表服务器或 K3s 已有权限。多架构镜像顶层 digest 与单个平台子镜像 digest 可能不同，发布记录需统一采用哪一层。

## 版本、权限与保留

标签便于查找，digest 固定内容。正式流程可用完整源码 commit 作为标签，并记录构建编号；同一源码重新构建可能产生不同内容，不能只看源码版本判断镜像相同。

构建身份只写本项目仓库，部署身份只读所需镜像，删除权限单独管理。至少保留当前运行版本和约定恢复窗口内的稳定版本，并验证它们仍可拉取。固定 digest 不会阻止管理员删除底层制品。

| 现象 | 排查方向 |
| --- | --- |
| `unauthorized` / `denied` | 账号权限、package 可见性、组织授权 |
| `manifest unknown` | 镜像路径、标签、旧版本是否被清理 |
| 超时 | DNS、证书、出口网络 |
| `exec format error` | 镜像与服务器 CPU 架构 |

本课验收：普通包能校验并解包，镜像能推送并按 digest 拉取，能解释两者的部署差异。下一课明确“运行正常”的判断标准，然后再从仓库交接推导 CI/CD 分离。

参考：[GHCR 使用](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)、[Harbor](https://goharbor.io/docs/)、[Docker Registry](https://docs.docker.com/docker-hub/)。
