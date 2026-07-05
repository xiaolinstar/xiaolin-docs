---
title: DevOps 实践
description: DevOps 方法论、CI/CD 与异常架构两大系列专栏及实践经验索引。
date: 2026-06-15
updated: 2026-06-27
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 异常处理
---


DevOps 方法论与实践经验。本站 DevOps 板块以两条主线系列为核心，辅以单篇深度文。

## 专栏：Exception 异常架构（00～08）

从架构原则到编程落地，覆盖异常分类、处理策略、模块规划与全局集成。先修阅读：[异常处理指南](/sre/architecture/exception-guide)。

| 序号 | 文章 | 说明 |
| --- | --- | --- |
| 00 | [四项核心原则](./exception-00.md) | 系列开篇，确立设计原则 |
| 01 | [基础（01）](./exception-01.md) | 异常机制与基础概念 |
| 02 | [异常分类（02）](./exception-02.md) | 分类体系与边界 |
| 03 | [异常抛出（03）](./exception-03.md) | 何时抛、如何抛 |
| 04 | [异常处理（04）](./exception-04.md) | 声明式处理理念 |
| 05 | [系统性异常处理的思维革命（05）](./exception-05.md) | 从单点到体系 |
| 06 | [异常模块规划（06）](./exception-06.md) | 文件结构与模块划分 |
| 07 | [异常类与错误码设计（07）](./exception-07.md) | 类层次与错误码 |
| 08 | [全局异常处理器与项目集成（08）](./exception-08.md) | 系列终篇，一行集成 |

## 专栏：从零实现 CI/CD（01～09）

以最小可行方案为指导，从容器化到 GitHub Actions，再到 CI/CD 分离与生产发布。先修阅读：[云原生 CI/CD 全局视角](./cloud-native-cicd.md)。

| 序号 | 文章 | 说明 |
| --- | --- | --- |
| 01 | [起步](./cicd-01.md) | 系列开篇，目标与路线图 |
| 02 | [容器化](./cicd-02.md) | Docker 基础与实践 |
| 03 | [Docker Compose 容器编排](./cicd-03.md) | 声明式 API 与编排 |
| 04 | [Pipeline 流水线工具](./cicd-04.md) | 流水线概念与选型 |
| 05 | [GitHub Actions 快速介绍](./cicd-05.md) | Actions 核心概念 |
| 06 | [GitHub Actions 工作流实践](./cicd-06.md) | 工作流编写与调试 |
| 07 | [CI 与 CD 分离：权责边界](./cicd-07.md) | 阶段划分与职责 |
| 08 | [持续集成 CI：源代码到容器镜像](./cicd-08.md) | CI 流水线落地 |
| 09 | [持续发布 CD：镜像到生产环境](./cicd-09.md) | 系列终篇，生产发布 |

## 单篇深度文

- [发布变更，AI 价值](./change-control.md)
- [云原生 CI/CD 全局视角](./cloud-native-cicd.md)
- [CI 制品源管控与「软着陆」治理](./harbor-source-control.md)
- [DevOps 平台思考](./devops-platform.md)
- [Git Submodule 父子项目协作](./git-submodule.md)
- [环境管理](./environment.md)
- [DevOps 核心能力](./devops-core.md)
- [CD 部署与交付](./what-is-cd.md)
- [发布变更管控](./change-management.md)
- [K3s](./k3s.md)
- [Web 静态站点](./front-dist.md)
- [Spring 服务端开发](./spring.md)
