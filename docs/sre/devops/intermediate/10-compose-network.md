---
title: 10 ｜ Compose 多服务与网络
description: 单机跑多个项目时，服务名冲突、端口稀缺、网络栈共享会一起爆发。本篇从真实痛点出发，讲清楚 Docker 网络命名空间与 Compose 的对应物，以及怎么切分才不出乱子。
date: 2026-09-09
updated: 2026-09-13
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
  - 网络命名空间
---

基础篇 08 篇简单介绍了 docker-compose 的基本能力——多容器编排、`up` / `down` / `ps` / `logs` / `healthcheck`，已经能把一个项目跑起来。

但**跑起来 ≠ 搞明白**。

08 篇的链路能跑通，是因为它默认行为刚好够用：

```text
compose.yaml 随源码提交
        ↓
docker compose up --build -d
        ↓
docker compose ps / logs / healthcheck
```

当一台服务器只跑**一个**项目时，服务名解析、端口暴露、`localhost` 的语义，你不去想它也对——Docker 替你兜住了。但**真要使用容器，尤其是多容器编排，网络问题必须搞明白**，否则：

- 容器之间靠什么互相找到（`localhost` 是谁？）
- 端口怎么映射到宿主机、为什么会有「端口已占用」
- 对外暴露什么、内部隐藏什么，边界怎么划
- 单机跑多个 Compose 项目时怎么避免串味

这些问题 08 篇没展开——它属于「会用 docker-compose 之后**仍然必须**弄清楚的基础知识」，不是高级内容。本篇就把这些一次性讲清楚。

你有一台 2C4G 的服务器，跑着三套独立 Compose：

- `delivery-demo`：博客 + PostgreSQL
- `nocodb`：开源在线表格工具，自带 PostgreSQL
- `uptime-kuma`：监控告警，自带 SQLite

现在你想给博客加一个 Redis 缓存，顺手给 `nocodb` 也加一个共用 Redis。三件事开始同时出错：

| 故障现象 | 你第一反应 | 真正原因 |
|---|---|---|
| `docker compose up` 报 `port is already allocated` | "8080 被占了，换个端口" | 多个项目默认网络栈重叠，容器端口 8080 已经被另一个项目的容器占走 |
| `delivery-demo` 里的 `app` 容器连不上 `db` | "PG 没起来？重启一下" | 两个项目都有叫 `db` 的服务，DNS 解析**随机指向**其中一个 |
| `nocodb` 容器里 `curl localhost:9000` 不通 | "配置文件写错了？" | `localhost` 在容器里指**容器自己**的 127.0.0.1，不是你宿主机的 9000 |
| 项目 A 把 `/etc/hosts` 改了，项目 B 也跟着变了 | "这怎么可能？" | 它们共用同一个网络命名空间，某些隔离未生效 |

**根因一句话**：这三套 Compose 默认被扔进了**同一个网络命名空间**（network namespace），你的进程在该共享栈里彼此干扰。

## 网络命名空间：被混用的隔离边界

Linux 把「网络栈」当一类资源，通过 namespace 隔离。Docker 的网络底层就是借用这套机制：

| 隔离对象 | Linux 概念 | Docker / Compose 对应 |
|---|---|---|
| 网卡、IP、路由、`/etc/hosts`、端口 | Network namespace | Docker network |
| 进程 ID 视图 | PID namespace | Docker 默认隔离 |
| 主机名 | UTS namespace | container hostname |
| 文件系统挂载点 | Mount namespace | volume / bind mount |

Docker **进程**默认就被 PID / UTS / Mount 隔开了——所以一个容器里的进程看不到宿主机和其他容器的进程。但**网络 namespace 默认是「按需创建并加入」**，不是「自动全隔离」。

「Compose 网络」这节课的本质，不是讲 Compose API，而是回答：

> **当一台服务器跑多个 Compose 项目，或者一个 Compose 项目里跑多组该互相隔离的服务时，网络命名空间应该怎么切？**

默认行为为什么一开始能用？基础篇只有一个项目、一个网络，容器之间靠服务名互通，完全没问题——因为「这一坨」**就该**共享。

问题是「这一坨」的边界**被默认设置得过宽**：多个不该互通的项目混在了一起。

## Docker 原生网络模式：四种 driver 各管一类场景

理解了「namespace 是隔离边界」，再回头看 Docker 给容器接网络时提供了哪几种方式。`docker network ls` 列出的网络都带一个 `DRIVER`，这才是 Docker 区分网络类型的真正维度：

```bash
$ docker network ls
NETWORK ID     NAME                DRIVER    SCOPE
abc123...      bridge              bridge    local
def456...      host                host      local
ghi789...      none                null      local
delivery-demo_backend  bridge    local       # Compose 创建的
delivery-demo_default  bridge    local       # Compose 自动创建的默认网桥
```

四种 driver 各自承担一类网络拓扑：

| Driver | 隔离边界 | 容器视角 | 适用场景 |
|---|---|---|---|
| **bridge**（默认） | 容器有独立 namespace，通过 Linux bridge（veth pair + iptables NAT）与宿主机 / 其他容器通信 | 看到一张独立网卡 `eth0`，IP 在 bridge 子网里 | 单机多容器，90% 场景 |
| **host** | **不创建** namespace，容器直接用宿主机网络栈 | 容器进程 = 宿主机进程，`localhost` 就是宿主机的 | 高性能网络监听（如 Prometheus 抓取）、端口 80 占用规避的反模式 |
| **none** | 创建 namespace 但不接任何网卡 | 容器只有 `lo`，没有外部网络 | 批处理任务、CI 单步运行、网络安全完全隔离 |
| **user-defined bridge**（推荐） | 同 bridge，但提供 **DNS 服务名解析** + 更好的隔离 + 可配置子网 | 同 bridge | 任何跨容器通信的场景——`docker network create` 创建，Compose 全部用这种 |

**最关键的差异**：默认 `bridge` 桥上的容器**只能通过 `--link`（已废弃）或 IP 互通**；`user-defined bridge` **自动提供 DNS 服务名解析**。这是「为什么 Compose 必须显式声明 `networks:`」的根本原因——Compose 强制走 user-defined bridge。

### `<project>_default`：Compose 自动创建的那张桥

这正是关键事实。Compose 不显式声明 `networks:` 时，会自动创建一个 `user-defined bridge`，命名规则是：

```text
<project-name>_default
```

- `project-name` 默认取 `compose.yaml` 所在**目录名**，除非 `compose.yaml` 顶部 `name: xxx` 显式覆盖
- `delivery-demo/` 目录下的 compose 默认建 `delivery-demo_default`
- 多个项目（不同目录）默认**互不串味**——各自有独立的 `<dir>_default` 桥

验证这个事实：

```bash
cd delivery-demo/
docker compose up -d
docker network ls | grep delivery-demo
# 应该看到：
# delivery-demo_default   bridge    local
# delivery-demo_backend   bridge    local  （显式声明的那个）
```

`delivery-demo_default` 和你自己声明的 `delivery-demo_backend` 是**两张独立的 user-defined bridge**——容器之间只能通过 `docker run --network=xxx` 显式接入才能跨桥通信。

这就是「单机多项目为什么不会默认串味」的物理基础：**每个项目各有一张独立的桥，桥与桥之间默认不通**。你之前踩的 `port is already allocated` 是因为**端口映射到宿主机**（共用宿主机的网络栈），不是桥之间串了。

### 显式声明 networks：比「让它自动」多一层控制

理解了底层之后，显式声明 `networks:` 的价值从「看上去一样」变成「可控的拓扑编辑」：

| 显式声明能做的事 | 默认 `default` 做不到 |
|---|---|
| 给网络起人类可读的名字（`edge` / `backend`） | 只能用 `<project>_default` |
| 让数据库进 `internal: true`（无外网出口） | 默认桥带 NAT，可访问外网 |
| 多个服务进不同网络，实现「分层网络拓扑」 | 所有服务只能进同一张桥 |
| `external: true` 引用其他项目预创建的网络 | 默认只能引用本项目内的桥 |
| 自定义子网 / 网关 / IP 范围 | 默认由 Docker 自动分配 |

所以，本课示例里把 `backend` 显式声明为 `internal: true`，是为了让数据库无法访问外网——这件事用默认的 `delivery-demo_default` 做不到。

## Compose 网络的最小可用形态

理解了 namespace 这一层，Compose 提供的工具就清晰了——它们都是「给 namespace 命名 / 切分 / 显式连通」的操作。

### 一个最小可解释的 Compose

```yaml
name: delivery-demo
services:
  api:
    image: my-api:1.0
    networks:
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
  backend: {}
volumes:
  db-data:
```

`networks:` 段显式声明 `backend` 这个网络，所有服务都加入它——和默认行为看上去一样，**但意义完全不同**：显式声明是为了让你**意识到**这一坨属于同一个 namespace。

### 服务名 vs IP vs localhost

| 起点 | 目标地址 | 真实路径 |
|---|---|---|
| 宿主机 → API | `127.0.0.1:8080`（需 `ports:` 映射） | Docker 走端口映射到容器 80 |
| API 容器 → DB | `db:5432` | Docker 内置 DNS，服务名解析为容器 IP |
| API 容器 → 自己 | `127.0.0.1:80` | localhost 指**容器自己的**网络栈 |
| 宿主机 → DB | **没有 `ports:` 直接连不上** | 容器端口不暴露，需通过 API 中转或加映射 |

两条最常踩的坑：

- 容器内 `localhost` ≠ 宿主机 `localhost`（后者是宿主机的 127.0.0.1）
- 容器内 `localhost` ≠ 同网络里其他容器的 `localhost`（指容器自己）

容器之间的连接，**永远用服务名**（假设在同一网络）或显式 IP，**永远不用 localhost**。

## 网络边界的三种典型场景

### 单项目内的内外网分离

把数据库放进 `internal: true` 的网络，只让 API 进内网：

```yaml
services:
  web:
    image: nginx:1.28-alpine
    ports:
      - "127.0.0.1:18080:80"
    networks:
      - edge
      - backend
  api:
    image: my-api:1.0
    networks:
      - backend
  db:
    image: postgres:16-alpine
    networks:
      - backend
volumes:
  db-data:
networks:
  edge: {}
  backend:
    internal: true    # 没有外部出口，容器无法访问外网
```

`internal: true` 的作用：禁止该网络里的容器访问外网。数据库没必要访问公网——这是减小攻击面的最小动作。

### 多项目共存：不让它们串味

第二个项目 `nocodb` 想用同一台机器，你怎么避免它和 `delivery-demo` 撞车？

**核心原则**：每个项目独立 network，**绝不**让两个项目的容器进同一个网络。

```bash
# 各自的网络会自动创建
delivery-demo_backend
nocodb_default
```

跨项目调用怎么办？**不要**为了连通就合网络。正确做法：

| 跨项目需求 | 解法 |
|---|---|
| 共享 MySQL / Redis | 单独起一个 Compose 项目跑共享服务，其他项目用 `external: true` 引用 |
| `delivery-demo` 想调 `nocodb` 的 API | 通过宿主机端口（`127.0.0.1:port`）或反代 |
| 监控采集多项目容器 | Prometheus 用 `docker.sock` 或 cAdvisor，不走应用网络 |

**反模式**：「连不通就把 network mode 改成 host」——这是把 namespace 隔离整个拆掉，所有端口回到宿主机全局命名空间，所有问题都回来了。

### 端口稀缺资源规划

80、443 是稀缺端口，被多个项目抢时：

| 方案 | 适用 |
|---|---|
| 反代统一入口（Nginx / Caddy） | 对外服务集中，推荐 |
| 每个项目分配不同外部端口 | 内部工具、自部署 |
| 只绑 `127.0.0.1`，对外通过反代 | 服务器上所有内部端口默认绑回环地址 |

**经验值**：服务器上每个 Compose 项目对外只暴露 1-2 个端口，通过反代按域名分发，内部全靠服务名通信。

## 命令验证：把「应该这样」变成「确实这样」

光说「服务名能解析」还不够，12 课会展开配置来源，本课先验证网络拓扑本身。

### 启动与基础检查

```bash
docker compose config --quiet
docker compose up -d
docker compose ps
docker network ls | grep delivery-demo
docker network inspect delivery-demo_backend
```

`inspect` 会告诉你：

- 这个网络里挂了哪些容器
- 子网段（`172.20.0.0/16` 之类）
- 是否 `internal: true`（有没有默认网关）

### 服务名 vs localhost vs IP

```bash
# 容器之间通过服务名互通
docker compose exec api wget -q -O - http://api/healthz
docker compose exec api nc -z -w 3 db 5432

# 容器内 localhost 指自己，不是其他容器，也不是宿主机
docker compose exec api nc -z -w 3 127.0.0.1 5432    # 失败：api 没监听 5432
docker compose exec db  nc -z -w 3 127.0.0.1 5432    # 成功：db 自己在 5432

# 容器重建后 IP 可能变化，应用不能写死 IP
docker compose up -d --force-recreate api
docker network inspect delivery-demo_backend | grep IPv4Address
```

**验证要点**：服务名解析在容器重建后仍然有效——这是应用不应该缓存 IP 的根因。

### 排错清单

| 现象 | 排查路径 |
|---|---|
| `port is already allocated` | `ss -tlnp \| grep :端口` 看谁占用，改宿主机端口或停掉冲突项目 |
| 服务名解析失败 | `docker network inspect` 看服务是否在同一网络，服务名是否拼对 |
| 容器内 `localhost` 不通 | 检查是不是把其他容器的地址误写成 `localhost` |
| 数据库连得上但认证失败 | 网络没问题，继续看 12 课配置来源 |
| `internal: true` 网络访问外网超时 | 这是预期行为，不是 bug |

## 这条线以后怎么走

本篇解决了「容器之间怎么找到彼此」的最小问题，但留下了三个**故意不展开**的伏笔：

- **`db-data` 是个 named volume**——容器删了数据还在吗？`docker compose down -v` 会发生什么？这是 [11 篇 数据持久化](11-compose-storage.md) 要拆的：**有状态应用和无状态应用在运维上是两个物种**，数据库不能像 API 一样随便重启。
- **数据库密码 `POSTGRES_PASSWORD: local-lab-only` 是写死在 `compose.yaml` 里的**——这只是实验值，真实密钥要外置。这是 [12 篇 Dockerfile 与构建期配置](12-environment-build.md) + [13 篇 Compose 运行期配置与环境区分](13-environment-runtime.md) 要拆的：`ARG` / `ENV` / `.env` / `secrets:` 的边界。
- **`docker compose up -d` 不能证明服务已经可用**——只证明进程启动了。数据库要初始化、API 要加载配置、依赖服务要等先后就绪。这是 [15 篇 健康检查与启动依赖](15-compose-health.md) 要拆的：**就绪 ≠ 启动**。

读完 10-15 篇，你应该能**解释当前环境跑的镜像、配置来源、数据库 schema 版本**，而不是只看到「进程在跑」。

## 参考

- [Compose 网络](https://docs.docker.com/compose/how-tos/networking/)
- [Linux network namespace](https://man7.org/linux/man-pages/man7/network_namespaces.7.html)
- [Compose 项目命名与 `name:` 字段](https://docs.docker.com/compose/project-name/)
