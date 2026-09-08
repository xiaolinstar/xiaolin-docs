---
title: 12 ｜ 持续集成流水线
description: 既然 CI 与 CD 在流程上分离具有必要性，因此分别构建 CI Pipeline 和 CD Pipeline。
date: 2026-03-28
updated: 2026-03-28
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---


既然 CI 与 CD 在流程上分离具有必要性，因此分别构建 CI Pipeline 和 CD Pipeline。

本文完成 CI Pipeline，从源代码仓库到镜像仓库。

## 制品仓库与镜像仓库

> 阿里云效对制品仓库的描述

制品仓库是用于存储、管理和分发软件包（即制品）的软件系统，贯穿软件研发的整个生命周期。它提供一种**高效**、**安全**和**可追溯**的方式管理各种类型的制品，例如普通的压缩包、库文件、二进制文件等，并通过各种制品协议为开发者和 CI/CD 工具提供服务。

![阿里云效制品库在CI/CD中的架构功能](https://media.xiaolin.fun/docs/img-ci-pipeline/aliyun-codeup.png)

制品仓库作为开发、测试、安全、运维人员的桥梁，链接整个 CI/CD 工作流。

随着云原生时代的到来，容器技术作为云原生应用的基础底座，用来托管容器镜像的镜像仓库也随之产生。

制品仓库托管特定类型的产出制品如 Maven、Npm、Pypi，而容器镜像则是云原生时代**通用制品**。简单来说，容器镜像是对制品的再封装，CD 的部署单元被统一为 **OCI 镜像**，生产环境中的节点是完全对等的、环境依赖无关的，容器服务可以像云一样在计算平面上自由飘移。因此，云原生技术架构下，CD 流水线通常只面向**镜像仓库**。

![制品封装为容器镜像](https://media.xiaolin.fun/docs/img-ci-pipeline/artifact-to-image-registry.png)

## 普通制品库成为可选项

既然 CD 面向镜像仓库，那常规的制品仓库库还有存在的意义吗？视情况而定。

对于微小型团队或公司，不再需要制品库。团队内部不涉及到复杂的公共包、SDK 管理，那么 CI 只需产出容器镜像，忽略中间产物，减少了管理和维护成本。

对于中大型团队或公司，组织管理、安全、审计要求高，则往往需要在内网自建私服仓库，所有的项目依赖包都进行统一管理，如使用 SpringBoot 2.7.2，且进行公司内部安全加固。如：

- 源代码仓库，GitLab
- Maven 仓库，Nexus
- Npm 仓库，Verdaccio

循序渐进学习原则，本文暂不对制品仓库展开描述。

仍然需要提醒的是，对于一家大型企业，包含众多软件项目，进行统一管理和管控是非常必要的。

## 镜像仓库

当前全球最大的公开容器镜像仓库是：DockerHub、ghcr（GitHub Container Registry），分别由 Docker 和 GitHub 团队维护。

此外，其他知名云服务厂商也提供了镜像仓库服务，包括

- 阿里云容器镜像服务 ACR
- 腾讯云容器镜像服务 TCR，Tencent Container Registry
- GCR，Google Container Registry
- ECR，Amazon Elastic Container Registry

> 镜像仓库选型上，从 DockerHub 上获取公共容器镜像资源如 MySQL、Redis，向 ghcr 上推送个人项目容器镜像。

根据是否具备科学上网条件，作者建议分别选择 ghcr 和阿里云 ACR。

ghcr 的优势是 GitHub 出品，与 Git 源代码仓库、GitHub Actions 等原生集成。在中国大陆互联网内，阿里云 ACR 提供了较为完善的服务，且具有免费额度，可以作为个人和小型团队学习探索。至于私服搭建，Harbor（翻译为港口，集装箱 Docker 停靠的地方）是开源的企业级容器镜像仓库。

## 在 GitHub Actions 中实践

GitHub 仓库承担 CI 产物托管的功能，支持存储主流的制品。

![常见的项目构建](https://media.xiaolin.fun/docs/img-ci-pipeline/github-package-support.png)

对于一个简单的前端 Web 项目，CI Pipeline 包括若干个 steps（其中步骤4和5是可选的）：

1. 前置环境准备
2. 获取访问目标 ghcr 仓库权限
3. 构建容器镜像并推送 ghcr
4. （可选）生成项目证明
5. （可选）发送构建 CI 产物信息消息

作者创建的 GitHub Actions 配置文件为 `release-package.yml`，可参考代码注释了解过程。

```yaml
name: CI Pipeline, Create and Publish a Docker Image

on:
  # 2个流水线触发方式
  workflow_dispatch: #  手动点击
  push: # 推送分支 release  
    branches:
      - 'release'

# 定义环境变量
env:
  REGISTRY: ghcr.io # GitHub Container Registry
  IMAGE_NAME: ${{ github.repository }} # 系统环境变量，所在 GitHub 仓库名

jobs:
  build-and-push-image:
    runs-on: ubuntu-latest


    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          # 3个仓库相关变量，用户无需关注
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}


      # 构建镜像，并推送到 ghcr.io
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        id: push
        with:
          context: .  # 构建上下文，默认为项目更目录下的 Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      # 生成项目证明
      - name: Generate artifact attestation
        uses: actions/attest-build-provenance@v2
        with:
          subject-name: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          subject-digest: ${{ steps.push.outputs.digest }}
          push-to-registry: true

      # 发送邮件到 QQ 邮箱
      - name: Send email notification
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.qq.com
          server_port: 465
          secure: true
          username: ${{ secrets.MAIL_USERNAME }}      # 用户关注，QQ 邮箱账号，例：12345678@qq.com
          password: ${{ secrets.MAIL_PASSWORD }}      # 用户关注，QQ 邮箱授权码（非登录密码）
          subject: "🐳 镜像构建完成 - ${{ github.repository }}"
          to: ${{ secrets.TO_MAIL }}              # 目标邮箱
          from: GitHub Actions
          html_body: |
            <h2>镜像构建与证明生成完成</h2>
            <p><strong>仓库：</strong>${{ github.repository }}</p>
            <p><strong>分支：</strong>${{ github.ref_name }}</p>
            <p><strong>提交：</strong>${{ github.sha }}</p>
            <p><strong>镜像：</strong>${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}</p>
            <p><strong>标签：</strong>${{ steps.meta.outputs.tags }}</p>
            <p><strong>摘要：</strong>${{ steps.push.outputs.digest }}</p>
            <p><strong>证明状态：</strong>✅ 已生成并推送至 ghcr.io</p>
            <hr>
            <p><small>此邮件由 GitHub Actions 自动发送</small></p>
```

> 此配置使用QQ邮箱作为示例，用户可修改配置信息以自定义。

上述配置文件中仅最后一个 step（发送到QQ邮箱）存在用户需关注的变量：

- secrets.MAIL_USERNAME：发送邮箱用户名
- secrets.MAIL_PASSWORD：发送邮箱的授权码，非密码
- secrets.TO_MAIL：目标邮箱，可以设置为固定值

在仓库中设置上述密钥变量，${项目仓库} -> Settings -> Secrets and variables -> Actions

![GitHub Actions Secrets](https://media.xiaolin.fun/docs/img-ci-pipeline/actions-secret.png)

有2个触发流水线的方式，推送 release 分支 和 手动触发

![Run workflow](https://media.xiaolin.fun/docs/img-ci-pipeline/run-workflow.png)

完成后，可在 Packages 中查看到执行结果

![Packages](https://media.xiaolin.fun/docs/img-ci-pipeline/packages.png)

![GitHub-Package 执行结果](https://media.xiaolin.fun/docs/img-ci-pipeline/github-package.png)

接收到邮件提醒：

![Email Notification](https://media.xiaolin.fun/docs/img-ci-pipeline/github-actions-email.png)

## CI 流水线：Alibaba Cloud Container Registry

GitHub Container Registry 是 GitHub 提供的容器镜像仓库。虽然我的本地开发环境支持科学上网，但是阿里云服务器或腾讯云服务则不支持，导致 CD 受阻。

解决方案有两种：
- 在云服务器上添加 hosts 解析或使用代理，实现网络支持
- 使用国内的容器镜像托管仓库，如阿里云容器镜像服务（ACR）

选择 Alibaba Cloud Container Registry（ACR）作为镜像仓库，是因其支持私有镜像仓库，且拥有个人版免费额度，足够个人开发者练手使用。

示例项目中 CI Pipeline with ACR 配置文件

```yaml
name: CI Pipeline, To Alibaba Cloud Container Registry

on:
  # 2个 CI 流水线触发方式
  workflow_dispatch: #  手动点击
  push: # 推送分支 release
    branches:
      - 'release'

# 定义环境变量
env:
  REGISTRY: ${{ secrets.ACR_REGISTRY }} # 阿里云ACR镜像仓库
  NAMESPACE: ${{ secrets.ACR_NAMESPACE }} # 阿里云ACR命名空间，需要根据实际情况修改
  IMAGE_NAME: ${{ github.event.repository.name }} # 阿里云ACR镜像名称，需要根据实际情况修改

jobs:
  build-and-push-image:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      # 登录阿里云ACR
      - name: Login to Alibaba Cloud Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }} # 阿里云ACR用户名，需要在secrets中配置
          password: ${{ secrets.ACR_PASSWORD }} # 阿里云ACR密码，需要在secrets中配置

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=raw,value=latest,enable={{is_default_branch}}

      # 构建镜像，并推送到阿里云ACR
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        id: push
        with:
          context: .  # 构建上下文，默认为项目根目录下的 Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      # 发送邮件到 QQ 邮箱
      - name: Send email notification
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.qq.com
          server_port: 465
          secure: true
          username: ${{ secrets.MAIL_USERNAME }}      # 用户关注，QQ 邮箱账号，例：12345678@qq.com
          password: ${{ secrets.MAIL_PASSWORD }}      # 用户关注，QQ 邮箱授权码（非登录密码）
          subject: "🐳 镜像构建完成 - ${{ github.repository }}"
          to: xing.xiaolin@foxmail.com              # 目标邮箱
          from: GitHub Actions
          html_body: |
            <h2>镜像构建完成</h2>
            <p><strong>仓库：</strong>${{ github.repository }}</p>
            <p><strong>分支：</strong>${{ github.ref_name }}</p>
            <p><strong>提交：</strong>${{ github.sha }}</p>
            <p><strong>镜像：</strong>${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}</p>
            <p><strong>标签：</strong>${{ steps.meta.outputs.tags }}</p>
            <p><strong>摘要：</strong>${{ steps.push.outputs.digest }}</p>
            <p><strong>推送状态：</strong>✅ 已成功推送至阿里云ACR</p>
            <hr>
            <p><small>此邮件由 GitHub Actions 自动发送</small></p>
```

## 延伸思考

自然地，本文引入了一个关键的 SRE 运维课题：**变更管控**，将在后续文章中做专题研究。

变更管控是一道质量审查、审批流程，位于 CI 和 CD之间，只有具备 CD 的就绪条件，才允许生产变更。在 CD 就绪准备中，最小满足项为生产制品就绪，这是运维团队开始工作的起点。

本文中，使用发送邮件的方式模拟 CI 制品就绪通知。在变更管控流程中，该信息将作为评审的就绪项，同步发送给变更经理和运维团队，至少起到了2个作用：

1. 告知运维团队：制品已就绪，发布 X 模块的 Y 版本
2. 流程快照，变更授权告知（变更经理）：允许且仅允许发布 X 模块的 Y 版本

自提交变更审批工单起，版本就已确定，行业黑话叫「封版」，如果再次修改代码则制品版本就会变化，项目证明起到了真实性、完整性验证、不可否认的作用。

---

更完善的变更管控应该是完全自动化的：CI 与 CD 在流程上是分离的，只要变更流程放行，CD 则自动化执行，实现**审批即执行**。

建立发布变更自动化工作流程，该流程是完全自动化的，其中设置了2个控制点，**变更申请**和**变更审批**。

![变更管控](https://media.xiaolin.fun/docs/img-ci-pipeline/ci-cd-change-control.png)

只有生产环境需要严格管控，对 CI 流程给予自由度。另外，运维团队只对变更管控流程负责，不直接参与 CI 流程。

![变更管控流程](https://media.xiaolin.fun/docs/img-ci-pipeline/change-control-flow.png)

## 总结

本文介绍了 CI Pipeline 的设计理念和基本情况，容器镜像作为云原生时代的通用制品，建立镜像仓库进行托管是必要的。然后，基于 GitHub Actions 实现 CI Pipeline：从源代码到容器镜像，从源代码仓库到镜像仓库。最后，通过发送邮件提醒，引入了运维工作的核心能力域：**变更管控**，并继续简单初步介绍。

## 参考

1. 腾讯云容器镜像服务 TCR，https://cloud.tencent.com/product/tcr
2. 阿里云 ACR，https://www.aliyun.com/product/acr
3. 开源的企业级容器镜像仓库 Harbor，https://goharbor.io/
4. GitHub Action to build and push Docker images with Buildx，https://github.com/docker/build-push-action
5. GitHub Packages 简介，https://docs.github.com/en/packages/learn-github-packages/introduction-to-github-packages
6. 示例项目仓库，https://github.com/xiaolinstar/xiaolin-docs