---
title: 00 ｜ 渐进式运维导读
description: 从单机发布到集群交付，明确每阶段的先修知识、实践产物和验收条件。
date: 2026-07-07
updated: 2026-09-09
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

## 中级：先理解 Compose，再自动化交付

10–14 课先用本地 Compose 解释网络、数据、构建、仓库与健康；15–17 课再把已验证的动作串成 CI/CD。18–22 课按需要进入 K3s、多环境和数据库演进。

| 顺序 | 课程 | 本课交付物 |
| --- | --- | --- |
| 10 | [Compose 多服务与网络](compose-network.md) | 服务名、端口映射与网络边界 |
| 11 | [数据持久化与挂载](compose-storage.md) | 数据卷、文件挂载与备份恢复 |
| 12 | [Dockerfile 构建与运行时配置](environment.md) | 构建位置、ARG / ENV 与 .env 插值 |
| 13 | [制品库与镜像仓库](13-image-registry.md) | 普通制品、镜像与可信交接 |
| 14 | [健康检查与启动依赖](compose-health.md) | 就绪判断、依赖等待与失败诊断 |
| 15 | [CI/CD 权责分离](cicd-separation.md) | 从构建、仓库和运行验收推导职责边界 |
| 16 | [持续集成流水线](ci-pipeline.md) | 自动测试、构建与 digest 输出 |
| 17 | [Compose 持续发布](cd-pipeline.md) | 固定制品、健康验收与恢复 |
| 18 | [轻量 K3s 集群](k3s.md) | 从单机编排进入集群承载 |
| 19 | [K8s 应用部署](16-k8s-app-deploy.md) | Deployment、入口与滚动更新 |
| 20 | [K8s 配置与密钥](17-configmap-secret.md) | 延续运行时配置，验证注入与轮换 |
| 21 | [多环境隔离与制品晋级](18-env-separation.md) | 同一镜像与不同环境配置 |
| 22 | [数据库迁移与发布兼容性](19-db-migration.md) | 版本迁移、兼容性与失败恢复 |

## 高级：发布验证与恢复

| 顺序 | 课程 | 本课交付物 |
| --- | --- | --- |
| 23 | [质量门禁卡点设计](../advanced/quality-gate.md) | 测试与漏洞门禁阻断实验 |
| 24 | [制品防篡改与 SBOM](../advanced/sha-SBOM.md) | 摘要、签名身份与 SBOM 验证 |
| 25 | [GitOps 发布实践](../advanced/gitops.md) | Argo CD 调和与 Git 回退 |
| 26 | [交付边界与灰度](../advanced/what-is-cd.md) | 蓝绿切换与放量条件 |
| 27 | [变更管控就绪清单](../advanced/change-management.md) | 固定输入与恢复证据 |
| 28 | [变更防错与 AI 价值](../advanced/change-control.md) | 影子评估与指标口径 |
| 29 | [全局自动化发布：结课项目](../advanced/cloud-native-cicd.md) | 应用、数据库与文件编排 |
| 30 | [一站式平台反思（选读）](../advanced/devops-platform.md) | 维护成本与迁移决策 |

## 如何判断学会了

每课同时保留成功与失败证据。中级结业应能解释当前环境运行的镜像、配置和 schema，能定位失败并恢复服务。高级结业应证明未通过检查的制品被阻断、配置漂移被发现或修复、故障发布能够暂停和恢复。

文中工具版本和实验参数是学习基线，正式运行前按目标环境核验。课程中的配置与命令不等于已经在你的生产环境完成验证。
