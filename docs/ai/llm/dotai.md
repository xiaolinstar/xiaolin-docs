---
title: 上下文工程，维护自己的 AI IDE 记忆文件
description: 在 AI 发展中，跑得最快的当属 AI Coding，程序员率先借助 AI 的力量实现自我革命。
date: 2026-03-28
updated: 2026-03-28
category: AI 实践
tags:
  - LLM
  - AI
---

# 上下文工程，维护自己的 AI IDE 记忆文件

在 AI 发展中，跑得最快的当属 AI Coding，程序员率先借助 AI 的力量实现自我革命。狭义上，我对 AI 技术的理解：大模型 + 领域工程。两者的互联互通依赖于提示词 Prompt。因此，无论 MPC、Agent、skills 等新技术范式的流行，本质上仍然是面向提示词的软件工程实践。

AI 发展的两大制高点：

- 大模型厂商：Gemini、Claude、GLM、GPT、MinMax等；
- 技术范式：起初以 OpenAI 为公司为先驱，目前由 Anthropic（Claude Code）公司引领，制定各种协议标准：MCP、Skills 等等。

对于绝大多数公司，借助 AI 技术来赋能领域业务即可。

## Prompt 与 Context

大模型是**无状态推理引擎**，其本质包括三部分：输入、推理、输出。

```
Input -> LLM Server -> Output
```

其中输入部分称为提示词 Prompt，早期大模型应用的重心就是提示词工程（另一个重心是微调，但是成本高落地难）。

随着 AI 工程技术演进，衍生出了上下文工程，用户直接输入以及相关环境信息，均整合进 Prompt 中，交给大模型推理。

特别地，在 AI Coding 领域，用户输入 10 个 Token，但 Token 实际消耗量可能超过 10 万，因为 AI IDE 引入了大量的上下文，并会执行多次内部模型推理。

## 精打细算用 AI IDE

对于企业用户，往往优先使用 Cursor 和 Claude Code，因为这 2 款产品是普遍认为能力最强的，会极大地提高开发效率，属于是效率敏感性用户。

但是，对于小公司或业余开发者来说，省钱才是核心诉求，精打细算 AI Coding，目前我的电脑上安装了多个 AI IDE，包括：

- 字节跳动 Trae
- 阿里巴巴 Qoder
- 腾讯 CodeBuddy
- Google Antigravity
- AWS Kiro
- Cursor
- Claude Code

其中 Cursor 价格高，Claude Code 有区域限制且价格高，另外的几款产品每月均提供免费额度。

因此，软件开发中我往往需要在多个 AI IDE 中切换，这样可以：

1. 了解不同家的产品设计，互相调试
2. 精打细算，每个月的免费额度都要用光

## 记忆文件

在 AI IDE 的使用中，Claude Code 引入了记忆系统工程，在`.claude/CLAUDE.md` 中描述项目核心规范。其技术理念从 2 个维度理解：

维度一：Rules、MCP、Skills、Commands、Hooks 等记忆类型，均为 md 文件与附属脚本等，使用自然语言描述。
维度二：企业记忆、用户记忆、项目记忆等，类比于 Linux 中的 `/etc/profile`、`~/.profile`和`~/.bashrc`，环境变量加载顺序与优先级。

一般情况下，在 TRAE 中使用的记忆文件，也希望在 Qoder 中使用。糟糕的是，在记忆文件上，虽然 Claude Code 提出了规范，但各家 AI IDE 之间仍然存少量差异，对开发者来说在迁移性较差。

所有的开发者都应该维护属于自己的记忆文件系统，然后按需拷贝到特定的 IDE 项目中。这样做，好麻烦，且需要手动再修改部分元数据，算是一件烦人的琐事（Dirty Work）。

基于这种需求，我期望有一个记忆文件管理工具，用户或团队只需要维护一套，并支持格式自动转换，同步到目标项目中。可以支持用户配置，启用或关闭，毕竟记忆文件不是越多越好，且可能存在冲突。

在互联网上发现了一个AI Coding 配置同步工具 glooit：在 Claude Code、Cursor、Codex、OpenCode 和 Roo Code/Cline 之间同步 AI 编码助手配置。

支持的类型很全面：

- Rules - Agent instructions and guidelines
- Commands - Custom slash commands
- Skills - Reusable agent capabilities
- Agents - Custom agent definitions
- MCP Servers - Model Context Protocol configurations
- Agent Hooks - Lifecycle hooks for Claude Code and Cursor
- Settings Merge - Merge shared env/permissions into provider-native settings files

其功能简单来说，用户维护记忆文件项目，然后写一个配置文件 `glooit.config.ts`，可以将文件同步到目标目录中，实际效果类比与复制 `cp`。

将 `.agents/main.md` 复制到 Claude、Cursor、Codex 项目中。

```ts
import { defineRules } from 'glooit';

export default defineRules({
  rules: [
    {
      file: '.agents/main.md',
      to: './',
      targets: ['claude', 'cursor', 'codex']
    }
  ]
});
```

当前 glooit 对国内 AI IDE 暂不支持，比如 Qoder、TRAE CN，但是它们也遵循Claude 制定的规范，在实际中也可以使用。

该项目很新，正式版本还未发布（1.x.x），在 GitHub 上仅有 20 Star，是一个很稚嫩的不知名项目。值得注意的是，该项目的贡献者除了开发者 nikuscs，还有 Cluade，也算是得到了大公司精神支持了。

![glooit-claude](https://media.xiaolin.fun/docs/img-dotai/glooit-claude.png)

## 总结

本文是一个随笔，AI Coding 对于个人开发者具有极大的价值，业余时间想要把自己的创意变成现实，一定要好好学习和利用 AI Coding。

第一，精打细算，使用多款产品白嫖免费额度。

第二，学习了解 AI 技术的底层逻辑，记忆文件架构系统值得专门学习，避免每天满嘴 Agent、Skills 等名词，实际上对其概念都不理解。

第三，不止于 AI Coding，使用 Skills、Agents 分析报告、制作 PPT、画架构图、写技术文章等等。对于 Claude 提出的记忆类型，推荐专门学习和使用。

```
Claude Code 记忆系统
│
├─1. 基础记忆单元
│  ├─ CLAUDE.md (永久上下文)
│  │  ├─ 功能: 每次对话加载
│  │  ├─ 用途: 项目约定，规则
│  │  └─ 示例: "使用 pnpm"
│  │
│  ├─ Skill (技能)
│  │  ├─ 功能: 指令，知识，工作流
│  │  ├─ 用途: 可复用任务，参考
│  │  └─ 示例: /deploy 脚本
│  │
│  └─ Subagent (子代理)
│     ├─ 功能: 隔离执行，总结结果
│     ├─ 用途: 上下文隔离，专用工
│     └─ 示例: 复杂文件研究
│
├─2. 高级协调与扩展
│  ├─ Agent teams (代理团队)
│  │  ├─ 功能: 协调多会话
│  │  ├─ 用途: 并行开发，调试
│  │  └─ 示例: 并行审阅团队
│  │
│  ├─ MCP (外部连接)
│  │  ├─ 功能: 连接外部服务
│  │  ├─ 用途: 外部数据/操作
│  │  └─ 示例: 数据库查询，Slack
│  │
│  └─ Hook (钩子)
│     ├─ 功能: 事件触发脚本 (非LLM)
│     ├─ 用途: 可预测自动化
│     └─ 示例: ESLint 检查
│
└─3. 包装与分发层
   └─ Plugins (插件)
      ├─ 定义: 包装层
      ├─ 捆绑内容: 技能/钩子/子代理/MCP
      ├─ 特性: 命名空间，可安装
      └─ 分发: 跨项目复用 / [应用市场]
```