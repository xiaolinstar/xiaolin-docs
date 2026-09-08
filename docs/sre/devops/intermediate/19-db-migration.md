---
title: 19 ｜ 数据库版本迁移
description: 12-18 篇都假设"应用可回滚"。但数据库呢？schema 改了怎么回滚？数据迁移如何跟上应用发布节奏？本文给出 Flyway / Liquibase 的最小实践，作为中级篇"数据层"的收束。
date: 2026-09-08
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - 数据库
  - Flyway
  - Liquibase
---

## 前言

承接 [18 篇](18-env-separation.md) 的环境分离结尾——"每个环境独立数据库，通过 migration 脚本同步 schema"——本篇展开这一句话背后的工程现实：

*   应用代码可以 git revert 一行就回滚，数据库 schema 改了一列怎么回滚？
*   多环境（dev/staging/prod）的 schema 如何保持演进一致？
*   数据迁移（大表改结构）如何不停机？

本篇给出 Flyway / Liquibase 两类工具的最小实践，让中级篇的"渐进式"覆盖到**数据层**。

## 一、为什么需要 migration 工具

裸跑 `psql` 改 schema 会导致什么？环境漂移、不可追溯、回滚困难。本节用"两次迁移失败"的故事开场，引出 migration 工具的必要性。

## 二、Flyway 最小用法

约定优于配置。本节给出 `V1__init.sql` / `V2__add_column.sql` 命名约定 + `flyway migrate` 命令的最小流程，以及与 CI/CD 的接入点。

## 三、Liquibase 最小用法

XML/YAML 描述式 changelog。本节与 Flyway 对比，给出 Liquibase 在"复杂回滚脚本"场景下的最小用法。

## 四、与应用发布的耦合

migration 应该在应用启动前还是启动后跑？本节给出"forward migration + 兼容性 schema 演进"的原则，避免"应用起来但表还没改好"的中间态。

## 五、多环境 migration 顺序

dev 先跑、staging 验证、prod 最后——这是 Flyway/Liquibase 自带的能力还是需要额外管控？本节给出"用同一个 changelog + 不同环境逐步晋级"的最小治理。

## 六、与 CI/CD 流水线的接入

迁移脚本本身需要被测试（dev 环境是天然测试场）。本节给出"应用 CI + migration CI 双流水线"的最小模型，作为中级篇 CD 体系的最后一块拼图。
