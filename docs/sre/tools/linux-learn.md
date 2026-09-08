---
title: Linux 学习有无必要双系统？
description: 我认为完全不需要在个人电脑上安装 Linux 双系统。
date: 2026-01-01
updated: 2026-01-01
category: 效率工具
tags:
  - Linux
---


我认为完全不需要在个人电脑上安装 Linux 双系统。作为一名计算机专业本硕7年学生，推荐路线如下：

1. 小白学习阶段，使用 VMWare 虚拟机，核心诉求是**方便**，主要学习使用Linux操作系统核心知识如 shell 指令；
2. 使用操作系统原生能力，追求轻量化
   - MacOS：入坑 Mac 系统，具备与 Linux 同款的 Unix Shell
   - Windows：WSL（Windows Subsystem for Linux），在 Windows 上随时启动，少量占用磁盘和内存资源
3. 本地 Docker Desktop + 云服务器，Linux 操作系统作为软件系统部署环境。个人开发使用 Windows 或 Mac 即可。

唯一需要在个人电脑上安装 Linux 双系统的场景是 CUDA 深度学习。然而，即使是这种场景，我也是不太推荐的，可以租用带 GPU 的云服务器，按小时收费，非常方便。

---

对于学生党，我非常推荐购买腾讯云与阿里云，一年的轻量服务器百元以内搞定，用于个人学习、部署小型软件足够了。

有更多问题可在评论区或聊天框咨询，欢迎大家使用我的推荐码，可以获得新用户优惠。

[Tencent Cloud，云产品福利专区](https://cloud.tencent.com/act/cps/redirect?redirect=2446&cps_key=aaaf112808363649bce6cd8e70ae6fbd&from=console)

[Alibaba Cloud，上云优选，普惠权益](https://www.aliyun.com/benefit?userCode=d1pmxxar)

## Mac 终端必备工具

苹果笔记本电脑 MacOS 操作系统兼具了图形化界面的便利性，同时支持强大的 Unix-like 终端指令，非常适合计算机相关专业学生或工作者。

推荐一些可以增强 shell 使用效率的工具：

- [Homebrew](https://brew.sh/)：MacOS 上的包管理器，方便安装和管理命令行工具
- [iTerm2](https://iterm2.com/)：功能强大的终端模拟器，支持分屏、标签页、自定义主题等
- [zsh](https://www.zsh.org/)：Unix Shell，比默认的 bash 更加强大，支持插件和主题，MacOS 默认使用 zsh
- [oh-my-zsh](https://ohmyz.sh/)：zsh 的配置框架，提供了丰富的插件和主题，方便自定义

推荐一个Ubuntu 下安装 zsh 及各类插件的博文：[Ubuntu 命令行安装 zsh、oh-my-zsh、插件以及相关配置](https://convivae.top/posts/ubuntu-ming-ling-xing-an-zhuang-zsh-oh-my-zsh-cha-jian-yi-ji-xiang-guan-pei-zhi/)