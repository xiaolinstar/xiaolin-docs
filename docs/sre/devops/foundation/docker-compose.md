---
title: 07 ｜ 多服务容器编排：Docker Compose
description: 从单容器部署过渡到多服务协作，理解声明式 API 的核心理念，用 Docker Compose 一键编排 Nginx、应用与可观测性套件。
date: 2026-03-06
updated: 2026-07-13
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
---

上一篇文章，我们用 Docker 把静态站点打包成容器镜像，实现了「到哪都能跑」。但那只涉及**一个容器**——一个 Nginx，一个站点。

真实项目通常不止一个服务：应用需要 Nginx 做反向代理，Nginx 需要配置文件，监控需要 Prometheus、Grafana、Loki……当容器数量增长到 5 个、8 个、10 个时，逐个执行 `docker run` 就变得不可维护了。

这篇文章要解决的问题是：**多个容器如何一键启动、一键停止、统一管理？**

## 从一个容器到多个容器

回顾上一篇的部署流程：

```bash
docker build -t my-site .
docker run -d -p 80:80 my-site
```

一个命令，一个容器，跑通了。但如果项目需要同时运行以下服务：

| 服务 | 作用 |
| --- | --- |
| Nginx 网关 | 反向代理、负载均衡 |
| VitePress 站点 | 你的文档网站 |
| Prometheus | 指标采集 |
| Grafana | 可视化面板 |
| Loki + Promtail | 日志收集 |

用 `docker run` 逐个启动，你需要：

```bash
# 创建网络
docker network create my-network

# 启动 VitePress 站点
docker run -d --name vitepress-website --network my-network \
  -v ./volumes/website/logs:/var/log/nginx \
  -e TZ=Asia/Shanghai \
  xiaolinstar/xiaolin-docs:0.0.1

# 启动 Nginx 网关
docker run -d --name nginx-gateway --network my-network \
  -p 80:80 \
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf \
  nginx:alpine3.20-perl

# 启动 Prometheus
docker run -d --name prometheus-website --network my-network \
  -v ./volumes/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -e TZ=Asia/Shanghai \
  prom/prometheus:v2.53.3 \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus

# 启动 Grafana
docker run -d --name grafana-website --network my-network \
  -p 9000:3000 \
  -v ./volumes/grafana/grafana.ini:/etc/grafana/grafana.ini:ro \
  -e TZ=Asia/Shanghai \
  -e GF_AUTH_ANONYMOUS_ENABLED=true \
  grafana/grafana:11.3.2-ubuntu

# 还有 Loki、Promtail、node-exporter、nginx-exporter……
```

问题立刻暴露出来：

- **命令长、参数多**：每个容器的端口、网络、挂载卷、环境变量都要手动指定，漏一个参数就启动失败。
- **启动顺序要人工维护**：Promtail 依赖 Loki，Loki 要先启动。谁来记住这个顺序？
- **停止和清理麻烦**：要逐个 `docker stop` + `docker rm`，漏掉一个就成了孤儿容器。
- **无法版本管理**：一坨 shell 命令，没法提交到 Git，团队无法复现。

8 个容器就是 8 条 `docker run`，每条十几个参数。繁琐是一方面，出差错才是致命的。

## 声明式 API

上述问题的根源在于：`docker run` 是**命令式 API**——你必须告诉系统「怎么做」，每一步都由你手动执行。

与之对应的是**声明式 API**（Declarative API），你只需描述「要什么」，系统自动将实际状态收敛到期望状态。

这个概念并非 Docker Compose 独创，它是云原生的核心理念。以下按领域对比两种范式：

| 领域 | 命令式（Imperative） | 声明式（Declarative） |
| --- | --- | --- |
| **容器** | `docker run`、`docker stop` 逐条执行 | `docker-compose.yml` 描述期望状态 |
| **基础设施** | Shell 脚本一步步安装配置 | Terraform HCL 描述基础设施 |
| **Kubernetes** | `kubectl run`、`kubectl scale` 手动操作 | Deployment YAML 声明副本数，控制器自动调和 |
| **数据库** | 手写遍历、连接、过滤逻辑 | SQL 查询 `SELECT * FROM users WHERE age > 18` |
| **前端** | jQuery 手动操作 DOM | Vue/React 模板声明 UI 结构 |

声明式的本质是：**配置即代码**。你把期望状态写在一个文件里，这个文件可以提交到 Git、可以 Code Review、可以在任何环境复现。

Docker Compose 的 `docker-compose.yml` 就是容器编排领域的声明式 API。

## Docker Compose 实践

Docker Compose 通过一个 YAML 文件定义所有服务、网络、卷等资源，一条命令启动整个应用栈。

### 编写 docker-compose.yml

以本项目为例，8 个容器服务的完整编排：

```yaml
networks:
  tiny-sparrow-network:
    external: false
services:
  # 软负载
  nginx-gateway:
    image: nginx:alpine3.20-perl
    container_name: nginx-gateway
    ports:
      - "80:80"
    networks:
      - tiny-sparrow-network
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf

  # VitePress 静态网站
  vitepress-website:
    image: xiaolinstar/xiaolin-docs:0.0.1
    build: ./
    container_name: vitepress-website
    volumes:
      - ./volumes/website/logs:/var/log/nginx
    networks:
      - tiny-sparrow-network
    environment:
      TZ: Asia/Shanghai

  # Grafana
  grafana-website:
    image: grafana/grafana:11.3.2-ubuntu
    container_name: grafana-website
    networks:
      - tiny-sparrow-network
    ports:
      - "9000:3000"
    volumes:
      - ./volumes/grafana/grafana.ini:/etc/grafana/grafana.ini:ro
      - ./volumes/grafana/provisioning/etc/datasources:/etc/grafana/provisioning/datasources:ro
      - ./volumes/grafana/provisioning/etc/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./volumes/grafana/provisioning/var/dashboards:/var/lib/grafana/dashboards:ro
    environment:
      TZ: Asia/Shanghai
      GF_AUTH_ANONYMOUS_ENABLED: true
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
      GF_USERS_ALLOW_SIGN_UP: false

  # Prometheus
  prometheus-website:
    image: prom/prometheus:v2.53.3
    container_name: prometheus-website
    volumes:
      - ./volumes/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    environment:
      TZ: Asia/Shanghai
    networks:
      - tiny-sparrow-network
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"

  # node-exporter（仅支持 Linux，host 模式）
  node-exporter-website:
    image: prom/node-exporter:v1.8.2
    container_name: node-exporter-website
    environment:
      TZ: Asia/Shanghai
    network_mode: host
    pid: host
    volumes:
      - '/:/host:ro,rslave'
    command:
      - '--path.rootfs=/host'

  # nginx-prometheus-exporter
  nginx-exporter-website:
    image: nginx/nginx-prometheus-exporter:1.4
    container_name: nginx-exporter-website
    environment:
      TZ: Asia/Shanghai
    networks:
      - tiny-sparrow-network
    command: "--nginx.scrape-uri=http://vitepress-website:8081/stub_status"

  # Promtail（日志采集 → Loki）
  promtail-website:
    image: grafana/promtail:3.4
    container_name: promtail-website
    volumes:
      - ./volumes/promtail/promtail.yaml:/etc/promtail/promtail.yaml:ro
      - ./volumes/website/logs:/var/log
    environment:
      TZ: Asia/Shanghai
    networks:
      - tiny-sparrow-network
    command:
      - "--config.file=/etc/promtail/promtail.yaml"
    depends_on:
      - loki-website

  # Loki（日志存储）
  loki-website:
    image: grafana/loki:3.4
    container_name: loki-website
    ports:
      - "3100:3100"
    volumes:
      - ./volumes/loki/loki-local-config.yaml:/etc/loki/local-config.yaml:ro
    environment:
      TZ: Asia/Shanghai
    networks:
      - tiny-sparrow-network
    command:
      - "--config.file=/etc/loki/local-config.yaml"
```

对比前面的 8 条 `docker run`，一个 YAML 文件把所有信息集中在一起：哪些服务、用什么镜像、挂载什么目录、暴露什么端口、依赖谁——一目了然。

### 核心指令

项目配置完成后，日常操作只需要三条命令：

```bash
# 构建镜像并启动所有服务（后台运行）
docker compose up -d --build

# 停止并删除所有容器、网络
docker compose down

# 查看所有服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

对比手动部署的 7 个步骤（构建镜像 → 推送仓库 → 拉取镜像 → 创建网络 → 逐个启动容器），`docker compose up -d` 一条命令完成全部工作。

### 不使用镜像仓库的部署流程

如果不想推送到 DockerHub 或 ghcr，可以在服务器上直接构建：

```bash
# 克隆项目
git clone https://github.com/你的用户名/你的仓库名.git
cd 你的仓库名

# 构建并启动
docker compose up -d --build
```

三行命令，整个多容器应用栈就跑起来了。

## 容器编排的价值

Docker Compose 的价值与项目复杂度呈正相关。

对于**只有 1-2 个容器**的简单场景（比如一个前端 + 一个 Nginx），`docker run` 手动管理问题不大。

但当容器数量增长，Docker Compose 的优势立刻凸显：

| 维度 | 手动 docker run | Docker Compose |
| --- | --- | --- |
| 配置管理 | 参数散落在命令行，无法版本化 | YAML 文件提交到 Git，可追溯 |
| 启动方式 | 逐个手动执行，考虑依赖顺序 | 一条命令，`depends_on` 自动处理顺序 |
| 环境一致性 | 每次部署手动输入参数，容易出错 | 同一份 YAML 在本地、测试、生产都能跑 |
| 停止清理 | 逐个 stop + rm，容易遗漏 | `docker compose down` 一键清理 |
| 团队协作 | 依赖操作手册或口口相传 | 新人 clone 仓库，`docker compose up` 即可启动 |

此外，当团队进一步发展，容器数量达到几十上百个时，会需要 Kubernetes 这样的容器编排平台。但对中小团队和个人项目，Docker Compose 已经是最优解。

## 小结

Docker Compose 是声明式容器编排工具，通过一个 YAML 文件定义多服务的期望状态，一条命令管理整个应用栈的生命周期。

它的核心价值是**配置即代码**：所有服务配置集中在一个文件里，提交到 Git 即可版本管理，任何人 clone 仓库后一条命令就能复现完整的运行环境。

对个人项目和中小团队来说，如果你在 GitHub 上搜过开源项目，Docker Compose 已经是开箱即用的标准实践。

## 思考

1. `docker-compose.yml` 文件应该提交到 Git 仓库吗？如果里面有数据库密码等敏感信息，怎么处理？
2. `depends_on` 能保证服务「启动就绪」吗？如果 MySQL 容器启动了但还没初始化完成，依赖它的应用连接数据库会怎样？
3. 你的项目目前有几个容器？如果引入 Docker Compose，最大的收益是什么？

## 参考

1. [Docker Compose 官方文档](https://docs.docker.com/compose/)
2. [Docker Compose 命令参考](https://docs.docker.com/compose/reference/)
3. [Docker Compose 文件规范](https://docs.docker.com/compose/compose-file/)
