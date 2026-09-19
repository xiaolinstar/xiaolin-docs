---
title: 08 ｜ 多服务容器编排：Docker Compose
description: 微服务进入生产后，使用 Docker Compose 把多服务拓扑、网络、存储和配置随源码提交管理；它是单机多容器应用的声明式部署终点，也让流水线回归版本交付与结果验证。
date: 2026-03-06
updated: 2026-07-17
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
  - IaC
---

05 篇解决了“一个容器怎么运行”，06 / 07 篇解决了“版本怎么构建、推送和触发”。但开发侧引入微服务后，一个应用往往会拆成网关、前端、API、数据库、缓存和消息队列，运维对象从 1 个变成多个。

逐条 `docker run` 仍然可以把它们启动起来，却会重新变成一套靠记忆维护的运维琐事：网络、端口、卷、环境变量、依赖顺序和重启策略散落在命令参数里。真正需要管理的不是“多敲几条命令”，而是**多个服务如何组成一个应用**。

这就是 Docker Compose：把应用的服务拓扑和期望状态写进 `compose.yaml`，随源码一起提交、Review 和版本管理。它和 Jenkinsfile / GitHub Actions 是同一套基础设施即代码思想的不同落点：

| | Jenkinsfile / Actions YAML | `compose.yaml` |
| --- | --- | --- |
| 声明的是 | **怎么构建与部署**（动作链） | **跑哪些服务、如何互联**（期望状态） |
| 写在哪 | 代码仓库 | 代码仓库 |
| 谁执行 | 流水线引擎 | `docker compose` CLI |
| 思想 | 运维左移 / IaC | 运维左移 / IaC |

对绝大多数开源项目来说，Compose 也是默认的自部署入口之一：项目把 `compose.yaml`、环境变量模板和启动说明随源码发布，用户只需准备 Docker，再按文档执行 `docker compose up -d`。因此 Compose 文件不是临时脚本，而是项目交付物的一部分。

## 从「一个容器」到「一个应用」

回顾 05 的最小闭环：

```bash
docker pull nginx:1.27-alpine
docker run -d --name my-nginx -p 80:80 nginx:1.27-alpine
```

真实项目通常不止一个进程。以「前端静态站 + 后端 API + 数据库」为例：

| 服务 | 作用 | 典型端口 |
| --- | --- | --- |
| Nginx | 公网入口、静态资源、反代 API | 80 / 443 |
| 应用（Spring Boot / Flask） | 业务 API | 8080（内部） |
| PostgreSQL | 持久化数据 | 5432（内部） |

用命令式写法，你要自己管网络、端口、卷、依赖顺序：

```bash
docker network create app-net

docker run -d --name db --network app-net \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

docker run -d --name api --network app-net \
  -e DB_URL=jdbc:postgresql://db:5432/app \
  your-registry/your-api:1.0.0

docker run -d --name gateway --network app-net \
  -p 80:80 \
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:1.27-alpine
```

再加监控（Prometheus / Grafana / Loki）就是 6～8 条命令。问题立刻暴露：

- **参数散落**：漏一个 `-v` / `-e` 就启动失败，且难复现
- **顺序靠人记**：API 依赖 DB 就绪，谁保证？
- **清理靠人记**：`stop` + `rm` 漏一个就成孤儿容器
- **无法版本管理**：一坨 shell，没法 Code Review

这和 02 篇「手动备份像错题本」、05 篇「服务器变脏」是同一类运维痛点——**动作靠记忆，状态不可声明**。

## Compose 的本质：声明应用拓扑与期望状态

`docker run` 是**命令式**：你告诉系统每一步怎么做。

`docker-compose.yml` 是**声明式**：你描述期望状态，由 Compose 把实际状态收敛过去。

可以把几种工具的职责分开理解：

| 层次 | 解决的问题 |
| --- | --- |
| Docker Image | 服务运行什么 |
| Container | 服务运行实例 |
| Docker Compose | 多个服务如何组成一个应用 |
| Jenkinsfile / GitHub Actions | 什么时候构建、推送和部署 |
| Kubernetes | 多机调度、弹性扩缩和故障自愈 |

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    image: your-registry/your-api:1.0.0
    environment:
      DB_URL: jdbc:postgresql://db:5432/app
    depends_on:
      - db

  gateway:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api

volumes:
  pgdata:
```

日常只需要：

```bash
docker compose up -d      # 创建网络、拉镜像、按依赖启动
docker compose ps         # 看状态
docker compose logs -f    # 看日志
docker compose down       # 停掉并清理容器与网络（卷默认保留）
```

`depends_on` 默认只保证启动顺序，不保证数据库已经可以接受连接。生产配置应为依赖服务增加 `healthcheck`，并让应用自身具备连接重试能力；容器显示 `Up`，不代表应用已经真正就绪。

对比：

| 维度 | 手动 `docker run` | Docker Compose |
| --- | --- | --- |
| 配置管理 | 散落在命令行 | YAML 进 Git，可追溯 |
| 启动方式 | 逐个敲，记依赖顺序 | 一条命令，`depends_on` 声明顺序 |
| 环境一致性 | 每次手敲易错 | 同一份 YAML 本地 / 测试 / 生产同构 |
| 停止清理 | 逐个 `stop` + `rm` | `docker compose down` |
| 团队协作 | 靠文档或口口相传 | `clone` + `compose up` 即可复现 |

Compose 文件通常命名为 `compose.yaml`；`docker-compose.yml` 是历史命名，现代 Docker Compose 仍兼容它。

## 本站级示例：多服务可观测性栈

上面是「应用三件套」的最小模型。本仓库实际用 Compose 编排了网关、站点与可观测性套件（示意结构）：

| 服务 | 作用 |
| --- | --- |
| Nginx 网关 | 反向代理、入口 |
| VitePress 站点 | 文档站容器 |
| Prometheus / Grafana | 指标与面板 |
| Loki + Promtail | 日志采集与存储 |

完整 YAML 可随项目仓库版本管理——**新人不必背命令，只需读文件**。这正是 07 篇说的「运维左移」：上线拓扑从某个人脑子里，变成仓库里的显性代码。

> 生产密钥不要写进 YAML 明文。用 `.env`（加入 `.gitignore`）或密钥管理注入；YAML 里只写 `${POSTGRES_PASSWORD}` 这类引用。

## Compose 如何把流水线打薄

Compose **不替代**流水线，而是把“容器应用如何部署”从流水线脚本中抽离出来，成为流水线调用的**部署动作载体**：

```text
git push
  → CI 构建镜像并推仓库（06 / 07）
  → CD 在服务器上：git pull（拿到最新 compose）→ docker compose pull → docker compose up -d
```

服务器仍然可以**只装 Docker**——不装 `mvn` / `pip`，由 Dockerfile 和 Compose 在服务器上完成构建。这就是 **Build in Server**：适合个人项目、开源项目和单机小规模部署，源码到服务器后执行 `docker compose up --build -d` 即可。规模扩大后，再切换为 CI 构建镜像、服务器只执行 `pull + up`，以减少生产机资源消耗并提高构建可追溯性。

因此，流水线有两种合理形态：Build in Server 模式下，流水线主要负责更新源码、触发 `docker compose up --build` 和验证结果；CI Build 模式下，流水线负责构建并推送镜像，服务器只执行 `docker compose pull` 和 `docker compose up -d`。两种模式都由 Compose 负责服务拓扑和生命周期，差别在于镜像在哪里构建。

Build in Server 的代价也需要明确：构建会消耗生产机的 CPU、内存和磁盘，构建结果还可能受服务器环境影响；当需要多环境复用、构建审计、快速回滚或减少生产资源争抢时，应切换到 CI Build。

部署前建议先检查最终配置，再执行变更：

```bash
docker compose config
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100
```

## 单机多服务部署的终点与边界

| 场景 | 建议 |
| --- | --- |
| 个人 / 中小项目，单机部署或多台机器分别独立部署 | **Compose 足够**——单机多服务部署的终点 |
| 数十服务、多节点、弹性扩缩 | 再考虑 K3s / Kubernetes |
| 多区域容灾、灰度发布 | Service Mesh / GitOps（进阶篇） |

**掌握 Compose + 前面 01–07，已经能覆盖绝大多数中小型项目的单机部署工作。** 这也是基础篇把 Compose 放在最后一篇的原因：它把“可移植性 + 声明式 + 多服务”收成一个可落地的闭环。Compose 是单机、多容器应用的部署终点，但不是多机集群的调度方案。

## 小结

Docker Compose 把 05 的单容器能力扩展为**多服务期望状态**：一份 YAML、一条 `up`、一键 `down`。它与 Jenkinsfile / Actions YAML 同属 IaC——区别只是声明对象不同（拓扑 vs 动作链）。

下一步进入 [第 09 篇 · 基础篇总结](./foundation-summary.md)：回顾 01–08 的范式跃迁、能力清单，以及「够用」与「还差得远」的边界。

## 思考

1. `docker-compose.yml` 应该提交到 Git 吗？里面有数据库密码时怎么处理？
2. `depends_on` 能保证依赖服务「已就绪」吗？MySQL 容器 `Up` 了但还在初始化，应用连库会怎样？
3. 单机小项目为什么可以选择在生产机执行 `docker compose up --build`？当构建耗时、服务器资源或团队规模上升后，什么时候应该切换到「CI 构建镜像 + 服务器 `compose pull && up`」？

## 参考

1. [Docker Compose 官方文档](https://docs.docker.com/compose/)
2. [Compose 文件规范](https://docs.docker.com/compose/compose-file/)
3. [Compose CLI 参考](https://docs.docker.com/compose/reference/)
