---
title: 从零实现 CI/CD：GitHub Actions 快速介绍
description: 学习 GitHub Actions 中的核心概念基础知识以及基本术语。
date: 2026-03-28
updated: 2026-03-28
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---


学习 GitHub Actions 中的核心概念基础知识以及基本术语。

## 概述

GitHub Actions 是一个持续集成和持续交付 (CI/CD) 平台，可自动化**构建**、**测试**和**部署**流水线。可以创建工作流程来构建和测试每个 pull 请求仓库，或将合并的 pull 请求部署到生产环境。

GitHub Actions 不止是 DevOps，还能让仓库中发生其他事件时运行工作流程。例如

- 事件触发工作流，以便在仓库中创建新问题时自动添加相应的标签。
- 定时任务工作流，每天早上6:00拉取指定 url 数据并更新到静态站点。
- 定时任务工作流，每天8:00执行工作/疫情定位与打卡。

疫情时基于 Github Actions 实现每日自动打卡项目：

![bupt-auto-clock](https://media.xiaolin.fun/docs/img-github-actions/bupt-auto-clock.png)

由我完成的浙江师范大学自动打卡：

![zjnu-auto-clock](https://media.xiaolin.fun/docs/img-github-actions/zjnu-auto-clock-workflows.png)

GitHub 提供 Linux、Windows 和 macOS 虚拟机来运行工作流程，或者可在自己的数据中心或云基础架构中自托管。

## GitHub Actions 组成部分

> 为了避免中英翻译造成的歧义，保留使用英文关键词

可以配置一个 GitHub Actions 工作流 workflow，当仓库中发生**事件** event（例如打开拉取请求或创建问题）时触发，其中包含一个或多个可以按顺序或并行运行的**作业** jobs。每个作业将独立的虚拟机**运行器** runner 中或容器内运行，并且包含一个或多个**步骤** steps，这些步骤可以运行定义的脚本或**动作**actions（action 是一个可重复使用的扩展，可以简化工作流程）。

![GitHub Overview](https://media.xiaolin.fun/docs/img-github-actions/overview-actions-simple.webp)

### 工作流 Workflows

**工作流**是一个可配置的自动化流程，用于运行一个或多个作业。工作流由签入到仓库的 YAML 文件定义，并在仓库中的事件触发时运行，也可以手动触发或按照定义的计划触发。

工作流在存储库的目录中定义`.github/workflows`。一个存储库可以有多个工作流，每个工作流可以执行一组不同的任务，例如：

- 构建和测试拉取请求
- 每次发布时部署应用程序
- 每当有新问题出现时添加标签

可在某个工作流中引用另一个工作流，这意味着可扩展、可插拔，可以根据需要引用其他工作流。

GitHub Actions 官方提供了丰富的 Workflows 模板。

![workflow-template](https://media.xiaolin.fun/docs/img-github-actions/workflow-template.png)

官方将 Workflow 分为了5个类别，查看模版或许有所启发：

- 部署 Deployment
- 安全 Security
- 持续集成 Continuous integration
- 自动化 Automation
- 页面 Pages

## 事件 Events

**事件** event 是仓库中触发**工作流** workflow 运行的特定活动。例如，创建拉取请求、打开问题或将提交推送到仓库时，活动可能源自 GitHub。

此外，也支持发布到 REST API 或手动触发工作流按计划运行。

可用于触发工作流的事件在 `on` 标签下定义，可同时定义多个，比较常见的事件 event：

**push 到 main 分支时**

```yaml
on:
  push:
    branches:
      - main
```

**手动点击**

```yaml
on:
  workflow_dispatch:
```

**基于 `cron` 表达式的定时任务**

```yaml
on:
  schedule:
    - cron: "1 16 * * *"
```

## 作业 Jobs

**作业** Job 是工作流中在同一个**运行器** runner 上执行的一组**步骤** steps。每个步骤是 shell 脚本或**动作** action，步骤按顺序执行，并且相互依赖。

由于每个步骤都在同一个运行器上执行，因此可将数据从一个步骤共享到另一个步骤。例如，可先执行一个构建应用程序的步骤，然后再执行一个测试已构建应用程序的步骤。

您可以配置一个作业与其他作业的依赖关系；默认情况下，作业之间没有依赖关系，并且并行运行。当一个作业依赖于另一个作业时，它会等待依赖该作业完成后再运行。还可以使用矩阵多次运行同一项作业，每次运行都有不同的变量组合，例如操作系统或语言版本。

例如，可以为不同的架构配置多个彼此互不依赖的构建作业，以及一个依赖于这些构建作业的打包作业。这些构建作业并行运行，一旦它们成功完成，打包作业就会运行。

## 动作 Actions

动作 action 是一组预定义的、可重复使用的作业或代码，用于执行工作流程中的特定任务，从而减少重复造轮子。Action 可以执行以下任务：

- 从 GitHub 拉取 Git 代码仓库
- 构建环境设置正确的工具链
- 设置云提供商的身份验证

可以自定义 Action，也可以在 GitHub Marketplace 查找。

## 运行器 Runners

**运行器** Runner 是一种服务器，用于在事件 event 触发时运行工作流 workflow，每个 runner 一次可以运行一个作业。GitHub 提供 Ubuntu Linux、Microsoft Windows 和 macOS 运行器，每个工作流 workflow 运行都在一个全新的、新配置的虚拟机中执行。

一般地，可以选择 Ubuntu、Docker、Nodejs、Maven 等运行器来执行特定的工作流。

GitHub 还提供更大的运行器，可用于更大的配置。此外，如果需要不同的操作系统或特定的硬件配置，还可以自托管。

## 总结

GitHub Actions 把「事件驱动」与「基础设施即代码」这两件事做到了极致：

- 事件驱动：仓库里的任何风吹草动（一次 push、一条 issue、甚至一条定时 crontab）都可以触发一段自动化流程，真正做到“代码即流程”。
- 基础设施即代码：所有编排逻辑都写在`.github/workflows/*.yml`里，随仓库一起版本管理、一起评审、一起回滚，CI/CD 像写业务代码一样自然。

借助官方的 Linux / Windows / macOS 运行器，以及 Marketplace 上成千上万的现成 Action，我们几乎可以零成本地拼出任何常见场景：

- 代码一合并就自动跑单测、发版、打镜像、推送到云厂商；
- 每天 6:00 自动爬数据、生成报表、发邮件；
- 甚至疫情期间用它帮全校同学打卡也不成问题。

一句话：GitHub Actions 让「自动化」不再是运维专属，而成为每个开发者开箱即用的超能力。

## 参考

1. 了解GitHub Actions，[https://docs.github.com/zh/actions/get-started/understand-github-actions](https://docs.github.com/zh/actions/get-started/understand-github-actions)
2. GitHub Actions 的工作流语法，[https://docs.github.com/zh/actions/reference/workflows-and-actions/workflow-syntax-for-github-actions](https://docs.github.com/zh/actions/reference/workflows-and-actions/workflow-syntax-for-github-actions)