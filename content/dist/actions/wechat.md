---
origin: docs/sre/devops/foundation/07-actions.md
origin_url: https://xiaolinstar.cn/sre/devops/foundation/07-actions.html
slug: actions
account: AI持续运维
mode: repurpose
status: draft
polish: []
---

![AI持续运维站点鸟图](https://media.xiaolin.fun/docs/wechat-theme/ai-ops-mascot.png)

# DevOps 基础 07 ｜ GitHub Actions：托管式流水线实战

06 篇结尾预告：下一篇重点看 YAML 配置、触发条件和执行环境如何配合。GitHub Actions 就是这条线的展开——用 YAML 描述「手动命令变成声明式动作链」，用 GitHub 托管 Runner 提供执行环境，模板即开即用。跟 06 篇的 Jenkinsfile 语法不同，「声明式动作链 + 运维左移」的思想完全一致。

对于个人开发者和小型团队，GitHub Actions 已经足够好用：功能强大、语法简单、免费额度充足，与 GitHub 仓库和 GHCR 容器镜像服务原生集成，不需要额外搭建和维护 CI/CD 服务器。这也是我专门写这篇的原因——越来越多个人开发者和一人公司需要轻量、开箱即用的流水线方案。

这一篇把核心概念与两个实战合并：一篇就能上手 GitHub Actions。

## 核心概念

为避免中英翻译造成的歧义，关键概念保留英文。

GitHub Actions 的核心概念可以和 Jenkinsfile 做类比：Workflow 对应一个 Jenkinsfile，是定义自动化流程的 YAML 文件。Event 对应 triggers，是触发 Workflow 的事件，比如 push、PR、issue 或定时任务。Jobs 对应 stages，是 Workflow 中可并行或串行的任务集。Steps 是 Job 内顺序执行的命令或 Action，对应 steps 块。Actions 是可复用的扩展，类似 Jenkins 的共享库，GitHub 官方和第三方 Marketplace 都有现成可用。Runner 对应 agent，是实际执行 Job 的虚拟机，支持 Ubuntu、Windows 和 macOS。

GitHub Actions 让仓库里配置的事件触发一段自动化。它同时提供两层能力：GitHub Actions 负责 Workflow 的编排、触发和状态管理；Runner 负责实际执行 Job。使用 GitHub 托管 Runner 时，执行环境由 GitHub 按任务临时提供和回收，使用体验接近 Serverless，但它本质上仍是托管的虚拟机执行环境。

常见场景包括：推送代码自动跑测试、构建和部署；创建 issue 自动加标签和派发；定时任务每天自动爬数据生成报表；手动按钮一次性执行。

![GitHub Overview](https://media.xiaolin.fun/docs/img-github-actions/overview-actions-simple.webp)

### 工作流文件位置

每个 workflow 是一个 YAML 文件，放在 `.github/workflows/` 目录下。比如本项目的 `page.yml` 负责 VitePress Pages 部署，`greetings.yml` 负责 Issue 和 PR 自动欢迎，`cron-daily.yml` 负责每天定时任务。

GitHub 官方提供 5 大类 workflow 模板：部署、安全、持续集成、自动化、Pages。多数场景可以从模板起步再改。

![workflow-template](https://media.xiaolin.fun/docs/img-github-actions/workflow-template.png)

## 实战一：Greetings 模板

在官方模板里，Greetings 工作流的作用是「新用户开 issue 或 PR 时，自动发送欢迎消息」。

下面是精简后的核心配置：

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
          issue-message: "Welcome! Thanks for your first issue."
          pr-message: "Welcome! Thanks for your first PR."
```

这里有几个关键点：`secrets.GITHUB_TOKEN` 是 GitHub 提供的默认密钥，无需额外配置。提交后创建一个 issue，工作流自动跑，issue 里自动出现欢迎消息。执行时身份是 `github-actions[bot]`。

![create-issue](https://media.xiaolin.fun/docs/img-github-actions-workflows/greeting-issue.png)

如果只想在 `opened` 类型时触发、不要 PR 消息，可以修改触发条件：

```yaml
on:
  issues:
    types:
      - opened
```

`pull_request_target` 会在目标仓库的权限上下文中运行，适合需要向 Issue 或 PR 写入评论的场景。模板只解决 50% 的事，改一改触发条件和文案，就能贴合自己仓库。

## 实战二：VitePress Pages 自动化部署

这是我站点实际用的 pipeline（站点：https://xiaolinstar.cn，GitHub Pages：https://xiaolinstar.github.io/xiaolin-docs/）——无需自建 CI/CD 服务器，也无需手动创建 Token。

### 1. 修改 URL 配置

GitHub Pages 默认域名带仓库前缀。在 VitePress 配置里加一行：

```typescript
const basePath = process.env.GITHUB_ACTIONS === 'true'
  ? '/xiaolin-docs/' : '/'
```

`process.env.GITHUB_ACTIONS === 'true'` 表示当前在 GitHub Actions 里跑，本地 `pnpm run docs:dev` 时走 `/`，不影响本地预览。

### 2. 流水线配置

完整的 `page.yml` 较长，这里展示关键结构。整个流水线分两个 Job：build 负责 checkout、安装依赖、构建文档并上传制品；deploy 负责拉取制品并部署到 GitHub Pages。

build Job 的核心步骤：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/configure-pages@v6
      - uses: pnpm/action-setup@v6
        with:
          version: '11.10.0'
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run docs:build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: docs/.vitepress/dist
```

deploy Job 依赖 build 完成：

```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v5
```

`deploy` 用 `needs: build` 显式依赖 `build`——这就是 06 篇说的 stages 思想，只是语法更 YAML 化。

### 3. 流水线策略：事件触发 + 作业编排

这个 Pages 部署案例体现了 GitHub Actions 的核心思想——**把标准作业编排为流水线，由事件触发执行**。

标准作业包括 checkout、install、build、deploy，每一步都是可复用的原子操作。用 YAML 定义 Jobs 之间的依赖关系（`needs: build`），就编排成了 DAG 流水线。`push` 到 main 分支、手动点击 `workflow_dispatch`、定时 `schedule`，都可以触发同一条流水线。

![流水线策略：事件触发 → 作业编排 → 标准执行](https://media.xiaolin.fun/docs/img-github-actions/infographic-pipeline-strategy.png)

首次使用需要在仓库 Pages 设置中选择 GitHub Actions；之后由 Workflow 自动构建和发布。不需要手动建 Token，用默认的 `secrets.GITHUB_TOKEN` 加 Pages 专用权限即可。推送代码即部署——`git push` 完看 Actions 面板，部署进度实时滚动。

对比手动部署通常需要依次完成的 7 类动作——本地构建、推送仓库、登录服务器、拉取镜像、创建网络、启动容器、健康检查——在 GitHub Actions 里只需要一行 `git push`。这就是流水线策略的价值：把重复的标准作业交给引擎编排，人只负责定义触发条件和审查安全边界。

## 实战经验

缓存依赖方面，`actions/setup-node` 设 `cache: 'pnpm'`，第二次构建能省几分钟。多 Node 版本测试可以用 `matrix: { node-version: [18, 20, 22] }` 一次跑多个版本。凭据管理要用 `secrets.GITHUB_TOKEN` 加 `permissions:` 显式声明权限，不要给过多权限。失败调试直接去 Actions 面板点击失败任务看 stdout 日志。

## 用 AI Agent 管理流水线

GitHub Actions 不只可以在网页中操作，也可以通过 GitHub CLI（`gh`）管理。AI Agent 可以安装 `gh` 相关 skill，直接读取 Workflow 配置、触发运行、分析日志并修复问题。

![gh-cli skill 安装界面](https://media.xiaolin.fun/docs/img-github-actions/gh-cli.png)

通过 `npx skills add` 从 GitHub 仓库安装 gh-cli skill，AI Agent 即可掌握 100+ 条 gh 子命令，无需人工逐条输入。

Agent 修复 Workflow 的典型闭环是这样的：构建或部署失败时，Agent 读取 `.github/workflows/page.yml`，使用 gh 定位失败 Job 和日志，修改 YAML 或脚本，执行本地检查（actionlint、构建验证），然后由人工审查权限、Secrets、环境和目标分支，确认后提交并推送修复，Agent 再重新触发并验证结果。

人负责审查安全边界（`permissions`、`environment`、Secrets、分支限制），Agent 负责读代码、改 YAML、分析日志和执行验证。涉及生产部署时，推送和触发权限仍应由人确认后执行。

## 流程旁白

本篇以 GitHub 托管 Runner 为主，重点展示 YAML 配置和触发条件。对于自托管 Runner、私有网络依赖或大规模并发等场景，需要根据实际需求调整执行环境和权限配置。AI Agent 管理流水线是工程化实践的延伸，核心仍是理解 Workflow 结构和权限边界。

## 小结

GitHub Actions 是托管式流水线代表：YAML 配置、无需自建执行服务器、模板即开即用，跟 06 篇 Jenkinsfile 在「声明式动作链」思想上完全一致。

两个实战覆盖了两类典型场景：Greetings 是事件驱动加第三方 Action，Pages 部署是完整 CI/CD 加 Pages 一键发布。

## 延伸阅读：从单个流水线到工程化实践

### 模板与复用，避免重复造轮子

本文的 Greetings 和 Pages 部署都从官方模板起步。当多个仓库需要相似的 CI/CD 流程，或同一仓库里多个 workflow 有共同步骤时，GitHub Actions 提供两种复用方式：Composite Actions 把多个 step 打包成一个 action，Reusable Workflows 让整个 workflow 被另一个调用。前者适合步骤级复用，后者适合流程级复用。Marketplace 里的第三方 action 也是复用，但引入前要审查权限和来源。

推荐阅读 GitHub Docs: Reusing workflows。本篇先理解复用的场景和边界，具体语法在需要时再查。

### Runner 执行模型：Serverless 与自托管

GitHub 提供的托管 Runner 按任务提供和回收执行环境，体验接近 Serverless——无需维护 CI 服务器，冷启动快，适合多数开源和企业项目。但有场景需要自托管 Runner：构建依赖私有网络、需要特定硬件（GPU、大内存）、或希望减少冷启动时间。自托管意味着自己维护执行环境的安全更新、网络隔离和容量规划，不能简单等同于在自己的机器上跑。选择托管还是自托管，本质是在运维成本和执行灵活性之间权衡。

推荐阅读 GitHub Docs: About self-hosted runners。先理解自托管的运维责任，再决定是否值得引入。

### 参考资料

[1] 了解 GitHub Actions
https://docs.github.com/zh/actions/get-started/understand-github-actions

[2] GitHub Actions 工作流语法
https://docs.github.com/zh/actions/reference/workflows-and-actions/workflow-syntax-for-github-actions

[3] GitHub Pages 快速入门
https://docs.github.com/zh/pages/quickstart

[4] Reusing workflows
https://docs.github.com/en/actions/sharing-automations/reusing-workflows

[5] About self-hosted runners
https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners

---

下一篇是 08 篇《多服务容器编排》：07 把托管式流水线跑通，但应用拓扑还停留在单容器心智。当你的应用需要 Nginx 反代加 API 加数据库一起协作时，多个容器如何用一份声明式 YAML 一起管理？那是 Docker Compose 的领域，也是 DevOps 基础篇的收口篇。

你的流水线里，还有哪一步依赖某个人记住？

本文的完整配置与示例见站点原文，点击文末"阅读原文"查看。
