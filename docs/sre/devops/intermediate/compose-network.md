---
title: 10 ｜ Compose 多服务与网络
description: 从宿主机到容器内，验证服务名、端口映射和网络边界。
date: 2026-09-09
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
---

## 从跑起来到解释连接路径

基础篇已运行过 Compose。本课开始使用独立练习目录 `delivery-demo`，逐步补齐部署细节：Nginx 提供页面，PostgreSQL 用于网络与数据实验。页面暂不查询数据库，数据库连通性用诊断命令验证，不把它当作已经实现的业务功能。

准备 Docker Engine + Compose v2，或 Docker Desktop；命令在 Bash 中运行。仅使用实验数据，端口 18080 需空闲。建立 `site/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>Delivery Demo</title>
<h1>delivery-demo v1</h1>
</html>
```

建立 `site/healthz`，内容一行：

```text
ok
```

## 先看一份完整的 Compose

保存到练习目录的 `compose.yaml`：

```yaml
name: delivery-demo
services:
  web:
    image: nginx:1.28-alpine
    ports:
      - "127.0.0.1:18080:80"
    volumes:
      - ./site:/usr/share/nginx/html:ro
    networks:
      - edge
      - backend
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: demo
      POSTGRES_USER: demo
      POSTGRES_PASSWORD: local-lab-only
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend
networks:
  edge: {}
  backend:
    internal: true
volumes:
  db-data:
```

实验密码只是为了初始化一次性练习库，不能用于生产。配置外置在第 12 课展开。第一课就显式声明数据卷，下一课通过重建与恢复实验解释它的作用。

```bash
docker compose config --quiet
docker compose up -d
docker compose ps
curl --fail http://127.0.0.1:18080/
```

如果刚启动时访问失败，先查看 `docker compose logs --tail=50 web db`，稍后重试。此时还未引入就绪等待，`up -d` 不能证明所有服务已经可用。

## 服务名、localhost 与端口

| 从哪里发起请求 | 目标地址 | 原因 |
| --- | --- | --- |
| 宿主机访问页面 | `127.0.0.1:18080` | 映射到 web 容器的 80 端口 |
| web 内访问自己 | `127.0.0.1:80` | localhost 指当前容器 |
| web 内访问数据库 | `db:5432` | 共享 backend 网络，使用服务名和容器端口 |
| 宿主机访问数据库 | 本例没有发布端口 | 不能用 localhost:5432 直接访问该容器服务 |

用容器内工具确认路径：

```bash
docker compose exec web wget -q -O - http://web/healthz
docker compose exec web nc -z -w 3 db 5432
docker compose exec web nc -z -w 3 127.0.0.1 5432
```

第一条返回 `ok`；数据库完成初始化后第二条成功；第三条应失败，因为 web 自己没有监听 5432。若第二条失败，用 `docker compose exec db pg_isready -U demo -d demo` 区分“数据库未就绪”和“地址不正确”。TCP 连通也不代表数据库认证或查询一定成功。

网络中使用服务名，不记录某次分配的容器 IP。容器重建后 IP 可能变化，应用需要处理旧连接断开与重连。`expose` 不能代替 `ports` 向宿主机发布端口，同网络通信也不要求显式写 `expose`。

## 网络边界怎么选

不显式声明 networks 时，Compose 会为项目创建默认网络，通常足以支持最初的开发实验。本例分成 edge 与 backend，是为了让数据库仅接入内部网络；web 同时连接两者。

`internal: true` 限制该网络的外部连接，不是数据库认证或权限控制的替代品。网络共享范围越大，可互访的服务越多。跨 Compose 项目共享网络时应明确需求，再考虑预创建网络并标记 `external: true`；不要为解决连不通就默认改用 host 网络。

## 失败排查与验收

- `port is already allocated`：检查 18080 是否被占用，更换宿主机端口，不改容器内部的服务端口。
- 服务名无法解析：查看两端是否共享网络，核对名称是 `db` 而非宿主机名。
- 能连端口但登录失败：检查用户、数据库和密码，继续看数据库日志。
- 远程电脑访问不到：本例只绑定回环地址；外部访问需要明确开放范围、认证和防火墙。

验收时分别记录宿主机访问、容器间连接以及错误 localhost 的结果。下一课继续使用同一个项目，验证数据与容器生命周期的关系。

参考：[Compose 网络](https://docs.docker.com/compose/how-tos/networking/)。
