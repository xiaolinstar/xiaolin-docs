---
title: 08 ｜ 多服务容器编排：Docker Compose
description: 把 05 的单容器命令式用法升级为多服务声明式编排；一份 YAML 描述期望状态，与 Jenkinsfile 同属 IaC 思想，作为 DevOps 基础篇收口。
date: 2026-03-06
updated: 2026-07-17
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
  - IaC
---

05 篇用五条命令把**一个**容器跑起来了；06 / 07 篇把操作写成了声明式流水线（Jenkinsfile / GitHub Actions YAML）。这一篇把两件事合在一起：

> **当服务从 1 个变成 3 个、5 个时，逐条 `docker run` 也会变成另一套「靠记忆的运维琐事」——需要一份声明式文件，把多容器的期望状态写进仓库。**

这就是 Docker Compose。它和 Jenkinsfile 是同一思想的两种落点：

| | Jenkinsfile / Actions YAML | `docker-compose.yml` |
| --- | --- | --- |
| 声明的是 | **怎么构建与部署**（动作链） | **跑哪些服务、如何互联**（期望状态） |
| 写在哪 | 代码仓库 | 代码仓库 |
| 谁执行 | 流水线引擎 | `docker compose` CLI |
| 思想 | 运维左移 / IaC | 运维左移 / IaC |

## 从「一条 docker run」到「八条 docker run」

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

## 声明式：描述「要什么」，而不是「怎么做」

`docker run` 是**命令式**：你告诉系统每一步怎么做。

`docker-compose.yml` 是**声明式**：你描述期望状态，由 Compose 把实际状态收敛过去。

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

对比：

| 维度 | 手动 `docker run` | Docker Compose |
| --- | --- | --- |
| 配置管理 | 散落在命令行 | YAML 进 Git，可追溯 |
| 启动方式 | 逐个敲，记依赖顺序 | 一条命令，`depends_on` 声明顺序 |
| 环境一致性 | 每次手敲易错 | 同一份 YAML 本地 / 测试 / 生产同构 |
| 停止清理 | 逐个 `stop` + `rm` | `docker compose down` |
| 团队协作 | 靠文档或口口相传 | `clone` + `compose up` 即可复现 |

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

## 与流水线怎么配合

Compose **不替代**流水线，而是流水线的**部署动作载体**：

```text
git push
  → CI 构建镜像并推仓库（06 / 07）
  → CD 在服务器上：git pull（拿到最新 compose）→ docker compose pull → docker compose up -d
```

服务器仍然**只装 Docker**——不装 `mvn` / `pip`，不在生产机构建（除非你明确用 `compose up --build`，那会把 04 的「脏 / 资源」痛点请回来）。推荐路径是：**CI 出镜像，服务器只 pull + up**。

## 边界：Compose 够用到哪一步

| 场景 | 建议 |
| --- | --- |
| 个人 / 中小项目，单机或少数机器 | **Compose 足够**——基础篇终点 |
| 数十服务、多节点、弹性扩缩 | 再考虑 K3s / Kubernetes |
| 多区域容灾、灰度发布 | Service Mesh / GitOps（进阶篇） |

**掌握 Compose + 前面 01–07，已经能覆盖绝大多数中小型项目的运维工作。** 这就是基础篇把 Compose 放在最后一篇的原因——不是因为它最难，而是因为它把「可移植性 + 声明式 + 多服务」收成一个可落地的闭环。

## 小结

Docker Compose 把 05 的单容器能力扩展为**多服务期望状态**：一份 YAML、一条 `up`、一键 `down`。它与 Jenkinsfile / Actions YAML 同属 IaC——区别只是声明对象不同（拓扑 vs 动作链）。

下一步进入 [第 09 篇 · 基础篇总结](./foundation-summary.md)：回顾 01–08 的范式跃迁、能力清单，以及「够用」与「还差得远」的边界。

## 思考

1. `docker-compose.yml` 应该提交到 Git 吗？里面有数据库密码时怎么处理？
2. `depends_on` 能保证依赖服务「已就绪」吗？MySQL 容器 `Up` 了但还在初始化，应用连库会怎样？
3. 为什么推荐「CI 构建镜像 + 服务器 `compose pull && up`」，而不是在生产机 `compose up --build`？

## 参考

1. [Docker Compose 官方文档](https://docs.docker.com/compose/)
2. [Compose 文件规范](https://docs.docker.com/compose/compose-file/)
3. [Compose CLI 参考](https://docs.docker.com/compose/reference/)
