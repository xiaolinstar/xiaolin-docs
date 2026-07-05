---
title: AI 待办（AI 日省待办）
description: AI 待办是一个 AI 原生的轻量级待办系统，核心模块包括提醒、日历与联系人。
date: 2026-06-17
updated: 2026-07-01
category: 软件产品
tags:
  - AI 待办
  - AI
---


AI 待办是一个 AI 原生的轻量级待办系统，核心模块包括提醒、日历与联系人。其微信小程序官方名称为「AI 日省待办」，英文名为 `ai-todo`。

它以微信小程序作为人类用户的图形化入口，以 CLI 作为 AI Agent 当前优先支持的结构化入口，不在应用内内置自然语言解析能力，而是把意图理解交给更靠近用户的 AI 工具。

## 为什么需要 AI 待办？

传统待办工具主要面向人类操作，AI Agent 很难稳定调用；企业协同工具能力很强，但对个人和轻量办公场景来说成本较高、客户端较重、模型也偏项目管理。

AI 待办选择做一个更小的能力层：

- 人用小程序查看、确认、处理待办；
- Agent 用 CLI 创建、查询、更新结构化数据；
- 数据模型以待办为上位概念，重点覆盖提醒、日历和联系人，不扩展成完整项目管理系统；
- 所有操作可审计、可导出、可自动化。

## 文档索引

- [产品介绍](./product.md)：介绍设计理念、核心模块和适用人群。
- [为什么不在小程序里做 AI 对话框](./why-no-ai-chatbox.md)：AI 原生设计选择与 Agent / CLI / 小程序分工。
- [快速上手](./quick-start.md)：介绍小程序、CLI 和基础命令。
- [Agent 接入](./agent.md)：介绍 Claude Code、OpenClaw、Cursor 等 Agent 如何调用 AI 待办（命令行名称依然为 `ai-todo`）。
- [技术架构](./architecture.md)：介绍后端、CLI、小程序、认证和系统边界。

## 推荐阅读顺序

如果你只是想了解 AI 待办，先看[产品介绍](./product.md)。

如果你已经准备使用，直接看[快速上手](./quick-start.md)。

如果你希望让 AI Agent 自动管理待办、日历和联系人，重点看[Agent 接入](./agent.md)。

## 立即体验

| 角色 | 入口 |
|------|------|
| **普通用户** | 微信搜索 **AI 日省待办**，创建你的第一条提醒 |
| **开发者** | `npm install -g @xiaolinstar/ai-todo-cli`，在小程序「我的 → CLI / Agent 访问令牌」创建令牌 |
| **Agent 集成** | 阅读 [Agent 接入](./agent.md)，将 `ai-todo` CLI 或 Skill 接入 OpenClaw、Claude Code、Cursor 等工具 |

完整文档见上方[文档索引](#文档索引)；CLI 配置与常用命令见[快速上手](./quick-start.md)。