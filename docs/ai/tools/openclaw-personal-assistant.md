---
title: 自己动手搭建 AI 办公助手：每月不到 50 元搞定全流程自动化
description: 作为一个对成本敏感又喜欢折腾的技术爱好者，我一直在寻找性价比更高的 AI 办公方案。
date: 2026-05-26
updated: 2026-05-26
category: 效率工具
tags:
  - AI
---


## 为什么我选择自己搭 AI 助手？

作为一个对成本敏感又喜欢折腾的技术爱好者，我一直在寻找性价比更高的 AI 办公方案。飞书的 Aily 确实好用，开箱即用，但每月几十上百的费用让我有点肉疼。更重要的是，SaaS 服务的数据隐私总让我有点不放心。

于是我开始研究自建方案。经过一番折腾，我用一台 50 元/月的云服务器搭建了自己的 AI 助手，实现了邮件管理、待办追踪、日历同步、文档生成等全部功能。今天就把这套方案分享给大家。

## 成本对比：自建 vs SaaS

先给大家算笔账：

| 方案 | 月成本 | 功能 | 数据隐私 | 可定制性 |
|------|--------|------|----------|----------|
| 飞书 Aily | ¥99-299 | 办公套件集成 | 第三方托管 | 有限 |
| 腾讯智谱 | ¥68-198 | 基础 AI 能力 | 第三方托管 | 有限 |
| 自建 OpenClaw | ¥30-80 | 完全自定义 | 自主掌控 | 无限 |

我目前的配置：
- 云服务器：¥45/月（2核4G）
- AI API 费用：¥5-10/月（日均 100 次调用）
- **总计：¥50 左右/月**

## 核心功能展示

经过两周的调试，我的 AI 助手已经能处理这些日常工作：

### 1. 邮件管家
```text
我：帮我整理今天的邮件
AI：已为您整理今日邮件（共 12 封）：
- 紧急：老板关于项目进度的询问（已标红）
- 重要：客户合同修订意见（待回复）
- 常规：3 封订阅邮件（已归档）
- 营销：5 封广告邮件（已过滤）
```

### 2. 智能待办
```text
我：把这个会议记录里的行动项提取出来
AI：已识别 3 个行动项：
1. 完成技术方案文档（截止：本周五）
2. 联系客户确认需求（截止：明天下午）
3. 安排下周评审会议（待跟进）
```

### 3. 日历助手
```text
我：帮我看下周三下午有没有空
AI：周三下午 2:00-4:00 有空档，已帮您预约会议室 A302，需要邀请哪些人？
```

### 4. 文档生成
```text
我：写一份上周项目周报
AI：已生成周报初稿，请查看附件。主要内容包括：
- 完成功能开发 3 项
- 修复 Bug 5 个
- 下周计划 4 项
```

## 手把手部署教程

### 准备工作

你需要准备：
- 一台云服务器（推荐 2核4G 以上）
- 一个域名（可选，用于 HTTPS）
- AI API Key（推荐 Anthropic 或 OpenAI）
- 基础的 Linux 操作能力

### 步骤 1：服务器初始化

我用的是阿里云轻量应用服务器，Ubuntu 22.04 系统。

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要依赖
sudo apt install -y docker docker-compose git

# 创建工作目录
mkdir -p ~/openclaw && cd ~/openclaw
```

### 步骤 2：配置环境变量

创建 `.env` 文件：

```bash
# AI 配置
ANTHROPIC_API_KEY=your-api-key-here

# OpenClaw 配置
OPENCLAW_PORT=8080
OPENCLAW_SECRET=your-secret-key

# 邮件配置（可选）
EMAIL_IMAP_HOST=imap.qq.com
EMAIL_IMAP_PORT=993
EMAIL_USER=your@email.com
EMAIL_PASS=your-app-password
```

### 步骤 3：启动 OpenClaw

创建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  openclaw:
    image: openclaw/openclaw:latest
    container_name: openclaw
    ports:
      - "8080:8080"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENCLAW_SECRET=${OPENCLAW_SECRET}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

启动服务：

```bash
docker-compose up -d
```

### 步骤 4：配置技能插件

OpenClaw 的强大之处在于它的技能系统。我安装了这些核心技能：

```bash
# 邮件处理技能
openclaw skill install email-processor

# 待办管理技能
openclaw skill install task-manager

# 日历集成技能
openclaw skill install calendar-sync

# 文档生成技能
openclaw skill install doc-generator

# PPT 制作技能
openclaw skill install ppt-creator
```

### 步骤 5：配置消息渠道

我主要用 Telegram 和微信作为交互入口：

```bash
# 配置 Telegram
openclaw channel add telegram --token your-telegram-bot-token

# 配置微信（需要额外配置）
openclaw channel add wechat --app-id your-app-id --app-secret your-app-secret
```

## 我的实际使用体验

经过这段时间的使用，我有几个真实感受想分享：

### 优点
1. **成本真的很低**：我这个月的 API 费用才花了 6 块钱
2. **数据自己掌控**：所有数据都在自己的服务器上，心里踏实
3. **自由度很高**：可以自己写技能插件，想怎么定制就怎么定制
4. **学习收获大**：折腾的过程中学到了很多 DevOps 知识

### 踩过的坑
1. **网络问题**：国内服务器访问 Anthropic API 需要配置代理
2. **技能冲突**：有些技能之间会互相影响，需要调整优先级
3. **资源占用**：高峰期内存占用会到 2G 左右，建议选 4G 内存的服务器

## AI Agent 办公的未来畅想

我相信，AI Agent 办公是未来的趋势。想象一下：

- **早上**：AI 助手自动整理邮件，生成日程建议
- **工作中**：随时召唤 AI 处理文档、生成报表、安排会议
- **下班后**：AI 自动总结当天工作，生成待办清单
- **周末**：AI 帮你规划周末安排，甚至预订餐厅

这种"对话即操作"的方式，正在改变我们的工作方式。

## 总结

如果你：
- 对成本敏感
- 喜欢动手折腾
- 注重数据隐私
- 想要无限定制能力

那么自建 OpenClaw 绝对值得一试。相比于付费 SaaS 服务，虽然初期需要花点时间配置，但长期来看既省钱又灵活。

现在就动手试试吧！一台云服务器，一个 API Key，开启你的 AI 办公之旅。

## 延伸阅读

Agent 提取邮件行动项、生成待办后，需要可靠的结构化存储与微信提醒时，可参考本站产品 **[AI 日省待办](/products/ai-todo/)**：

- [产品介绍](/products/ai-todo/product)：设计理念与 Agent + 小程序分工
- [Agent 接入](/products/ai-todo/agent)：OpenClaw、Claude Code 等如何通过 CLI 写入待办

---

关键词：AI Agent、OpenClaw、个人助手、办公自动化、自建方案

## 参考

- [OpenClaw 官方网站](https://tryopenclaw.site/)
- [OpenClaw GitHub 仓库](https://github.com/openclaw/openclaw)
- [Anthropic API 文档](https://docs.anthropic.com/claude/docs/introduction)

---

这篇文章基于我个人的真实体验，从选型、部署到实际使用，分享了一套完整的自建 AI 办公助手方案。希望能帮助到想要低成本实现智能化办公的朋友们。