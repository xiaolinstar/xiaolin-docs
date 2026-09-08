---
title: Windows 上使用 WSL Ubuntu 开发
description: 面向 DevOps 初学者的 Windows 终端环境指南，用 WSL Ubuntu 替代 cmd 和 PowerShell 完成 Linux 运维学习。
date: 2026-07-11
updated: 2026-07-11
category: SRE 运维
tags:
  - 运维工具
  - Windows
  - WSL
  - Ubuntu
---


Windows 可以作为日常开发系统，但不建议直接使用 `cmd` 或 PowerShell 学 Linux 运维命令。更稳妥的方式，是使用 WSL Ubuntu 获得一个接近真实 Linux 的本地开发环境。

## 文章定位

这篇文章面向使用 Windows 电脑的 DevOps 初学者，目标是把「本地 Windows」和「远程 Ubuntu 云服务器」之间的命令差异降到最低。

## 读者问题

1. 为什么不建议直接用 `cmd` 或 PowerShell 学 Linux？
2. WSL、虚拟机、双系统分别适合什么场景？
3. WSL Ubuntu 和云服务器 Ubuntu 有哪些相同点和差异？
4. 如何在 Windows 上获得稳定的 Linux 开发体验？

## 内容大纲

### 为什么选择 WSL Ubuntu

对比三种方案：

| 方案 | 适合场景 | 不足 |
| --- | --- | --- |
| `cmd` / PowerShell | Windows 系统管理 | 与 Linux 命令体系差异大 |
| 虚拟机 | 完整桌面实验 | 占用资源更高，启动更重 |
| WSL Ubuntu | 本地 Linux 开发与运维学习 | 需要理解 Windows / Linux 文件边界 |

### 安装 WSL Ubuntu

介绍 Windows 版本要求、安装命令、Ubuntu 发行版选择和首次初始化用户。

### 文件系统边界

重点说明两条路径：

- Windows 文件路径：`/mnt/c/Users/...`
- WSL Linux 文件路径：`/home/ubuntu/...`

初学者建议把代码放在 WSL 的 Linux 文件系统中，减少权限、换行符和文件监听问题。

### 终端工具选择

推荐 Windows Terminal + WSL Ubuntu 组合，不建议把 Windows 的 `cmd` 当作主力开发终端。

### 与云服务器保持一致

说明 WSL Ubuntu 本地练习的命令，可以平滑迁移到云服务器 Ubuntu：`ssh`、`scp`、`apt`、`systemctl` 等命令心智更一致。

## 交付标准

读者完成本文后，应能：

1. 在 Windows 上安装并进入 WSL Ubuntu。
2. 明确 Windows 文件系统和 Linux 文件系统的边界。
3. 使用 WSL Ubuntu 作为学习 Linux 运维命令的主环境。
4. 为后续 SSH 登录云服务器、执行部署命令做好准备。

## 关联阅读

- [Linux 学习有无必要双系统？](linux-learn.md)
- [生产环境入门：部署到云服务器](../devops/foundation/production-env.md)
