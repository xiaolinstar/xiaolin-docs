---
title: 一站式开发环境
description: 操作系统：ubuntu 22.04
date: 2025-03-17
updated: 2025-03-17
category: SRE 运维
tags: []
---

# 一站式开发环境

操作系统：ubuntu 22.04

## Docker & Docker Compose

1. 当使用 `docker ps` 等命令时，提示没有权限，需要使用 `sudo docker ps` 执行，如何添加普通用户权限？

将当前用户添加到 docker 组

```shell
sudo usermod -aG docker $USER
```

**重新登录** 为了让更改生效，你需要重新登录系统。你可以注销当前会话并重新登录，或者使用以下命令重新加载组权限：

```shell
newgrp docker
```

再次查看 docker 权限

```shell
docker ps
```
