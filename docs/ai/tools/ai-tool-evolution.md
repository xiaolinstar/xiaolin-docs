---
title: AI 工具形态演变：Copilot、AI Native IDE、CLI、VSCode Plugin、Desktop App
description: 在过去几年里，AI 技术应用经历了令人惊叹的进化，很难想象今天的 AI 已经成为如此强大的工具。
date: 2026-05-05
updated: 2026-05-05
category: 效率工具
tags:
  - AI
---


## 引言

在过去几年里，AI 技术应用经历了令人惊叹的进化，很难想象今天的 AI 已经成为如此强大的工具。

作为一名长期关注 AI 技术发展的业务人员，本文想讨论下 AI 工具的产品形态。

## 代码补全

**代表产品：GitHub Copilot**  

2021 年 GitHub Copilot 的发布，标志着 AI 编码工具的正式登场。它的核心功能很简单——基于上下文进行代码补全。其实在大模型问世之前，就有类似的工具，比如 JetBrains 系列产品的原生代码补全功能，还有 Tabnine 插件，基于机器学习的代码补全功能。

产品形态也很熟悉，就是 VSCode/JetBrains 旁边有一个小窗口，用户可以基于当前文件的内容，输入代码，AI 会根据上下文进行补全。

之后，字节跳动推出豆包 MarsCode（后来更名为 TRAE）、腾讯推出 CodeBuddy 等产品，均提供了较为完善的代码补全功能，支持多种编程语言。

但总的来说，早起的 AI 插件上下文较小，提供修改代码或覆盖代码的功能。

这一产品是首次在领域应用中集成大模型能力，基本确定了 AI 工具的形态，奠定了结对编程的使用模式。

![TRAE Plugin](https://media.xiaolin.fun/docs/img-ai-ide-evolution/trae-plugin.png)

## AI Native IDE

**代表产品：Cursor**  

Cursor 的出现，标志着 AI 工具从"辅助角色"向"核心角色"的转变。它不是在现有 IDE 上增加 AI 功能，而是从头设计一个以 AI 为中心的开发环境。

Cursor 的出现对开发者来说是现象级的，因为它第一次给推崇古法编程的开发者带来了一点震撼，原来 AI 完全可以写出生产级别的代码，从头到尾一气呵成。也是在这个时候有了 Vibe Coding 的概念，从全栈开发演变到一人公司，看起来似乎不遥远了。

各大公司发现 AI Coding 工具是一个蓝海，纷纷投入重金开始研发。字节跳动将 MarsCode 更名为 TRAE，将其定义为原生的 AI 编码工具。

因为 VSCode 是完全开源的产品，各大公司纷纷 Fork，在此基础上开发自己的产品。

这个时候可以看到所有的产品都长的如此像 VSCode，插件市场也和 VSCode 一样。原生的 AI 编码工具获得了更高的权限，上下文也更丰富，能够理解整个代码库的结构和依赖。

Cursor：

![Cursor Native IDE](https://media.xiaolin.fun/docs/img-ai-ide-evolution/cursor-app.png)

字节跳动 TRAE：

![TRAE](https://media.xiaolin.fun/docs/img-ai-ide-evolution/trae.png)

## AI CLI

**代表产品：Claude Code**  

就在众多厂商都积极 Fork VSCode 的时候，Claude Code 迈出了重要的一步，它完全抛弃了图形界面，把 AI 助手直接带到了终端。

为什么编码工具必须得和 IDE 关联？Claude Code 的出现，既颠覆了对编码工具的使用模式，也将 AI Coding 工具泛化，Claude Code 是通用的 AI Agent，至于编码只是它的一个核心使用场景而已。

之后国内厂商 TRAE、Qoder、CodeBuddy 等产品也出现了 AI CLI 版本，为开发者提供了更方便的使用方式。

![Claude Code](https://media.xiaolin.fun/docs/img-ai-ide-evolution/claude-code-cli.png)

## 操作系统级智能体

**代表产品：OpenClaw**  

OpenClaw 的出现，标志着 AI 工具进入了一个全新的阶段——操作系统级别的智能体。将 AI Agent 作为操作系统的一个后台服务，能够监听各种触发事件（消息、时间、文件变化等），并自动执行复杂的多步骤任务。

特别的是，OpenClaw 架构提供了高度的可扩展性，各个产品都可以根据接入规范来面向 Agent 开发，Skills、CLI 迎来了井喷式的发展。

OpenClaw 带来的一个核心颠覆是，所有的系统都应该考虑面向 Agent 开发，用户可能都希望通过 Agent 代理来访问系统功能。

微信接入 OpenClaw 机器人：

![Wechat OpenClaw](https://media.xiaolin.fun/docs/img-ai-ide-evolution/wechat-openclaw.png)

## 智能体协作平台

**代表产品：Codex（OpenAI）**  

![CodexApp](https://media.xiaolin.fun/docs/img-ai-ide-evolution/codex-app.png)

OpenAI 这家人工智能先驱在2026年2月2日正式发布了 Codex 的独立桌面 App，这是一个基于多智能体的协作平台。

Codex 的产品形态其貌不扬，但用起来发现其工作调度能力非常强大，能够自动将任务拆解为多个子任务，每个子任务由一个专业的智能体负责执行。

Codex 的产品理念也是 Vibe Coding 优先，不需要懂代码，只需要与智能体交互即可。

![Codex](https://media.xiaolin.fun/docs/img-ai-ide-evolution/codex.png)

## 结语

AI 工具的形态演变，本质上是人机交互方式的革命。从代码补全到操作系统级智能体，每一步都在让技术更贴近人类的自然行为方式。

上述产品形态交叉影响，奠定了今天的 AI 工具形态的基础。了解上述产品形态，那么对于其他衍生产品就更加清晰了。现在基本所有的产品都支持了 CLI，VSCode 插件。原生 AI 编码工具热度不在，反而追求打造类似 Codex 一样看起来像桌面 App，降低应用门槛，面向更大众用户。

从我的理解，AI 工具本质上都一样，粗略可以分为 OpenClaw 和 Claude 两大类。一个是一个基于操作系统的后台服务智能体，另一个是一个基于终端的应用智能体。它们都对扩展有良好的支持，因此将其视为同一类工具也说得通。

我最近的一个小目标是，完全面向 AI 代理工作，下一步尝试体验并对比腾讯的两款所谓的办公助手 QClaw 和 CodeBuddy。从现在已有的体验感受来看，QClaw 是 OpenClaw 的衍生产品，WorkBuddy 是 Claude 的衍生产品。

## 延伸阅读

面向 Agent 开发的个人事务数据层 **[AI 日省待办](/products/ai-todo/)** 提供提醒、日历、联系人的 CLI 接口（命令名 `ai-todo`），可与 OpenClaw Skill 组合使用。详见 [Agent 接入](/products/ai-todo/agent)。

关键词：AI 工具、智能体、OpenClaw、Cursor、Copilot、工具形态