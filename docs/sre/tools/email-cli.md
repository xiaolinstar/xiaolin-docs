---
title: email-cli：智能体办公的第一块拼图
description: 邮件，是绕不过去的效率瓶颈。
date: 2026-04-17
updated: 2026-04-17
category: 效率工具
tags: []
---


![email-cli 封面](https://media.xiaolin.fun/docs/img-email-cli/avatar.png)

邮件，是绕不过去的效率瓶颈。每天几十封、上百封邮件，分类、阅读、回复……大量时间消耗在这里。

一直有一个宏大的想法：**让 AI Agent 全权代理日常办公。** 规划、撰写、执行，统统交给智能体。对于智能体来说，CLI（命令行工具）是最理想的操作接口——没有 GUI 的视觉噪音，只有干净的输入与输出，Agent 可以直接调用，也可以组合进工作流。

既然要用 AI Agent 代理办公，就得先把工具铺好。邮件，是第一站。

himalaya，一个用 Rust 编写的开源 email-cli，正好契合这个思路。

## 效果预览

![show-me-emails](https://media.xiaolin.fun/docs/img-email-cli/show-me-emails.png)

在 AI IDE（如 Trae、Cursor、Claude Code）或 OpenClaw 的终端里，直接用自然语言下达指令：

```text
帮我列出今天未读的邮件，并把标题和发件人汇总给我
```

Agent 调用 himalaya 命令，返回结果：

```bash
$ himalaya envelope list --filter unseen
ID   From                    Subject                         Date
12   boss@company.com        关于 Q2 项目进展汇报              2026-04-15
11   hr@company.com          五一假期安排通知                  2026-04-15
10   noreply@github.com      [PR #42] Fix: null pointer bug  2026-04-14
```

```text
> 帮我查询下今天的邮件，并做个总结。
```

📧 今日邮件总结 (2026-04-16)

| ID | 来源 | 类型 | 核心内容摘要 | 关注级别 |
| :--- | :--- | :--- | :--- | :--- |
| 3232 | 腾讯云 | 安全预警 | 【主机安全】异常登录通知：检测到你的云服务器有异常登录行为，请务必核实。 | 极高 (立刻) |
| 3240 | Authy | 新设备确认 | 请确认你的新设备登录请求，以完成二次验证（2FA）绑定。 | 高 (实时) |
| 3238 | 阿里云 | 安全周报 | 云安全中心 4 月第 3 周周报已生成，包含近期的安全风险概览。 | 中 |
| 3231 | GitHub | 构建成功 | xiaolin-docs 项目的 Docker 镜像构建及证明（Attestation）已成功推送到 GHCR。 | 低 |

不需要打开浏览器，不需要切换应用，在 AI 对话框里一句话，收件箱状态一目了然。

## 为什么选 himalaya

市面上的邮件客户端不少：Thunderbird、Spark、Apple Mail，但对于智能体协作来说，它们有一个共同的致命缺陷：**GUI 界面，Agent 无法直接操控。**

![himalaya-cli](https://media.xiaolin.fun/docs/img-email-cli/himalaya.png)

himalaya 的核心定位是 **纯 CLI 邮件工具**，而不是交互式 TUI。这个区别至关重要：

| 对比维度 | GUI 邮件客户端 | himalaya (email-cli) |
| :------- | :------------ | :------------------- |
| Agent 可调用 | ❌ 需要模拟点击 | ✅ 直接命令调用 |
| 脚本集成 | ❌ 难以自动化 | ✅ 管道友好 |
| 输出格式 | ❌ 视觉渲染 | ✅ 支持 JSON 输出 |
| 资源占用 | 较高 | 极低 |
| 跨平台 | 一般 | macOS / Linux / Windows |

**JSON 输出**是点睛之笔。加上 `--output json` 参数，返回结构化数据，Agent 可以直接解析、过滤、再加工：

```bash
himalaya envelope list --output json | jq '.[] | select(.flags | contains(["unseen"]))'
```

## 安装与配置

### 安装

macOS 用户一行命令搞定：

```bash
brew install himalaya
```

> **Pro Tip**: 在 Trae 或 Cursor 等 AI 环境下，如果发现命令找不到，可能是 PATH 环境变量不包含 Homebrew 路径。此时可以尝试使用绝对路径 `/opt/homebrew/bin/himalaya`。

其他平台：

```bash
# Linux / macOS 通用脚本
curl -sSL https://raw.githubusercontent.com/pimalaya/himalaya/master/install.sh | sudo sh

# Arch Linux
pacman -S himalaya

# Cargo（需要 Rust 环境）
cargo install himalaya --locked
```

### 初始化配置

首次运行 `himalaya`，会启动交互式配置向导，填入 IMAP/SMTP 服务器信息和授权码即可。配置文件保存在 `~/.config/himalaya/config.toml`。

> himalaya 推荐使用安全获取密钥，而不是直接在配置文件中写授权码明文。然而，为了快速体验，这里直接写授权码明文。

以 QQ 邮箱为例，先在 QQ 邮箱网页版「设置 → IMAP/SMTP 服务」中开启服务、获取授权码，然后配置：

```toml
[accounts.xiaolin]
default = true
email = "xing.xiaolin@foxmail.com"
display-name = "xiaolin"
downloads-dir = "/Users/xlxing/Downloads"

backend.type = "imap"
backend.host = "imap.qq.com"
backend.port = 993
backend.login = "xing.xiaolin@foxmail.com"
backend.encryption.type = "tls"
backend.auth.type = "password"
backend.auth.raw = "xxxxxx"

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.qq.com"
message.send.backend.port = 465
message.send.backend.login = "xing.xiaolin@foxmail.com"
message.send.backend.encryption.type = "tls"
message.send.backend.auth.type = "password"
message.send.backend.auth.raw = "xxxxxxx"
```

多账户也不是问题，通过 `--account` 参数随时切换：

```bash
himalaya --account work envelope list
himalaya --account personal envelope list
```

## CLI 与 Agent 是高效办公的绝配

坦诚地说，**命令行（CLI）并不是为人类准备的**。人类更喜欢直观的按钮和色彩丰富的界面，去记忆复杂的命令参数（如 `himalaya envelope list --page-size 20`）无疑是在挑战认知成本。

但对于 AI Agent 来说，情况正好相反。GUI 界面对智能体来说是充满视觉不确定性的“黑盒”，而 CLI 则是逻辑极其清晰、输出极其规整的直连接口。

然而，仅有工具是不够的。如果只安装了 `himalaya`，你可能需要每次都在提示词中苦口婆心地说明：“请使用 himalaya 命令帮我查邮件...”。这显然不够智能。

### 赋予 Agent “肌肉记忆”：安装 Skill

有了 `himalaya` 只是第一步，要让智能体真正“开箱即用”，还需要安装 **Skill（技能插件）**。你可以把它理解为 Agent 的操作手册或“条件反射”。

```bash
npx skills add https://github.com/steipete/clawdis --skill himalaya
```

安装完成后，当你对 AI 说“帮我列出最近的 5 封邮件”时，它不再是盲目地猜测 Shell 命令，而是胸有成竹地调用已经内化的 `himalaya` 技能：

| ID | SUBJECT | FROM | DATE |
| :--- | :--- | :--- | :--- |
| 3237 | Issue 325: Things aren't... | Stack Overflow | 2026-04-15 |
| 3236 | "+300 alerts added to... | Reddit | 2026-04-15 |
| 3235 | Confirmation code to log... | JetBrains Account | 2026-04-15 |
| 3234 | The uploaded build for... | App Store Connect | 2026-04-15 |
| 3233 | 🚀 应用部署完成 -... | GitHub Actions | 2026-04-15 |

### 从感知到决策：全托管的邮件流

当 `himalaya` 遇上 AI Agent，邮件处理不再是单纯的“收发”，而是一套完整的**感知、理解、执行**闭环。

**1. 全局感知：不再迷失在收件箱**
比起一个个翻文件夹，你只需问一句“我有哪些文件夹？”，Agent 就能瞬间定位。除了 INBOX，它能感知到 `Sent Messages`、`Archive` 甚至你自定义的订阅文件夹，帮你建立全局视野。

**2. 深度理解：从“读信”到“掌握”**
Agent 最强大的地方在于**智能摘要**。当你指挥它“看看 ID 3237 的邮件在说什么”时，它会通过大模型能力输出精简报告：
> **智能摘要**：这是一封来自 Stack Overflow 的通知，关于 Issue #325 的最新进展，包含了开发者的建议和讨论链接。

**这种“读信 + 理解”的连招，实现了从原始数据到决策信息的质变。**

- **精准执行：复杂的流水线操作**
  通过与智能体的对话，原本琐碎的搜索、回复和归档工作如今已高度自动化。例如：
  - “帮我找找上周所有关于项目进展的邮件。”
  - “读完这封信，帮我起草一份得体的回复并发送。”
  - “把所有已读的系统通知类邮件，全部移到归档文件夹。”

对于这类批量任务，Agent 会自动组合 `himalaya` 与 `jq` 命令：

```bash
himalaya envelope list --output json \
  | jq -r '.[] | select(.flags | contains(["seen"])) | .id' \
  | xargs -I{} himalaya message move {} "Archive"
```

这类在 GUI 中需要手动多选、右键、移动的操作，在 Agent 面前不过是一行指令的事。

## 现阶段的局限

坦诚地说，himalaya 目前还不是一个 “开箱完美” 的工具。

**附件处理** 需要配合 MML（MIME Meta Language）语法，对于复杂的富文本邮件，有一定学习成本；**国内邮箱**（如企业微信邮箱、163 邮箱）的 IMAP 配置有时需要额外调试；**中文搜索** 的支持也依赖服务器端能力，本地过滤不够精准。

这些都是可以接受的代价。核心价值已经成立： **Agent 终于可以直接操作邮箱了。**

## 一个更大的图景

himalaya 只是起点。

未来的 AI Agent 办公体系，大概是这样的：

- **邮件**：himalaya，处理邮件收发与归档
- **日历**：khal / calcurse，管理日程与会议
- **任务管理**：todo.txt / taskwarrior，跟踪待办
- **文档**：pandoc + 本地 Markdown，撰写与转换

每一个工具都是 CLI 优先，每一个工具都可以被 Agent 直接调用。**AI IDE 成为总调度，人只需要负责决策，执行全部交给智能体。**

这不是遥远的未来，而是现在就可以开始构建的工作方式。一个工具、一个工具地接入，从邮件开始。

---

关键词：AI Agent、email-cli、himalaya、终端办公、智能体

## 参考

- [himalaya - pimalaya/himalaya](https://github.com/pimalaya/himalaya)
- [himalaya 官方网站 - pimalaya.org](https://pimalaya.org)

---

himalaya 是一个用 Rust 编写的开源 email-cli，通过纯命令行操作邮件，让 AI Agent 可以直接调用、驱动整个收件箱。从安装配置到在 AI IDE 中实战，分享用 CLI 邮件工具构建智能体办公体系的第一步探索。