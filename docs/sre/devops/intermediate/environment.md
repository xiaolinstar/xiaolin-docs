---
title: 12 ｜ Dockerfile 构建与运行时配置
description: 对照服务器构建与制品分发，区分 ARG、ENV、Compose 插值和应用读取。
date: 2026-03-30
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
---

## Dockerfile 仍然要回答在哪里构建

前两课直接使用官方镜像并挂载页面。现在需要把 `delivery-demo` 的页面封装到自己的镜像中。

Dockerfile 描述构建过程，但不决定构建在哪台机器执行。与原生应用先编译再部署一样，我们仍有两个选择：

| 路线 | 做法 | 需要考虑 |
| --- | --- | --- |
| 目标服务器构建 | 传源码和 Dockerfile，在服务器执行 build，再启动 | 构建资源、依赖下载、源码与凭据分发、各环境分别构建的差异 |
| 构建后分发 | 开发机或专用构建节点生成镜像，服务器只拉取运行 | 镜像存放位置、版本身份、拉取权限和旧版本保留 |

先在本地完成两种配置实验，再在[下一课](13-image-registry.md)解决制品存放与分发；CI/CD 的职责边界随后从这条链路推导。

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

```bash
docker build --build-arg BUILD_LABEL=lesson12 -t delivery-demo:local .
docker image inspect delivery-demo:local --format '{{index .Config.Labels "org.opencontainers.image.version"}}'
```

预期标签为 `lesson12`。只修改容器运行参数不会改变这个镜像标签。

## .env 插值不等于容器环境变量

建立 `.env`，仅包含本地实验配置，并加入 Git 忽略规则：

```dotenv
APP_ENV=dev
WEB_PORT=18080
BUILD_LABEL=lesson12
```

建立 `runtime.env`：

```dotenv
APP_ENV=from-env-file
```

在原 `compose.yaml` 中 **替换 web 服务部分**，保留 db、networks、volumes。移除 web 的 `./site` 挂载，使页面确实来自构建出的镜像：

```yaml
web:
  image: delivery-demo:local
  build:
    context: .
    args:
      BUILD_LABEL: ${BUILD_LABEL:-local}
  ports:
    - "127.0.0.1:${WEB_PORT:-18080}:80"
  env_file:
    - runtime.env
  environment:
    APP_ENV: ${APP_ENV:?必须设置 APP_ENV}
  networks:
    - edge
    - backend
```

四个阶段要分别判断：

| 阶段 | 本例机制 | 验证方式 |
| --- | --- | --- |
| 镜像构建 | `ARG BUILD_LABEL` | inspect 镜像 label |
| Compose 解析 | `.env` 或 Shell 给 `${APP_ENV}` 插值 | `docker compose config` |
| 容器创建 | `environment` 覆盖同键 `env_file`，再覆盖镜像 ENV 默认值 | 容器 `printenv APP_ENV` |
| 程序启动 | Nginx 入口脚本读取变量并生成配置 | 请求 `/environment` |

渲染配置可能包含敏感值，不把完整 `docker compose config` 输出粘贴到公开日志。

## 三个覆盖实验

```bash
docker compose up -d --build web
curl --fail http://127.0.0.1:18080/environment
APP_ENV=staging docker compose up -d --no-build web
curl --fail http://127.0.0.1:18080/environment
```

预期先为 `dev`，再为 `staging`。Shell 的值用于这次 Compose 插值，覆盖 `.env`；第二次没有重新构建镜像，却改变了应用响应。

接着从 Compose web 中移除 `environment` 整块，再执行 `up -d --no-build web`，预期为 `from-env-file`。最后移除 `env_file`，预期回到镜像默认值 `local`。只在 `.env` 写 APP_ENV，不会自动把它传入容器。实验后恢复完整 web 配置。

配置改变后需要按应用机制重新加载；本例用 `up -d` 重建配置发生变化的容器，单纯 `restart` 不会重新应用 Compose 环境配置。Nginx 不会持续监听 Shell 变量变化。真实应用还应校验必填项与类型，在启动前报告清楚的配置错误。

## 从本地构建走向分发

试着将 `site/index.html` 的版本改为 v2：不构建时，容器仍使用镜像里的旧页面；重新 build 后才得到新内容。反过来，改变 APP_ENV 不应要求重建镜像。

这就是后续“同一镜像，多环境运行”的前提。下一课比较普通制品与镜像的分发，第 20 课介绍 K8s 如何注入配置，第 21 课再组织多套运行环境。

参考：[Docker 构建变量](https://docs.docker.com/build/building/variables/)、[Compose 插值](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)、[Nginx 镜像模板](https://hub.docker.com/_/nginx)。
