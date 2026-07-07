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

# DevOps 实践

DevOps 方法论与实践经验。本站 DevOps 板块以三大主线系列为核心，辅以典型场景下的部署与协作实践。

---

## 专栏：渐进式 DevOps 实践（L1 ~ L5）

本专栏倡导拒绝过度工程，从小步快跑的规范化起步，随着业务规模的增长，逐步、低成本地引入自动化与规范。

*   **专栏导读**：[渐进式 DevOps 路线图：中小团队的运维演进之路](./cicd/progressive-devops-intro.md)

| 阶段 | 核心文章 | 说明 |
| :--- | :--- | :--- |
| **L1 规范** | [环境变量与配置管理，一篇文章搞懂](./cicd/environment.md) | 云原生 12-Factor 原则下的配置代码分离 |
| **L2 基础** | [CI 与 CD 分离：权责边界](./cicd/cicd-07.md) | 明确集成与发布的权责边界 |
| **L2.1** | [持续集成 CI：源代码到容器镜像](./cicd/cicd-08.md) | 不可变基础设施构建与 CI 流水线落地 |
| **L2.2** | [CI 制品源管控与「软着陆」治理](./cicd/harbor-source-control.md) | 私有镜像源 Harbor 治理与镜像版本晋级策略 |
| **L3 演进** | [K3s 轻量集群部署实践](./cicd/k3s.md) | 低成本、微型云原生容器集群管理落地 |
| **L4 进阶** | [持续发布 CD：镜像到生产环境](./cicd/cicd-09.md) | 从容器镜像到生产环境发布的流水线建设 |
| **L4.1** | [CD 部署与交付](./cicd/what-is-cd.md) | 持续交付的边界与灰度交付策略 |
| **L4.2** | [GitOps 设计理念与实践](./cicd/gitops.md) | 声明式状态闭环的 GitOps 架构设计 |
| **L5 治理** | [发布变更管控](./cicd/change-management.md) | 发布流程前置防错与质量门限机制 |
| **L5.1** | [发布变更，AI 价值](./cicd/change-control.md) | 探索 AI 在发布准入及变更安全防线上的作用 |
| **L5.2** | [DevOps 平台思考](./cicd/devops-platform.md) | 对一站式 DevOps 平台的心智反思 |

---

## 专栏：Exception 异常架构（00～08）

从架构原则到编程落地，覆盖异常分类、处理策略、模块规划与全局集成。先修阅读：[异常处理指南](/sre/architecture/exception-guide)。

| 序号 | 文章 | 说明 |
| --- | --- | --- |
| 00 | [四项核心原则](./exception/exception-00.md) | 系列开篇，确立设计原则 |
| 01 | [基础（01）](./exception/exception-01.md) | 异常机制与基础概念 |
| 02 | [异常分类（02）](./exception/exception-02.md) | 分类体系与边界 |
| 03 | [异常抛出（03）](./exception/exception-03.md) | 何时抛、如何抛 |
| 04 | [异常处理（04）](./exception/exception-04.md) | 声明式处理理念 |
| 05 | [系统性异常处理的思维革命（05）](./exception/exception-05.md) | 从单点到体系 |
| 06 | [异常模块规划（06）](./exception/exception-06.md) | 文件结构与模块划分 |
| 07 | [异常类与错误码设计（07）](./exception/exception-07.md) | 类层次与错误码 |
| 08 | [全局异常处理器与项目集成（08）](./exception/exception-08.md) | 系列终篇，一行集成 |

---

## 专栏：从零实现 CI/CD 实操演练（01～06）

以最小可行方案为指导，从单机 Docker 容器化编排到流水线工具选型，适合初学者实操演练。

| 序号 | 文章 | 说明 |
| --- | --- | --- |
| 01 | [起步](./cicd/cicd-01.md) | 系列开篇，目标与路线图 |
| 02 | [容器化](./cicd/cicd-02.md) | Docker 基础与实战演练 |
| 03 | [Docker Compose 容器编排](./cicd/cicd-03.md) | 声明式 API 与多服务编排 |
| 04 | [Pipeline 流水线工具](./cicd/cicd-04.md) | 流水线核心概念与工具选型 |
| 05 | [GitHub Actions 快速介绍](./cicd/cicd-05.md) | Actions 工作流基础概念 |
| 06 | [GitHub Actions 工作流实践](./cicd/cicd-06.md) | 工作流编写、调试与常用技巧 |

---

## 常见场景部署实践

- [Web 静态站点发布](./cicd/front-dist.md)
- [Spring 服务端开发部署](./cicd/spring.md)
- [Git Submodule 父子项目协作](./cicd/git-submodule.md)
- [云原生 CI/CD 全局视角](./cicd/cloud-native-cicd.md)
- [DevOps 核心能力](./cicd/devops-core.md)
