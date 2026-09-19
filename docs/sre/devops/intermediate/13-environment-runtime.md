---
title: 13 ｜ Compose 运行期配置与环境区分
description: 区分 .env、env_file、environment 的优先级，通过 `up --watch` 启动模式分流 dev/prod，达成「同一份 yaml、两种启动模式」。
date: 2026-03-30
updated: 2026-09-19
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
  - 配置管理
---

## .env 插值不等于容器环境变量

承接 [12 篇 Dockerfile 与构建期配置](12-environment-build.md)。镜像只固化构建期产物，运行期还需要把环境相关的值注入容器。建立 `.env`，仅包含本地实验配置，并加入 Git 忽略规则：

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

## 启动模式分流：`up -d` vs `up --watch`

前几节讲的是「配置按环境变化」——同一份 `compose.yaml`，通过 `.env` / `env_file` / `APP_ENV` 区分 dev 与 生产，这是**配置维度**的差异。

还有一类维度是**启动模式**：同一份 yaml，开发用 `docker compose up --watch` 触发文件监听，生产用 `docker compose up -d` 后台启动，行为完全不同。配置上需要在 `services.<name>` 下加一段：

```yaml
services:
  web:
    build: .
    develop:
      watch:
        - action: sync+restart
          path: .
          target: /code
        - action: rebuild
          path: requirements.txt
```

`develop:` 是 Compose Spec 的**可选段**。`docker compose up -d` 默认完全不解析它，只有显式带 `--watch` 时才进入文件监听循环——所以同一份 yaml 可以同时承担：

- **本地开发**：`up --watch`，改 Python 文件自动同步到容器；改 `requirements.txt` 触发镜像重建
- **预发 / 生产**：`up -d`，watch 块被忽略，行为和没写一样；**YAML 单一真源**

### 两个边界

1. **`path: .` 在两端语义不同**。开发机 `path: .` 是开发者本地工作目录；生产部署时同一份 yaml 的 `path: .` 指向**生产服务器上当前目录**。生产没人 `up --watch`，所以没有运行时影响，但读 yaml 时要知道这个 `path:` 只对 dev 生效，生产环境下它是个**休眠配置**。

2. **`sync+restart` 写入的是容器可写层**（UnionFS 的 upperdir），不是镜像层。容器一旦重建这些改动就消失，会让人误以为「已经部署」。同时本地复现事故时，如果加了 `--watch`，行为会和生产不一致，排查路径分叉。

### watch 的作用域

不可变基础设施要求镜像一旦构建不再变更，生产发布应该是**一次性原子动作**（镜像 tag 锁定、配置注入、健康检查、流量切换）。watch 把这套流程绕开，改成「边跑边改」，变更窗口从一次原子操作变成持续时间段，回滚点变模糊。

所以 watch 的作用域基本锁在**本地开发机**，即便在 staging 也最好关掉——staging 是「生产镜像 + 生产配置」的预演，开了 watch 等于让 staging 和 prod 走两条不同的部署路径，**预发验证就失效**。同一份 yaml 可以同时承载两种启动模式，但启动参数要按场景分清。

## 这条线以后怎么走

本课回答的是**运行期**的问题：同一份镜像在不同环境下用不同配置（`.env` / `env_file` / `environment`），dev 与 prod 通过启动参数（`up -d` vs `up --watch`）分流。多套 Compose 项目**同时**跑在同一台机器时怎么不串味、共享中间件怎么处理，见 [14 篇 单机 Compose 多项目共存](14-compose-coexist.md)。

参考：[Compose 插值](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)、[Compose Watch 文档](https://docs.docker.com/compose/how-tos/file-watch/)。
