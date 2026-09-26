---
title: 12 ｜ Dockerfile 与构建期配置
description: 区分构建期与运行期，理解 ARG、ENV、构建位置选择以及 .dockerignore 的边界。
date: 2026-03-30
updated: 2026-09-19
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Dockerfile
---

## Dockerfile 仍然要回答在哪里构建

前几课直接使用官方镜像并挂载页面。现在需要把 `delivery-demo` 的页面封装到自己的镜像中。

Dockerfile 描述构建过程，但不决定构建在哪台机器执行。与原生应用先编译再部署一样，我们仍有两个选择：

| 路线 | 做法 | 需要考虑 |
| --- | --- | --- |
| 目标服务器构建 | 传源码和 Dockerfile，在服务器执行 build，再启动 | 构建资源、依赖下载、源码与凭据分发、各环境分别构建的差异 |
| 构建后分发 | 开发机或专用构建节点生成镜像，服务器只拉取运行 | 镜像存放位置、版本身份、拉取权限和旧版本保留 |

先在本地完成两种配置实验，再在[高级篇 制品库与镜像仓库](../advanced/image-registry.md)解决制品存放与分发；CI/CD 的职责边界随后从这条链路推导。

## 用一个镜像观察构建与运行差异

沿用 `site/index.html` 和 `site/healthz`。新增 `nginx/default.conf.template`：

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    location = /environment {
        default_type text/plain;
        return 200 "${APP_ENV}\n";
    }
}
```

Nginx 官方镜像的入口脚本会在启动时对模板做环境变量替换。这里只显示非敏感环境名，不能把数据库密码或 token 放到响应中。

保存 `Dockerfile`：

```dockerfile
ARG NGINX_VERSION=1.28-alpine
FROM nginx:${NGINX_VERSION}
ARG BUILD_LABEL=local
LABEL org.opencontainers.image.version=${BUILD_LABEL}
ENV APP_ENV=local
COPY site/ /usr/share/nginx/html/
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
```

再创建 `.dockerignore`，避免把运行数据、凭据和 Git 历史发送到构建上下文：

```text
.git
.env
.env.*
runtime.env
backups/
volumes/
```

`ARG` 用于构建阶段，不自动进入运行时环境；`ENV` 提供镜像内的运行时默认值。多阶段构建还有各自的 ARG 作用域。两者都不适合传入构建密钥，应按构建工具支持使用 secret mount 等机制。

## 多阶段构建：运行镜像不带编译工具

前端项目需要先 `npm run build` 生成静态文件，再把文件交给 Nginx。如果在一个阶段里完成，最终镜像会包含 Node.js、npm 和所有 `devDependencies`——体积大、攻击面宽。多阶段构建把这两个关注点拆开：

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

ARG NGINX_VERSION=1.28-alpine
FROM nginx:${NGINX_VERSION}
ARG BUILD_LABEL=local
LABEL org.opencontainers.image.version=${BUILD_LABEL}
ENV APP_ENV=local
COPY --from=build /app/dist /usr/share/nginx/html/
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
```

第一阶段 `AS build` 负责编译，第二阶段只拷贝产物。最终镜像里没有 Node.js，`docker images` 对比两个阶段的体积差异通常在 10 倍以上。

多阶段构建有一个容易忽略的点：**每个 `FROM` 都有自己的 ARG 作用域**。全局 ARG（第一个 `FROM` 之前声明）在每个阶段默认可用；阶段内的 ARG 只在该阶段有效。如果 Nginx 版本也需要从外部传入，要在对应阶段重新声明 `ARG NGINX_VERSION`，或使用全局 ARG。

```bash
docker build --build-arg BUILD_LABEL=lesson12 -t delivery-demo:local .
docker image inspect delivery-demo:local --format '{{index .Config.Labels "org.opencontainers.image.version"}}'
```

预期标签为 `lesson12`。只修改容器运行参数不会改变这个镜像标签。

## 这条线以后怎么走

本课回答的是**构建期**的问题：Dockerfile 怎么写、ARG 和 ENV 怎么区分、镜像在哪台机器上 build。运行期怎么向容器注入配置（`.env` / `env_file` / `environment` 的优先级）、同一份 yaml 怎么区分 dev 与 prod，见 [13 篇 Compose 运行期配置与环境区分](13-environment-runtime.md)。

参考：[Docker 构建变量](https://docs.docker.com/build/building/variables/)、[Nginx 镜像模板](https://hub.docker.com/_/nginx)。
