---
title: AI 待办快速上手
description: AI 待办提供三种入口：微信小程序、CLI 命令行工具和 Agent 集成。
date: 2026-06-17
updated: 2026-06-17
category: 软件产品
tags:
  - AI 待办
  - AI
---


AI 待办提供三种入口：微信小程序、CLI 命令行工具和 Agent 集成。

小程序适合人类用户日常查看和确认待办，CLI 适合开发者和自动化脚本，Agent 集成适合自然语言驱动的办公工作流。

## 微信小程序

微信小程序是最容易上手的入口，适合日常快速记录和查看。

基本流程：

1. 打开微信小程序：**AI 日省待办**
2. 使用微信登录；
3. 创建提醒、日历和联系人；
4. 在「我的」页面创建 CLI / Agent 访问令牌。

目前小程序适合自部署或测试版使用。

## CLI 安装

CLI 是 AI Agent 和高级用户的主要入口。

```bash
npm install -g @xiaolinstar/ai-todo-cli
```

## CLI 配置

在微信小程序中进入「我的 → CLI / Agent 访问令牌 → 创建」，然后把服务地址和令牌保存到本地配置文件。

配置文件路径：

```bash
~/.ai-todo/settings.json
```

示例：

```json
{
  "url": "https://xingxiaolin.cn",
  "token": "aitodo_xxx"
}
```

## 常用命令

查看今天的事项：

```bash
ai-todo today --json
```

创建提醒：

```bash
ai-todo reminder create \
  --title "给客户王总发报价确认邮件" \
  --due "2026-06-09T10:00:00+08:00" \
  --json
```

标记提醒完成：

```bash
ai-todo reminder done <reminder_id> --json
```

创建日程：

```bash
ai-todo calendar add \
  --title "产品评审" \
  --start "2026-06-09T14:00:00+08:00" \
  --end "2026-06-09T15:00:00+08:00" \
  --json
```

搜索联系人：

```bash
ai-todo contact search "王伟总" --json
```

创建联系人：

```bash
ai-todo contact add "王伟总" --handle wangzong --email wang@example.com --json
```

## 使用建议

- 面向脚本和 Agent 调用时，统一加 `--json`。
- 涉及时间的命令使用 ISO 8601 格式，并带上时区。
- 联系人尽量维护姓名、昵称、全拼、邮箱和手机号，方便 Agent 检索。
- 不要把 AI 待办当作项目管理工具，它更适合个人提醒、日程和联系人上下文。