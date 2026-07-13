---
title: Mac 终端起手式：iTerm2、zsh 与插件
description: 面向 DevOps 初学者的 Mac 终端环境指南，建立可长期使用的本地命令行工作台。
date: 2026-07-11
updated: 2026-07-11
category: SRE 运维
tags:
  - 运维工具
  - Mac
  - 终端
---


Mac 天然适合学习 DevOps：它有图形化桌面，也有接近 Linux 的 Unix-like 终端环境。本文介绍一套适合长期使用的 Mac 终端起手式。

## 文章定位

这篇文章解决的问题不是「怎么把终端弄得很酷」，而是让初学者拥有一个稳定、顺手、可迁移的命令行工作台。

## 读者问题

1. Mac 自带终端够不够用，为什么还推荐 iTerm2？
2. zsh、oh-my-zsh、插件和主题分别解决什么问题？
3. 哪些配置是提高效率，哪些只是装饰？
4. 如何避免把本地终端配置成难以迁移的「祖传环境」？

## 内容大纲

### 终端模拟器：iTerm2

说明 iTerm2 相比系统 Terminal 的优势：多标签、分屏、搜索、复制体验、配置导出。

### Shell：zsh

解释 shell 与 terminal 的区别，说明 macOS 默认使用 zsh 的背景，以及为什么不需要初学者再切回 bash。

### 插件框架：oh-my-zsh

介绍 oh-my-zsh 的定位：不是 shell 本身，而是 zsh 配置管理框架。

### 推荐插件

优先介绍真正提升日常效率的插件：

- `git`
- `zsh-autosuggestions`
- `zsh-syntax-highlighting`
- `zsh-completions`

### 最小可用配置

给出一份克制的 `.zshrc` 示例，避免一上来堆满主题和插件。

### 与云服务器保持一致

说明为什么本地 Mac 终端和云服务器 Linux 终端要保持尽量一致：减少上下文切换，降低部署错误。

## 交付标准

读者完成本文后，应能：

1. 使用 iTerm2 作为主要终端。
2. 理解 terminal、shell、zsh、oh-my-zsh 的关系。
3. 拥有基础自动补全、命令高亮、Git 提示能力。
4. 为后续 SSH 登录云服务器、执行部署命令做好准备。

## 关联阅读

- [生产环境入门：部署到云服务器](../devops/foundation/production-env.md)
- [云服务器 Linux 起手式，为什么你的 shell 这么好看？](./linux-guide.md)
