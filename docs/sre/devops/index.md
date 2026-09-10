---
title: DevOps 实践
description: 渐进式 DevOps 实践、Exception 异常架构与从零实现 CI/CD 专栏索引。
date: 2026-06-15
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 异常处理
---
DevOps 方法论与实践经验。本站 DevOps 板块按基础、中级和高级逐步推进，以同一个示例串起构建、发布、验证与恢复。

---

## 学习顺序

按基础篇、中级篇、高级篇顺序学习。中级先完成 Compose 单机发布，再按需要进入 K3s；高级围绕发布验证与恢复展开，以第 29 篇结课项目验收。第 30 篇为选读，加餐篇按实际需求查阅。

---

## 专栏文章目录

### 1. 开篇词
*   [00 ｜ 渐进式运维导读](./intermediate/progressive-devops-intro.md) — 探寻中小团队与个人开发者的渐进式 DevOps 演进路径。

### 2. 基础篇：从静态资源代理到自动化流水线
从本地 Nginx 代理静态资源开始，在具体问题中引入生产环境、Git、服务端部署、Docker、Docker Compose 与 GitHub Actions。

| 序号 | 核心文章 | 说明 |
| :--- | :--- | :--- |
| **01** | [01 ｜ Nginx 静态资源代理](./foundation/delivery-start.md) | 从本地 `index.html` 到 VitePress `dist` 目录的静态资源代理 |
| **02** | [02 ｜ 生产环境入门：部署到云服务器](./foundation/production-env.md) | 理解 7×24 与公网 IP，通过 SSH + scp 完成第一次手动部署 |
| **03** | [03 ｜ 服务端应用部署：依赖、运行时与进程保活](./foundation/server-side-deploy.md) | 从静态站点升级到后端进程：双栈对比 + 运维视角三类痛点（脏 / 资源 / 网络） |
| **04** | [04 ｜ Git 与 GitHub：版本管理与云端仓库](./foundation/git-github.md) | 版本管理核心价值，GitHub 云端备份，为后续流水线奠定代码版本基础 |
| **05** | [05 ｜ 容器 Docker](./foundation/docker-basics.md) | 服务器回归本职：Docker 命令式用法（pull / run / stop / rm / rmi） |
| **06** | [06 ｜ 流水线基础](./foundation/pipeline-basics.md) | 流水线化运维动作：Jenkinsfile 把手动命令变成声明式代码，运维左移到开发 |
| **07** | [07 ｜ GitHub Actions](./foundation/actions.md) | 托管式流水线：核心概念 + Greetings / VitePress Pages 两个实战 |
| **08** | [08 ｜ 多服务容器编排](./foundation/docker-compose.md) | 声明式多服务 + IaC：Compose 收口基础篇，CI 出镜像、服务器 pull + up |
| **09** | [09 ｜ 基础篇总结](./foundation/foundation-summary.md) | DevOps 基础篇收尾：演进全景 / 能力清单 / 选型建议 |

### 3. 中级篇：Compose 实践、制品分发与 CI/CD

先解决多服务运行中的网络、数据、配置和健康问题，再从制品分发引入 CI/CD；完成单机发布后，按需进入 K3s。

| 序号 | 核心文章 | 说明 |
| --- | --- | --- |
| **10** | [10 ｜ Compose 多服务与网络](./intermediate/compose-network.md) | 服务名、端口映射与网络边界 |
| **11** | [11 ｜ 数据持久化与挂载](./intermediate/compose-storage.md) | 数据卷、文件挂载与备份恢复 |
| **12** | [12 ｜ Dockerfile 构建与运行时配置](./intermediate/environment.md) | 构建位置、ARG / ENV 与 .env 插值 |
| **13** | [13 ｜ 制品库与镜像仓库](./intermediate/13-image-registry.md) | 普通制品、镜像与可信交接 |
| **14** | [14 ｜ 健康检查与启动依赖](./intermediate/compose-health.md) | 就绪判断、依赖等待与失败诊断 |
| **15** | [15 ｜ CI/CD 权责分离](./intermediate/cicd-separation.md) | 从构建、仓库和运行验收推导职责边界 |
| **16** | [16 ｜ 持续集成流水线](./intermediate/ci-pipeline.md) | 自动测试、构建与 digest 输出 |
| **17** | [17 ｜ Compose 持续发布](./intermediate/cd-pipeline.md) | 固定制品、健康验收与恢复 |
| **18** | [18 ｜ 轻量 K3s 集群](./intermediate/k3s.md) | 从单机编排进入集群承载 |
| **19** | [19 ｜ K8s 应用部署](./intermediate/16-k8s-app-deploy.md) | Deployment、入口与滚动更新 |
| **20** | [20 ｜ K8s 配置与密钥](./intermediate/17-configmap-secret.md) | 延续运行时配置，验证注入与轮换 |
| **21** | [21 ｜ 多环境隔离与制品晋级](./intermediate/18-env-separation.md) | 同一镜像与不同环境配置 |
| **22** | [22 ｜ 数据库迁移与发布兼容性](./intermediate/19-db-migration.md) | 版本迁移、兼容性与失败恢复 |

### 4. 高级篇：发布验证与恢复

| 序号 | 核心文章 | 说明 |
| --- | --- | --- |
| **23** | [23 ｜ 质量门禁卡点设计](./advanced/quality-gate.md) | 测试与漏洞门禁阻断实验 |
| **24** | [24 ｜ 制品防篡改与 SBOM](./advanced/sha-SBOM.md) | 摘要、签名身份与 SBOM 验证 |
| **25** | [25 ｜ GitOps 发布实践](./advanced/gitops.md) | Argo CD 调和与 Git 回退 |
| **26** | [26 ｜ 交付边界与灰度](./advanced/what-is-cd.md) | 蓝绿切换与放量条件 |
| **27** | [27 ｜ 变更管控就绪清单](./advanced/change-management.md) | 固定输入与恢复证据 |
| **28** | [28 ｜ 变更防错与 AI 价值](./advanced/change-control.md) | 影子评估与指标口径 |
| **29** | [29 ｜ 全局自动化发布：结课项目](./advanced/cloud-native-cicd.md) | 应用、数据库与文件编排 |
| **30** | [30 ｜ 一站式平台反思（选读）](./advanced/devops-platform.md) | 维护成本与迁移决策 |

### 5. 加餐篇

| 序号 | 核心文章 | 说明 |
| --- | --- | --- |
| **31** | [31 ｜ 静态网页发布](./extra/front-dist.md) | Web 与 CDN 发布 |
| **32** | [32 ｜ Spring 应用部署](./extra/spring.md) | Spring Boot 与 JVM |
| **33** | [33 ｜ 多模块 Git 协作](./extra/git-submodule.md) | 父子项目协作 |
| **34** | [34 ｜ SRE 核心能力](./extra/devops-core.md) | 运维能力与容灾 |


---

## 专栏：Exception 异常架构（00～08）

从架构原则到编程落地，覆盖异常分类、处理策略、模块规划与全局集成。先修阅读：[异常处理指南](/sre/architecture/exception-guide)。

| 序号 | 文章 | 说明 |
| --- | --- | --- |
| 00 | [异常设计 00：四项核心原则](./exception/exception-00.md) | 系列开篇，确立设计原则 |
| 01 | [异常设计 01：基础概念与机制](./exception/exception-01.md) | 异常机制与基础概念 |
| 02 | [异常设计 02：异常分类体系与边界](./exception/exception-02.md) | 分类体系与边界 |
| 03 | [异常设计 03：异常抛出时机与原则](./exception/exception-03.md) | 何时抛、如何抛 |
| 04 | [异常设计 04：声明式处理理念](./exception/exception-04.md) | 声明式处理理念 |
| 05 | [异常设计 05：系统性处理的思维革命](./exception/exception-05.md) | 从单点到体系 |
| 06 | [异常设计 06：异常模块规划与文件结构](./exception/exception-06.md) | 文件结构与模块划分 |
| 07 | [异常设计 07：异常类与错误码设计](./exception/exception-07.md) | 类层次与错误码 |
| 08 | [异常设计 08：全局异常处理器项目集成](./exception/exception-08.md) | 系列终篇，一行集成 |
