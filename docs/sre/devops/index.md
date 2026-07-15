---
title: DevOps 实践
description: 渐进式 DevOps 实践、Exception 异常架构与从零实现 CI/CD 专栏索引。
date: 2026-06-15
updated: 2026-07-07
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 异常处理
---
DevOps 方法论与实践经验。本站 DevOps 板块设计了「**双轨并行、五阶递进**」的渐进式运维学习路线，帮助团队和个人以最低的学习与维护成本，低心智负担地推进自动化运维落地。

---

## 渐进式运维学习路线图

```mermaid
graph TD
    subgraph 基础篇 ["基础篇：从静态资源代理到自动化流水线"]
        start["01 Nginx 静态资源代理"] --> prod["02 生产环境入门"]
        prod --> git["03 Git 与 GitHub"]
        git --> server["04 服务端应用部署"]
        server --> docker["05 Docker 容器化"]
        docker --> compose["06 Compose 编排"]
        compose --> pipeline["07 流水线选型"]
        pipeline --> actions["08-09 Actions 实践"]
    end

    subgraph 中级篇 ["中级篇：渐进式自动化演进"]
        L1["10 环境变量管理"] --> L2["11-13 CI/CD 隔离与制品治理"]
        L2 --> L3["14 轻量 K3s 集群"]
        L3 --> L4["15-17 声明式 CD 与 GitOps"]
    end

    subgraph 高级篇 ["高级篇：质量门禁与安全变更"]
        L5["18 质量门禁卡点"] --> L6["19 制品存证 SBOM"]
        L6 --> L7["20-21 变更就绪与 AI 防错"]
        L7 --> L8["22-23 平台反思与自动化发布"]
    end

    基础篇 --> L1
    L4 --> L5
```

---

## 专栏文章目录

### 1. 开篇词
*   [00 ｜ 渐进式运维导读](./cicd/progressive-devops-intro.md) — 探寻中小团队与个人开发者的渐进式 DevOps 演进路径。

### 2. 基础篇：从静态资源代理到自动化流水线
从本地 Nginx 代理静态资源开始，在具体问题中引入生产环境、Git、服务端部署、Docker、Docker Compose 与 GitHub Actions。

| 序号 | 核心文章 | 说明 |
| :--- | :--- | :--- |
| **01** | [01 ｜ Nginx 静态资源代理](./foundation/delivery-start.md) | 从本地 `index.html` 到 VitePress `dist` 目录的静态资源代理 |
| **02** | [02 ｜ 生产环境入门：部署到云服务器](./foundation/production-env.md) | 理解 7×24 与公网 IP，通过 SSH + scp 完成第一次手动部署 |
| **03** | [03 ｜ Git 与 GitHub：版本管理与云端仓库](./foundation/git-github.md) | 版本管理核心价值，GitHub 云端备份，git pull 替代 scp 部署 |
| **04** | [04 ｜ 服务端应用部署：依赖地狱与环境一致性](./foundation/server-side-deploy.md) | Flask 示例暴露两种部署策略的痛点，引出容器化需求 |
| **05** | [05 ｜ 单容器 Docker](./foundation/docker-basics.md) | 服务器回归本职：单容器命令式用法（pull / run / stop / rm / rmi） |
| **06** | [06 ｜ 多服务容器编排](./foundation/docker-compose.md) | 声明式多服务治理：Docker Compose 容器编排 |
| **07** | [07 ｜ 流水线工具选型](./foundation/pipeline-tools.md) | DevOps 工具链选型：常见 Pipeline 工具对比 |
| **08** | [08 ｜ Actions 基础](./foundation/actions-basic.md) | 云原生流水线起步：GitHub Actions 核心概念 |
| **09** | [09 ｜ Actions 实战](./foundation/actions-practice.md) | 工作流自动化编写与 GitHub Actions 实战调试 |

### 3. 中级篇
拒绝过度工程，引入低成本、无痛的标准化自动化及声明式发布。

| 序号 | 核心文章 | 说明 |
| :--- | :--- | :--- |
| **10** | [10 ｜ 环境变量配置管理](./cicd/environment.md) | 12-Factor 配置与代码分离：环境变量深度实践 |
| **11** | [11 ｜ CI/CD 权责分离](./cicd/cicd-separation.md) | DevOps 权责边界设计：持续集成与发布的分离 |
| **12** | [12 ｜ 持续集成流水线](./cicd/ci-pipeline.md) | 不可变基础设施落地：持续集成实战流水线 |
| **13** | [13 ｜ 私有镜像仓库治理](./cicd/harbor-source-control.md) | 容器制品源治理：私有 Harbor 搭建与版本晋级 |
| **14** | [14 ｜ 轻量 K3s 集群](./cicd/k3s.md) | 轻量级云原生集群：K3s 容器服务低成本落地 |
| **15** | [15 ｜ 持续发布流水线](./cicd/cd-pipeline.md) | 自愈集群部署：持续发布 (CD) 流水线生产落地 |
| **16** | [16 ｜ 交付边界与灰度](./cicd/what-is-cd.md) | 交付边界探索：持续发布与部署交付的灰度策略 |
| **17** | [17 ｜ GitOps 发布实践](./cicd/gitops.md) | 声明式状态自愈：云原生 GitOps 架构设计与落地 |

### 4. 高级篇
构筑发布防御红线，通过质量门禁、存证、AI 防错确保系统极高可用性。

| 序号 | 核心文章 | 说明 |
| :--- | :--- | :--- |
| **18** | [18 ｜ 质量门禁卡点设计](./cicd/quality-gate.md) | 流水线质量门禁 (Quality Gate) 防御机制设计 |
| **19** | [19 ｜ 制品防篡改与 SBOM](./cicd/sha-SBOM.md) | 制品哈希防篡改与软件物料清单 (SBOM) 存证 |
| **20** | [20 ｜ 变更管控就绪清单](./cicd/change-management.md) | 发布防御红线：变更管理与就绪条件审查清单 |
| **21** | [21 ｜ 变更防错与 AI 价值](./cicd/change-control.md) | 发布准入防线：AI 在变更安全阻断中的价值 |
| **22** | [22 ｜ 一站式平台反思](./cicd/devops-platform.md) | 一站式 DevOps 平台的心智反思与架构演进 |
| **23** | [23 ｜ 全局自动化发布](./cicd/cloud-native-cicd.md) | 搞定无状态应用、数据库及静态文件的全自动化发布 |

### 5. 加餐篇
典型场景的部署案例与核心运维基础。

| 序号 | 核心文章 | 说明 |
| :--- | :--- | :--- |
| **24** | [24 ｜ 静态网页发布](./cicd/front-dist.md) | Web 静态站点发布实战与 CDN 部署 |
| **25** | [25 ｜ Spring 应用部署](./cicd/spring.md) | Spring Boot 服务端开发部署与 JVM 优化 |
| **26** | [26 ｜ 多模块 Git 协作](./cicd/git-submodule.md) | Git Submodule 父子项目协作与依赖同步 |
| **27** | [27 ｜ SRE 核心能力](./cicd/devops-core.md) | SRE 运维能力建设与系统性容灾图谱 |

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
