---
title: 00 ｜ 渐进式运维导读
description: 从单机发布到集群交付，明确每阶段的先修知识、实践产物和验收条件。
date: 2026-07-07
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - 运维实践
  - 架构演进
---

## 一条可以逐步验证的学习路线

本系列面向个人开发者和中小团队。每一阶段解决已有问题，再决定是否引入下一层工具。完成单机 Compose 发布后可以停留在该阶段，Kubernetes 并非所有项目的必选项。

基础篇先完成 Linux 服务器、Git、Docker、Compose 与 Actions 的入门。中级篇使用同一个 `delivery-demo`，高级篇继续增加发布防护，避免每课切换到一个无关项目。

## 先修与环境

- 已完成[基础篇总结](../foundation/foundation-summary.md)的能力检查。
- 有独立 GitHub 练习仓库、Docker 环境，能理解 Bash 退出码与 YAML 缩进。
- Compose 实验和 K3s 实验使用独立环境，避免入口端口和生产服务冲突。
- 服务器架构与镜像构建平台一致；私有镜像需配置各环境的读取权限。

## 中级：从制品到实际运行

| 顺序 | 课程 | 本课交付物 |
| --- | --- | --- |
| 10 | [环境变量配置管理](environment.md) | 可失败验证的应用配置模型 |
| 11 | [CI/CD 权责分离](cicd-separation.md) | 构建与部署权限契约 |
| 12 | [持续集成流水线](ci-pipeline.md) | 测试、镜像和 `image.txt` |
| 13 | [镜像仓库治理](13-image-registry.md) | digest 拉取与版本保留规则 |
| 14 | [持续发布流水线](cd-pipeline.md) | Compose 审批、验收与恢复记录 |
| 15 | [轻量 K3s 集群](k3s.md) | Ready 节点与可解释的系统状态 |
| 16 | [K8s 应用部署](16-k8s-app-deploy.md) | Deployment、Service、Ingress 与回退实验 |
| 17 | [配置与密钥分离](17-configmap-secret.md) | 配置注入与轮换验证 |
| 18 | [环境分离与多环境发布](18-env-separation.md) | 同一 digest 的多环境 overlay |
| 19 | [数据库版本迁移](19-db-migration.md) | V1/V2 schema 与迁移失败实验 |

## 高级：从可以发布到可验证地发布

| 顺序 | 课程 | 本课交付物 |
| --- | --- | --- |
| 20 | [质量门禁卡点设计](../advanced/quality-gate.md) | 失败会阻断推送的 CI |
| 21 | [制品防篡改与 SBOM](../advanced/sha-SBOM.md) | 签名、SBOM 与错误身份拒绝记录 |
| 22 | [GitOps 发布实践](../advanced/gitops.md) | 同步、漂移修复与 Git 回退 |
| 23 | [交付边界与灰度](../advanced/what-is-cd.md) | 蓝绿切换实验和放量条件 |
| 24 | [变更管控就绪清单](../advanced/change-management.md) | 绑定版本与证据的变更记录 |
| 25 | [变更防错与 AI 价值](../advanced/change-control.md) | 影子评估集与指标口径 |
| 26 | [全局自动化发布](../advanced/cloud-native-cicd.md) | 应用、数据库与文件的结课发布记录 |
| 27 | [一站式平台反思](../advanced/devops-platform.md) | 选读：选型与迁移决策 |

## 如何判断学会了

每课同时保留成功与失败证据。中级结业应能解释当前环境运行的镜像、配置和 schema，能定位失败并恢复服务。高级结业应证明未通过检查的制品被阻断、配置漂移被发现或修复、故障发布能够暂停和恢复。

文中工具版本和实验参数是学习基线，正式运行前按目标环境核验。课程中的配置与命令不等于已经在你的生产环境完成验证。
