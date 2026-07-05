---
title: 如何在中国大陆使用 Google Antigravity AI Coding 工具
description: Google Antigravity 是由 Google DeepMind 团队推出的一款革命性 AI 编程助手。
date: 2026-03-28
updated: 2026-03-28
category: AI 实践
tags:
  - LLM
  - Antigravity
  - AI
---


Google Antigravity 是由 Google DeepMind 团队推出的一款革命性 AI 编程助手。它不仅集成了 Gemini 3 系列最先进的模型，还支持接入 Anthropic 和 OpenAI 的多种模型，是开发者提升生产力的利器。

由于网络环境的特殊性，中国大陆开发者在安装后常会遇到无法正常登录的问题，本文旨在提供相应的解决方案。

**一句话描述：开启 TUN 模式。**

## 快速安装

### 前置条件

在开始之前，请确保你拥有以下资源：

1. **Google 账号**：建议直接使用以 `@gmail.com` 结尾的账号。
2. **网络工具**：能够稳定访问国际互联网的方案（代理工具）。

此外，你还需要一台性能主流的电脑，推荐使用近五年内产出的设备（支持 Windows、macOS 或 Linux 系统）。

目前大多数国际主流的 AI 编程 IDE 通行做法是将中国大陆排除在服务范围之外，部分工具甚至未向香港地区开放，因此通常需要将代理节点设置为日本、新加坡或台湾。

不过，Google Antigravity 比较特殊，它目前原生支持香港地区使用。

安装过程与常规软件无异，但在安装结束后首次启动时，系统通常会跳转至浏览器进行 OAuth 认证。这是大多数由于网络配置不当而导致安装失败的“重灾区”。

![antigravity-auth](https://media.xiaolin.fun/docs/img-antigravity/antigravity-auth.png)

## 解决网络问题

即使开启了网络工具，Antigravity 的底层子进程（如 AI Agent 运行的 shell）可能并不会默认通过你的代理，导致连接中断。

### 什么是“虚拟网卡” (TUN 模式)？

在配置指南之前，我们需要理解经常提到的 **TUN 模式** 或 **虚拟网卡**：

- **普通代理模式**：通常只对支持设置代理的浏览器或应用程序生效，是通过应用层的 HTTP/SOCKS 协议转发。
- **TUN 模式 (Virtual Network Interface)**：代理软件在你的系统中创建一个虚拟的网卡。它会在 **操作系统网络层** 拦截所有发出的数据包。

**为什么要用它？**  

Antigravity 内部会调用大量的后台搜索、代码执行和权限校验进程，这些进程往往不遵循常规的 IDE 代理设置。开启 TUN 模式/虚拟网卡后，系统内 **所有** 流量都会自动通过代理，无需为每个子项单独配置。

### 开启虚拟网卡

在现代网络代理工具中，通常可以一键开启 TUN 模式。

![virtual-network](https://media.xiaolin.fun/docs/img-antigravity/mihomo-tun.png)

配置时保持默认设置即可。本文以 Mihomo (Clash) 为例进行演示，其他主流工具的操作逻辑基本一致。

## 进阶配置与说明

### 开发模式

目前的 AI 编程工具普遍支持 Agent（智能助手）模式和编辑器模式，用户可以通过快捷键或点击界面右上角的图标进行无缝切换。

![antigravity-help](https://media.xiaolin.fun/docs/img-antigravity/antigravity-help.png)

### 模型额度监控插件

在使用 AI 编程工具时，实时监控模型额度是非常有必要的，这能帮助开发者对资源消耗做到“心中有数”。

![antigravity-cockpit.png](https://media.xiaolin.fun/docs/img-antigravity/antigravity-cockpit.png)

安装后重启 Antigravity 即可。

![antigravity-free](https://media.xiaolin.fun/docs/img-antigravity/antigravity-free.png)

> 注：付费订阅目前仍不支持中国大陆及香港地区的信用卡直接支付。

Google 提供订阅增值服务，每月花费约 150 元人民币即可订购 Google AI Pro 会员，预算充足的开发者可以考虑支持一下。

![Google AI Pro](https://media.xiaolin.fun/docs/img-antigravity/google-ai-pro.png)

订阅该会员后，你不仅可以解锁 Antigravity 的高级功能，还能享受 Google AI 全家桶的完整服务。

### 全局代理和虚拟网卡的区别

虽然很多代理软件都有“全局模式”，但它与“虚拟网卡（TUN 模式）”在实现原理上有本质区别：

| 特性 | 全局代理 (Global Mode) | 虚拟网卡 (TUN 模式) |
| :--- | :--- | :--- |
| **实现原理** | 应用层过滤，修改系统代理设置 | 网络层拦截，创建虚拟网卡设备 |
| **覆盖范围** | 仅捕获支持系统代理的应用 | 强制捕获系统中**所有**网络流量 |
| **终端支持** | 终端（Terminal/Git）通常无效 | 终端、后台进程、代码执行全覆盖 |
| **协议支持** | 通常仅限 HTTP/HTTPS | 支持 TCP, UDP, ICMP (Ping) 等 |

**因为虚拟网卡模式下，所有的流量都会走代理，因此在不使用 Antigravity 的时候，需要关闭虚拟网卡模式，避免访问普通网站都耗费流量。**

## 最后想说

Antigravity 是目前已知功能最强大的 Agentic AI 编程工具之一，且提供了慷慨的免费额度。对于大多数个人开发者而言，合理规划 Token 预算是持续高效开发的关键。

在众多 AI 编程工具中，我的推荐偏好如下：

1. **Antigravity**：最高优先级。Google 出品，免费额度高且底层推理能力极强。
2. **Qoder**：次优先级。阿里出品，Flash 模型对个人用户开放免费使用。
3. **CodeBuddy 或 TRAE**：分别是腾讯和字节跳动推出的竞品，值得保持关注。

AI 编程工具的核心竞争力在于其上下文工程（Context Engineering）的设计。随着项目复杂度的增加，Token 的消耗量呈指数级增长。目前按美元计费的订阅制成本依然较高，此前我曾尝试订阅其他工具，但额度消耗极快。因此，现阶段 Antigravity 的高免费额度显得尤为珍贵。