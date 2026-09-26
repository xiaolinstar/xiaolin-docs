---
title: 14 ｜ 单机 Compose 多项目共存
description: 单台机器跑多套 Compose 时，如何避免项目间串味、共享中间件、反向代理统一入口以及反模式边界。
date: 2026-09-19
updated: 2026-09-19
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
  - 多租户隔离
---

## 为什么单项目永远够用是错觉

[10 篇 Compose 多服务与网络](10-compose-network.md) 解决了「一个项目里的网络怎么分」。但当一台 2C4G 的服务器同时跑三套独立 Compose 时，问题就不一样了：

- `delivery-demo`：博客 + PostgreSQL
- `nocodb`：开源在线表格，自带 PostgreSQL
- `uptime-kuma`：监控告警，自带 SQLite

这时候「同一台机器上的多套 Compose」才是新挑战。本课给出四个维度的解法：**隔离 / 共享 / 入口 / 监控**。

## 维度一：项目间隔离（默认就够了）

**核心原则**：每个项目独立 network，**绝不**让两个项目的容器进同一个网络。

```bash
# 各自的网络会自动创建
delivery-demo_backend
nocodb_default
uptime-kuma_default
```

跨项目**不要**为了连通就合网络。前面 [10 篇](10-compose-network.md) 讲过：

- 多个项目默认**互不串味**——各自有独立的 `<dir>_default` 桥
- `port is already allocated` 是因为**端口映射到宿主机**（共用宿主机的网络栈），不是桥之间串了

这意味着：**不做任何配置**,三套 Compose 默认就不会在容器层面互相干扰。

## 维度二：共享中间件（独立项目 + external 网络）

如果 `delivery-demo` 和 `nocodb` 想共用一个 Redis（而不是各跑一份），正确做法不是让它们的网络互连，而是**单独起第三个 Compose 项目**跑共享服务，其他项目用 `external: true` 引用：

```bash
# 1. 先创建共享网络
docker network create shared-infra
```

```yaml
# shared-infra/compose.yaml
name: shared-infra
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis-shared:/data
    networks:
      - shared
volumes:
  redis-shared:
networks:
  shared:
    name: shared-infra-shared
    external: true     # 告诉 Compose 这张网络已经存在，不要再创建
```

```yaml
# delivery-demo/compose.yaml
services:
  app:
    image: my-api:1.0
    networks:
      - backend
      - shared          # 显式加入共享网络
networks:
  backend: {}
  shared:
    external: true      # 引用上面那张
    name: shared-infra-shared
```

`nocodb` 的 compose 同理。三套项目通过**第三方桥**互相看见，而不是直接打通两个项目的网络栈。任意一套下线不影响其他两套的内部网络。

| 跨项目需求 | 解法 |
|---|---|
| 共享 MySQL / Redis | 单独 Compose 项目跑共享服务，其他项目 `external: true` 引用 |
| `delivery-demo` 想调 `nocodb` 的 API | 通过宿主机端口（`127.0.0.1:port`）或反代 |
| 监控采集多项目容器 | 见下面「维度四」 |

**反模式**：「连不通就把 network mode 改成 host」——这是把 namespace 隔离整个拆掉，所有端口回到宿主机全局命名空间，所有问题都回来了。

## 维度三：反向代理统一入口

每套 Compose 项目都把端口映射到宿主机，端口会很快耗尽。正确做法是用 Nginx / Caddy 做反向代理，按域名分流：

```nginx
# /etc/nginx/conf.d/services.conf
server {
    listen 80;
    server_name blog.example.com;
    location / {
        proxy_pass http://127.0.0.1:18080;   # delivery-demo web
    }
}

server {
    listen 80;
    server_name nocodb.example.com;
    location / {
        proxy_pass http://127.0.0.1:18081;   # nocodb web
    }
}
```

Nginx 本身可以用系统包安装，也可以单独起一个 Compose 项目跑。三套被代理的应用**仍然只绑 127.0.0.1**，对外端口只有 Nginx 的 80/443。

**经验值**：服务器上每个 Compose 项目对外只暴露 1-2 个端口，通过反代按域名分发，内部全靠服务名通信。

## 维度四：跨项目监控采集

Prometheus / cAdvisor 之类的监控组件需要采集**多套** Compose 的容器指标。它们一般不加入应用网络，而是直接读宿主机的 `docker.sock`：

```yaml
# monitoring/compose.yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - /var/run/docker.sock:/var/run/docker.sock:ro
  cadvisor:
    image: gcr.io/cadvisor/cadvisor
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
```

cAdvisor 通过 `docker.sock` 看到**宿主机上所有容器**，不论它们属于哪个 Compose 项目。这绕开了「加入哪个网络才能采集」的难题。

把 `/var/run/docker.sock` 挂进容器等于给容器了**宿主机 root 权限**——这只适合完全受控的监控组件，对应用容器禁用。

## 反模式清单

| 反模式 | 后果 |
|---|---|
| 为连通把两个项目的网络合一张 | 端口冲突、容器名冲突，串味回到起点 |
| `network_mode: host` 解决「连不上」 | 隔离全部丢失，端口回到宿主机全局命名空间 |
| 用宿主机的 `localhost` 连容器端口 | 「127.0.0.1 在哪」要重新讲一遍，见 [10 篇](10-compose-network.md) |
| 把 `docker.sock` 挂给应用容器 | 容器拿到宿主机 root 权限，只适合完全受控的监控组件 |
| 跨项目用服务名连 | 服务名只在同一张 user-defined bridge 内解析，跨网默认不通 |

## 这条线以后怎么走

本课解决了单机多套 Compose 的共存边界。下一步要把这套实践推到 CI/CD 流水线里——镜像怎么进仓库、CI 怎么产出可发布的 digest、CD 怎么把它部署到目标环境。镜像分发与制品晋级见 [23 篇 制品库与镜像仓库](../advanced/image-registry.md)，CI/CD 边界划分见 [17 篇 CI/CD 权责分离](16-cicd-separation.md)。

参考：[Compose networks](https://docs.docker.com/compose/how-tos/networking/)、[external network](https://docs.docker.com/compose/how-tos/networking/#use-a-pre-existing-network)。
