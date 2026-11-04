---
title: 07 ｜ GitHub Actions：托管式流水线实战
description: 从 06 篇的 Jenkinsfile 出发，把 GitHub Actions 的核心概念（workflow / event / jobs / actions / runners）与两个实战案例（Greetings 模板 + VitePress Pages 部署）合并展示；再用 gh CLI 和 AI Agent 说明如何管理流水线——托管式流水线的代表，对个人开发者和开源项目尤其友好。
date: 2026-07-15
updated: 2026-11-04
category: SRE 运维
tags:
  - DevOps
  - GitHub Actions
  - CI/CD
  - IaC
---

06 篇结尾预告：下一篇重点看 YAML 配置、触发条件和执行环境如何配合。GitHub Actions 就是这条线的展开——用 YAML 描述「手动命令 → 声明式动作链」，用 GitHub 托管 Runner 提供执行环境，模板即开即用。跟 06 篇的 Jenkinsfile 语法不同，「**声明式动作链 + 运维左移**」的思想完全一致。

对于个人开发者和小型团队，GitHub Actions 已经足够好用：功能强大、语法简单、免费额度充足，与 GitHub 仓库和 GHCR 容器镜像服务原生集成，不需要额外搭建和维护 CI/CD 服务器。这也是我专门写这篇的原因——越来越多个人开发者和一人公司需要轻量、开箱即用的流水线方案。

这一篇把核心概念与两个实战合并：一篇就能上手 GitHub Actions。

## 核心概念

> 为避免中英翻译造成的歧义，关键概念保留英文。

| 概念 | 一句话 | 类比 Jenkinsfile |
| --- | --- | --- |
| **Workflow** | 一个 YAML 文件，定义自动化流程 | 一个 Jenkinsfile |
| **Event** | 触发 Workflow 的事件（push / PR / issue / 定时） | `triggers { ... }` |
| **Jobs** | Workflow 中可并行 / 串行的任务集 | `stages` |
| **Steps** | Job 内顺序执行的命令或 Action | `steps { ... }` |
| **Actions** | 可复用的扩展（GitHub 官方 / 第三方 Marketplace） | 共享库（Shared Libraries） |
| **Runner** | 实际执行 Job 的虚拟机（Ubuntu / Windows / macOS） | `agent` |

GitHub Actions 让仓库里配置的事件触发一段自动化。它同时提供两层能力：GitHub Actions 负责 Workflow 的编排、触发和状态管理；Runner 负责实际执行 Job。使用 GitHub 托管 Runner 时，执行环境由 GitHub 按任务临时提供和回收，使用体验接近 Serverless，但它本质上仍是托管的虚拟机执行环境。

- 推送代码 → 自动跑测试 / 构建 / 部署
- 创建 issue → 自动加标签 / 派发
- 定时 crontab → 每天 6:00 自动爬数据生成报表
- 手动按钮 → 一次性执行（`workflow_dispatch`）

![GitHub Overview](https://media.xiaolin.fun/docs/img-github-actions/overview-actions-simple.webp)

### 工作流文件位置

每个 workflow 是一个 YAML 文件，放在 `.github/workflows/` 目录下：

```
.github/
└── workflows/
    ├── page.yml           # VitePress Pages 部署
    ├── greetings.yml      # Issue / PR 自动欢迎
    └── cron-daily.yml     # 每天定时任务
```

GitHub 官方提供 5 大类 workflow 模板：**部署、安全、持续集成、自动化、Pages**。多数场景可以从模板起步再改。

![workflow-template](https://media.xiaolin.fun/docs/img-github-actions/workflow-template.png)

## 实战一：Greetings 模板

在官方模板里，Greetings 工作流作用是「**新用户开 issue 或 PR 时，自动发送欢迎消息**」。

```yaml
name: Greetings

on: [pull_request_target, issues]

jobs:
  greeting:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
    steps:
      - uses: actions/first-interaction@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          issue-message: "Message that will be displayed on users' first issue"
          pr-message: "Message that will be displayed on users' first pull request"
```

- `secrets.GITHUB_TOKEN` 是 GitHub 提供的**默认密钥**，无需额外配置
- 提交后创建一个 issue，工作流自动跑、issue 里自动出现欢迎消息
- 执行时身份是 `github-actions[bot]`

![create-issue](https://media.xiaolin.fun/docs/img-github-actions-workflows/greeting-issue.png)

如果只想在 `opened` 类型时触发、不要 PR 消息：

```yaml
on:
  issues:
    types:
      - opened
```

`pull_request_target` 会在目标仓库的权限上下文中运行。它适合需要向 Issue / PR 写入评论的场景，但不要在该事件中执行未经审查的 PR 代码，也不要 checkout 外部 PR 分支。模板只解决 50% 的事，**改一改触发条件和文案，就能贴合自己仓库**。

## 实战二：VitePress Pages 自动化部署

这是 xiaolin-docs 项目实际用的 pipeline（站点：https://xiaolinstar.cn，GitHub Pages：https://xiaolinstar.github.io/xiaolin-docs/）——无需自建 CI/CD 服务器，也无需手动创建 Token。

### 1. 修改 URL 配置

GitHub Pages 默认域名带仓库前缀：`https://<username>.github.io/<repository-name>/`。在 VitePress 配置里加一行：

```typescript
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/xiaolin-docs/' : '/'
```

`process.env.GITHUB_ACTIONS === 'true'` 表示「当前在 GitHub Actions 里跑」，本地 `pnpm run docs:dev` 时走 `/`，不影响本地预览。

### 2. 流水线 `page.yml`

```yaml
name: VitePress-Website Github Pages Deploy
on:
  push:                    # 触发一：push 到 main
    branches:
      - main
  workflow_dispatch:       # 触发二：手动按钮

env:
  TZ: Asia/Shanghai

# 默认只允许构建读取仓库；部署权限在 deploy Job 中单独声明
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Pages
        uses: actions/configure-pages@v6

      - uses: pnpm/action-setup@v6
        name: Install pnpm
        with:
          version: '11.10.0'
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build documentation
        run: pnpm run docs:build

      - name: Upload pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: 'github-pages'
          path: docs/.vitepress/dist

  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

### 3. 流水线分两段

| 阶段 | 做什么 | 输出 |
| --- | --- | --- |
| `build` | checkout → 装 pnpm/Node → 装依赖 → 构建 | 上传制品 `docs/.vitepress/dist` |
| `deploy` | 拉制品 → 部署到 GitHub Pages | 公网 URL |

`deploy` 用 `needs: build` 显式依赖 `build`——这就是 06 篇说的 `stages` 思想，只是语法更 YAML 化。首次使用 GitHub Pages 时，仍需在仓库 Settings → Pages → Build and deployment → Source 中选择 GitHub Actions；完成后，后续推送才会按该 Workflow 自动发布。

### 4. 流水线策略：事件触发 + 作业编排

这个 Pages 部署案例体现了 GitHub Actions 的核心思想——**把标准作业编排为流水线，由事件触发执行**。

- **标准作业**：checkout、install、build、deploy，每一步都是可复用的原子操作
- **编排为流水线**：用 YAML 定义 Jobs 之间的依赖关系（`needs: build`），形成 DAG
- **事件触发**：`push` 到 main 分支、手动点击 `workflow_dispatch`、定时 `schedule`，都可以启动同一条流水线

![流水线策略：事件触发 → 作业编排 → 标准执行](https://media.xiaolin.fun/docs/img-github-actions/infographic-pipeline-strategy.png)

首次使用需要在仓库 Pages 设置中选择 GitHub Actions；之后由 Workflow 自动构建和发布。不需要手动建 Token（用默认的 `secrets.GITHUB_TOKEN` + Pages 专用权限），推送代码即部署——`git push` 完看 Actions 面板，部署进度实时滚动。

对比手动部署通常需要依次完成的 7 类动作（本地构建、推送仓库、登录服务器、拉取镜像、创建网络、启动容器、健康检查），**`git push` 一行**即可触发后续流程。这就是流水线策略的价值：把重复的标准作业交给引擎编排，人只负责定义触发条件和审查安全边界。

## 实战经验

- **缓存依赖**：`actions/setup-node` 设 `cache: 'pnpm'`，第二次构建能省几分钟
- **多 Node 版本**：`matrix: { node-version: [18, 20, 22] }` 一次跑多个版本
- **凭据管理**：用 `secrets.GITHUB_TOKEN` + `permissions:` 显式声明权限，不要给过多权限
- **失败调试**：Actions 面板 → 点击失败任务 → 看 stdout 日志

## 用 AI Agent 管理流水线

GitHub Actions 不只可以在网页中操作，也可以通过 GitHub CLI（`gh`）管理。AI Agent 可以安装 `gh` 相关 skill，直接读取 Workflow 配置、触发运行、分析日志并修复问题。

![gh-cli skill 安装界面](https://media.xiaolin.fun/docs/img-github-actions/gh-cli.png)

::: details 📐 截图说明

通过 `npx skills add` 从 GitHub 仓库安装 gh-cli skill，AI Agent 即可掌握 100+ 条 gh 子命令，无需人工逐条输入。

:::

### Agent 修复 Workflow 的典型闭环

```text
需求：构建失败 / 部署失败
  → Agent 读取 .github/workflows/page.yml
  → Agent 使用 gh 定位失败 Job 和日志
  → Agent 修改 YAML 或脚本
  → Agent 执行本地检查（actionlint、构建验证）
  → 人工审查权限、Secrets、环境和目标分支
  → 提交并推送修复
  → Agent 重新触发并验证结果
```

人负责审查安全边界（`permissions`、`environment`、Secrets、分支限制），Agent 负责读代码、改 YAML、分析日志和执行验证。涉及生产部署时，推送和触发权限仍应由人确认后执行。

## 流程旁白

本篇以 GitHub 托管 Runner 为主，重点展示 YAML 配置和触发条件。对于自托管 Runner、私有网络依赖或大规模并发等场景，需要根据实际需求调整执行环境和权限配置。AI Agent 管理流水线是工程化实践的延伸，核心仍是理解 Workflow 结构和权限边界。

## 小结

GitHub Actions 是托管式流水线代表：YAML 配置、无需自建执行服务器、模板即开即用，跟 06 篇 Jenkinsfile 在「声明式动作链」思想上完全一致。

两个实战覆盖了**两类典型场景**：

- **Greetings**：事件驱动 + 第三方 Action（`first-interaction`）
- **Pages 部署**：完整 CI/CD（构建 → 制品 → 部署）+ Pages 一键发布

下一步进入 [第 08 篇 · 多服务容器编排](./08-docker-compose.md)：07 把「托管式流水线」跑通，但**应用拓扑还停留在单容器心智**。当你的应用需要 Nginx 反代 + API + 数据库一起协作时，**多个容器如何用一份声明式 YAML 一起管理**？那是 Docker Compose 的领域——也是 DevOps 基础篇的收口篇。

## 思考

1. GitHub Actions 和 Jenkinsfile 各自适合什么场景？什么情况下你会选托管式（Actions），什么情况下选自托管（Jenkins）？
2. 流水线里如果要在多个 job 间传递数据（比如 build 完的制品给 deploy 用），Actions 用什么机制？Jenkins 用什么机制？
3. `permissions` 字段为什么要**显式声明**而不是默认全开？最小权限原则在这里为什么重要？

## 延伸阅读：从单个流水线到工程化实践

### 模板与复用，避免重复造轮子

本文的 Greetings 和 Pages 部署都从官方模板起步。当多个仓库需要相似的 CI/CD 流程，或同一仓库里多个 workflow 有共同步骤时，GitHub Actions 提供两种复用方式：**Composite Actions**（把多个 step 打包成一个 action）和 **Reusable Workflows**（整个 workflow 被另一个调用）。前者适合步骤级复用，后者适合流程级复用，Marketplace 里的第三方 action 也是复用，但引入前要审查权限和来源。

推荐阅读 [GitHub Docs: Reusing workflows](https://docs.github.com/en/actions/sharing-automations/reusing-workflows)。本篇先理解复用的场景和边界，具体语法在需要时再查。

### Runner 执行模型：Serverless 与自托管

GitHub 提供的托管 Runner 按任务提供和回收执行环境，体验接近 Serverless——无需维护 CI 服务器，冷启动快，适合多数开源和企业项目。但有场景需要自托管 Runner：构建依赖私有网络、需要特定硬件（GPU、大内存）、或希望减少冷启动时间。自托管意味着自己维护执行环境的安全更新、网络隔离和容量规划，不能简单等同于"在自己的机器上跑"。选择托管还是自托管，本质是在运维成本和执行灵活性之间权衡。

推荐阅读 [GitHub Docs: About self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners)。先理解自托管的运维责任，再决定是否值得引入。

## 参考

1. [了解 GitHub Actions](https://docs.github.com/zh/actions/get-started/understand-github-actions)
2. [GitHub Actions 工作流语法](https://docs.github.com/zh/actions/reference/workflows-and-actions/workflow-syntax-for-github-actions)
3. [GitHub Pages 快速入门](https://docs.github.com/zh/pages/quickstart)
4. [actions/upload-pages-artifact](https://github.com/actions/upload-pages-artifact)
5. [actions/deploy-pages](https://github.com/actions/deploy-pages)
