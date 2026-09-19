---
title: 07 ｜ GitHub Actions：托管式流水线实战
description: 把 GitHub Actions 的核心概念（workflow / event / jobs / actions / runners）与两个实战案例（Greetings 模板 + VitePress Pages 部署）合并展示——托管式流水线的代表，对个人开发者和开源项目尤其友好。
date: 2026-07-15
updated: 2026-07-15
category: SRE 运维
tags:
  - DevOps
  - GitHub Actions
  - CI/CD
  - IaC
---

06 篇讲了 Jenkinsfile——用 Groovy DSL 描述「手动命令 → 声明式动作链」。GitHub Actions 是**托管式流水线**的另一代表：用 YAML 配置、无需自建执行服务器、模板即开即用。两者语法不同，「**声明式动作链 + 运维左移**」的思想完全一致。

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

这是本项目（xiaolin-docs）实际用的 pipeline——完成生产变更自动化，无需自建 CI/CD 服务器，也无需手动创建 Token。

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
        uses: actions/checkout@v6

      - name: Setup Pages
        uses: actions/configure-pages@v6

      - uses: pnpm/action-setup@v6
        name: Install pnpm
        with:
          version: '11.10.0'
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v6
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

### 4. 为什么「生产变更自动化」

- 首次需要在仓库 Pages 设置中选择 GitHub Actions；之后由 Workflow 自动构建和发布
- 不需要手动建 Token（用默认的 `secrets.GITHUB_TOKEN` + Pages 专用权限）
- 推送代码即部署——`git push` 完看 Actions 面板，部署进度实时滚动

## 自动化与托管式执行

GitHub Actions + GitHub Pages 一起用，达成**两层自动化**：

- **流水线引擎**：解析 Workflow，响应 Event，按 `needs` 调度 Jobs 和 Steps，记录执行状态；
- **托管执行环境**：GitHub 提供 Runner，负责实际运行构建、测试和部署命令。开发者不需要维护 CI Server，但仍需维护 Workflow、权限、依赖和发布配置。

| 维度 | 自动化效果 |
| --- | --- |
| **构建** | 推送代码 → 自动装依赖 + 构建 |
| **部署** | 构建完 → 自动上传制品 → 自动部署到 Pages |
| **默认域名 / HTTPS** | 由 GitHub Pages 提供；自定义域名需要单独配置 |
| **静态资源分发** | 由 GitHub Pages 提供 |
| **执行环境** | 使用 GitHub 托管 Runner，按任务提供执行环境 |

对比手动部署通常需要依次完成的 7 类动作，**`git push` 一行**即可触发后续流程：

| 手动部署 | GitHub Actions |
| --- | --- |
| 1. 本地构建 | 1. `git push` 触发 Workflow |
| 2. 推送仓库 | 2. Workflow 编排 Jobs |
| 3. 登录服务器 | 3. 托管 Runner 执行构建与部署 |
| 4. 拉取镜像 | 4. 自动上传 Pages 制品 |
| 5. 创建网络 | 5. 自动发布到 Pages |
| 6. 启动容器 | 6. 查看运行日志和状态 |
| 7. 健康检查 |  |

左侧是人按顺序执行的 7 类动作，右侧是一次 `git push` 之后由 Workflow、Runner 和 Pages 服务协同完成的生产变更自动化。用表格表达步骤，更适合复制、阅读和微信公众号等不完整支持 Mermaid 的场景。

开发人员把生产变更写进 Workflow；构建、部署和结果记录交给 GitHub Actions 执行，但权限、依赖和失败处理仍需要持续维护。

## 实战经验

- **缓存依赖**：`actions/setup-node` 设 `cache: 'pnpm'`，第二次构建能省几分钟
- **多 Node 版本**：`matrix: { node-version: [18, 20, 22] }` 一次跑多个版本
- **凭据管理**：用 `secrets.GITHUB_TOKEN` + `permissions:` 显式声明权限，不要给过多权限
- **失败调试**：Actions 面板 → 点击失败任务 → 看 stdout 日志

## 用 `gh` 和 AI Agent 管理流水线

GitHub Actions 不只可以在网页中操作，也可以通过 GitHub CLI（`gh`）管理。AI Agent 可以根据需求创建或修改 `.github/workflows/*.yml`，再使用 `gh` 触发运行、观察结果，并根据日志修复问题。`gh` 主要负责 Workflow 和运行记录管理，不替代 YAML 静态检查工具。推荐保留人工确认环节：Agent 负责读代码、改 YAML 和分析日志，真正推送或部署前由人审查权限、触发条件和目标环境。

### 查看与触发 Workflow

```bash
# 查看仓库中的 Workflow
gh workflow list

# 查看某个 Workflow 的配置和状态
gh workflow view page.yml

# 手动触发 Workflow
gh workflow run page.yml --ref main

# 查看最近的运行记录
gh run list --workflow page.yml --limit 10
```

拿到运行编号后，可以继续查看实时状态和失败日志：

```bash
gh run watch RUN_ID
gh run view RUN_ID --log-failed
```

修改 Workflow 后，先做本地检查，再触发远程运行：

```bash
# 检查 GitHub Actions Workflow 语法（需要提前安装 actionlint）
actionlint .github/workflows/page.yml

# 检查项目构建
pnpm run docs:build
```

### Agent 修复 Workflow 的典型闭环

```text
需求：构建失败 / 部署失败
  → Agent 读取 .github/workflows/page.yml
  → gh run list / gh run view 定位失败 Job
  → Agent 修改 YAML 或脚本
  → actionlint 检查 Workflow，pnpm run docs:build 检查项目构建
  → 人工审查权限、Secrets、环境和目标分支
  → 提交并推送修复
  → gh workflow run 重新触发
  → gh run watch / gh run view --log-failed 验证结果
```

除了运行 Workflow，`gh workflow enable page.yml` 和 `gh workflow disable page.yml` 还可以切换 Workflow 状态。涉及生产部署时，应重点复核 `permissions`、`environment`、Secrets、分支限制和 `pull_request_target` 等安全边界。

Agent 可以生成补丁、运行检查和整理失败日志，但不应默认拥有生产推送权限。提交、推送、修改 Secrets、调整部署环境保护规则等动作，应由具备相应权限的人确认后执行。

## 小结

GitHub Actions 是托管式流水线代表：YAML 配置、无需自建执行服务器、模板即开即用，跟 06 篇 Jenkinsfile 在「声明式动作链」思想上完全一致。

两个实战覆盖了**两类典型场景**：

- **Greetings**：事件驱动 + 第三方 Action（`first-interaction`）
- **Pages 部署**：完整 CI/CD（构建 → 制品 → 部署）+ Pages 一键发布

下一步进入 [第 08 篇 · 多服务容器编排](./docker-compose.md)：07 把「托管式流水线」跑通，但**应用拓扑还停留在单容器心智**。当你的应用需要 Nginx 反代 + API + 数据库一起协作时，**多个容器如何用一份声明式 YAML 一起管理**？那是 Docker Compose 的领域——也是 DevOps 基础篇的收口篇。

## 思考

1. GitHub Actions 和 Jenkinsfile 各自适合什么场景？什么情况下你会选托管式（Actions），什么情况下选自托管（Jenkins）？
2. 流水线里如果要在多个 job 间传递数据（比如 build 完的制品给 deploy 用），Actions 用什么机制？Jenkins 用什么机制？
3. `permissions` 字段为什么要**显式声明**而不是默认全开？最小权限原则在这里为什么重要？

## 参考

1. [了解 GitHub Actions](https://docs.github.com/zh/actions/get-started/understand-github-actions)
2. [GitHub Actions 工作流语法](https://docs.github.com/zh/actions/reference/workflows-and-actions/workflow-syntax-for-github-actions)
3. [GitHub Pages 快速入门](https://docs.github.com/zh/pages/quickstart)
4. [actions/upload-pages-artifact](https://github.com/actions/upload-pages-artifact)
5. [actions/deploy-pages](https://github.com/actions/deploy-pages)
