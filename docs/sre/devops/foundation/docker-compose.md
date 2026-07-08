---
title: 03 ｜ 多服务容器编排
description: 云原生的代表技术包括容器、服务网格、微服务、不可变基础设施和声明式 API。
date: 2026-03-06
updated: 2026-03-06
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - Docker
---


云原生的代表技术包括容器、服务网格、微服务、不可变基础设施和**声明式 API**。

Docker Compose 的技术理念，以及配置文件 `docker-compose.yml` 则是声明式 API 的一个重要实践。

## 声明式 API

声明式 API（Declarative API）是一种定义系统期望状态的接口设计范式，用户只需描述「要什么」，而非「怎么做」，系统通过持续调和自动将实际状态收敛到期望状态。

它是云原生**自动化**和**弹性**的核心机制。

与之对应的是命令式 API，用户需明确每一步操作。以下是最典型与常见的命令式 API和声明式 API 的类型对比，按领域分类整理：


| 领域           | 命令式 API（Imperative）                           | 声明式 API（Declarative）                              |
| -------------- | -------------------------------------------------- | ------------------------------------------------------ |
| **云原生/K8s** | kubectl run、create、delete（需手动执行每一步）    | kubectl apply -f yaml（定义状态，系统自动调和）        |
| **数据库**     | 手写遍历、连接、过滤等逻辑（如Java代码处理数据）   | SQL 查询语句（如`SELECT * FROM users WHERE age > 18`） |
| **前端开发**   | jQuery 操作 DOM（如`$('.btn').click(...)`）        | Vue/React 模板语法（如`<button @click="handle">`）     |
| **基础设施**   | Ansible 脚本、Shell 脚本（一步步执行命令）         | Terraform HCL、Kubernetes YAML（描述期望状态）         |
| **自动化运维** | 手动执行扩容命令（如`kubectl scale --replicas=5`） | Deployment 文件中声明`replicas: 5`，控制器自动维持     |

在 Docker 容器服务中，`docker run`、`docker exec`、`docker build` 等均为命令式 API，而 Docker Compose 则以声明式 API 的方式，通过定义 `docker-compose.yml` 文件，描述容器服务的期望状态，系统自动将实际状态收敛到期望状态。

## 阶段五：Docker Compose 容器编排

在阶段四中，使用命令式API `docker build`、`docker run`、`docker stop` `docker rm` `docker rmi` 等指令操作容器，存在多个显著缺陷：

- **手动操作多、易出错**：每一步（如构建镜像、启动容器、更新服务、容器卸载、镜像清理）都需手动执行命令，容易遗漏或出错。
- **部署流程不可复现**：没有统一描述文件，部署依赖人工记忆和脚本（或操作手册），团队协作困难，不利于长期维护。
- **容器依赖管理困难**：容器实例间的依赖顺序需人工维护配置，如先启动 MySQL，然后启动 Nacos、Redis，再启动鉴权微服务、核心微服务等。
- **无版本管理**：手动执行 shell 指令无法记录到 git 仓库，无法追踪和管理版本。
- **可移植性差**：在不同的环境中，如本地、测试、生产等，需手动调整配置，如端口、环境变量等，增加了部署的难度。

上述问题，Docker Compose 声明式 API 可以有效解决：

- **配置即代码**：在 `docker-compose.yml` 声明期望状态，与源码一起提交到 git 仓库，支持版本管理。
- **容器编排**：通过单一 YAML 文件定义多个服务、网络、卷等资源，并借助 `depends_on` 字段声明服务间的依赖顺序。
- **开箱即用**：项目配置由 `docker-compose.yml` 文件定义，用户仅需执行 `docker compose up -d` 和 `docker-compose down` 等少量项目无关的命令式指令，可一键启动整个多容器应用栈，可移植性高。

此外，还有**环境一致**、**一键生命周期管理**的特点。

---

引入 Docker Compose，进入阶段五：

1. 在个人电脑上使用 IDE 如 VsCode、WebStorm 开发、调试
2. 本地开发环境，查看开发效果 `npm run dev`
3. 制作 `Dockerfile`，并编辑 `docker-compose.yml`
4. 执行 `docker build` 生成容器镜像
5. 将生成的镜像推送到 DockerHub 等镜像仓库
6. 在云服务器上（具备公网 IP）拉取项目
7. 执行 `docker-compose up -d` 启动容器实例

如果不使用镜像仓库，也可以在云服务器上直接构建镜像，略过步骤4和步骤5，步骤7执行 `docker-compose up -d --build`。

其他 Docker Compose 指令：

- `docker-compose down`：停止并删除容器实例
- `docker-compose logs`：查看容器实例日志
- `docker-compose ps`：查看容器实例状态

本项目 `docker-compose.yml`，除了项目核心：Nginx 静态资源代理，还增加了 Nginx负载均衡、可观测性套件服务如 grafana、prometheus、loki 等，共计 8 个容器实例。

试想如果使用 `docker run` 来执行，不仅需要执行多条指令，还需要考虑网络、端口、环境变量、挂载卷、依赖关系等，会是什么样的体验？繁琐是一方面，出差错是更难接受的。

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
      # 设置目录挂载
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
      # 设置中国时区
      TZ: Asia/Shanghai


  # Grafana
  # 默认端口3000
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
      # 中国时区、匿名登陆
      TZ: Asia/Shanghai
      GF_AUTH_ANONYMOUS_ENABLED: true
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
      GF_USERS_ALLOW_SIGN_UP: false

  # Prometheus
  prometheus-website:
    image: prom/prometheus:v2.53.3
    container_name: prometheus-website
    volumes:
      # 设置目录挂载
      - ./volumes/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    environment:
      TZ: Asia/Shanghai
    networks:
      - tiny-sparrow-network
    command:
      - "--config.file=/etc/prometheus/prometheus.yml" # prometheus配置文件
      - "--storage.tsdb.path=/prometheus" # prometheus数据存储路径

  # 启动node-exporter
  # 该模式仅支持在 Linux 中运行
  # 容器内端口9100
  node-exporter-website:
    image: prom/node-exporter:v1.8.2
    container_name: node-exporter-website
    environment:
      TZ: Asia/Shanghai
    # host宿主机模式
    network_mode: host
    # 容器与宿主机共享进程号
    pid: host
    # https://github.com/prometheus/node_exporter
    volumes:
      - '/:/host:ro,rslave'
    command:
      - '--path.rootfs=/host'

  # nginx-prometheus-exporter
  nginx-exporter-website:
    image: nginx/nginx-prometheus-exporter:1.4
    container_name: nginx-exporter-website
    # 默认端口：9113
    environment:
      TZ: Asia/Shanghai
    networks:
      - tiny-sparrow-network
    # 需要与抓取的 Nginx 服务在同一网络，且信息一致
    command: "--nginx.scrape-uri=http://vitepress-website:8081/stub_status" # 配置 Prometheus 抓取 Nginx 状态的 URI

  promtail-website:
    image: grafana/promtail:3.4
    container_name: promtail-website
    volumes:
      # 设置目录挂载
      - ./volumes/promtail/promtail.yaml:/etc/promtail/promtail.yaml:ro
      - ./volumes/website/logs:/var/log
    environment:
      TZ: Asia/Shanghai
    networks:
      - tiny-sparrow-network
    command:
      - "--config.file=/etc/promtail/promtail.yaml" # promtail配置文件
    depends_on:
      - loki-website

  # Loki
  # 默认端口3100
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

## 总结

> 如果你有过在 GitHub 中搜查项目的经验，Docker Compose 已经成为开箱即用的最佳实践。

Docker Compose 作为声明式容器编排工具，其价值与项目复杂度呈现正相关关系。

在**大前端场景**中，由于通常仅需管理少量容器（如前端应用、Nginx 等），手动执行 `docker run` 等命令即可满足基本需求，Docker Compose 的优势可能不够显著。

然而，当面对**微服务集群**时，Docker Compose 的价值即刻凸显。

本文将在后期引入 SpringCloud 微服务场景。


## 参考

1. Docker Compose 官方文档，[https://docs.docker.com/compose/](https://docs.docker.com/compose/)
2. Docker Compose 命令，[https://docs.docker.com/compose/reference/](https://docs.docker.com/compose/reference/)