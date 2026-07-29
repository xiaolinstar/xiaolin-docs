---
title: 05 ｜ 容器 Docker：让服务器回归本职
description: 引入 Docker 单容器命令式用法——服务器回归本职，只跑进程不再装包；用 docker pull / run / stop / rm / rmi 把 03 的三类运维痛点一次性消除。
date: 2026-07-15
updated: 2026-07-15
category: SRE 运维
tags:
  - DevOps
  - Docker
  - 容器化
---

03 篇最后留了三类运维痛点——**服务器变脏、构建把线上服务打挂、网络不对等**——三者的共同指向是：**构建动作不该和运行动作挤在同一台服务器上。** 这一篇就讲怎么把这两件事彻底分开。

这一篇只引入 Docker 的**单容器、命令式用法**：`docker pull` / `docker run` / `docker stop` / `docker rm` / `docker rmi`。多个容器如何编排，是下一篇的事。

## 服务器回归本职

生产服务器的本职就一件事：**跑一个常驻进程**——Spring Boot 监听 8080，Flask 监听 8000，Nginx 监听 80。它**不需要**：

- 装 `mvn` / `pip` / `nvm` 这些构建工具
- 装 `libpq-dev` / `libjpeg-dev` 这些 C 编译依赖
- 维护一堆 `JAVA_HOME` / `MAVEN_OPTS` 环境变量
- 担心 `apt upgrade` 把 JDK 顺手升级了

03 篇那三类痛点，本质都是「**服务器被迫成了另一台开发机**」。当开发机有构建工具、版本管理器、源配置，这些都是合理的；但当生产服务器也开始堆这些东西，它就开始变脏、不可控。

**Docker 的承诺**：把代码、依赖、运行时**一起打包成一个镜像**，服务器上只装 Docker 引擎（Docker daemon），跑这个镜像就够了。**构建在哪做都行，但运行只发生在服务器**——服务器不再是开发机，也不再是构建机。

## 镜像与容器：两个概念的边界

入门 Docker 第一件事是把这两个概念分开：

| | 镜像（image） | 容器（container） |
| --- | --- | --- |
| 性质 | 只读模板 | 镜像的运行实例 |
| 类比 | Git 仓库（可分发） | Git checkout（活的） |
| 数量 | 一个镜像可以有多版本（tag） | 一个镜像可以跑多个容器 |
| 是否占用磁盘 | 是 | 是（基于镜像的写时复制层） |
| 是否在运行 | 否 | 是（占用 CPU / 内存） |

**一句话：镜像是只读的模板，容器是它的运行实例。** 后面的命令都围绕这两个对象展开。

## 命令式工具集（5 个核心命令）

这一篇只教五条命令。掌握这五条，就能把单容器应用跑起来、停掉、清理掉。

### 1. `docker pull`：拉镜像

```bash
# 拉最新版本
docker pull nginx:latest

# 拉指定版本（生产建议固定 tag）
docker pull nginx:1.27-alpine

# 拉私有仓库
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/your-app:1.0.0
```

镜像默认从 **Docker Hub** 拉取（`docker.io`）。生产环境常用 `alpine` / `slim` 等小体积 tag，也可以从阿里云、腾讯云等国内镜像加速器拉。

### 2. `docker run`：跑起来

```bash
docker run -d \
  --name my-nginx \
  -p 80:80 \
  -v /opt/nginx/conf:/etc/nginx/conf.d:ro \
  -e TZ=Asia/Shanghai \
  nginx:1.27-alpine
```

参数逐个拆：

| 参数 | 作用 | 一句话体感 |
| --- | --- | --- |
| `-d` | 后台运行（detached） | 不阻塞当前终端 |
| `--name my-nginx` | 给容器起名 | 后续 `docker stop my-nginx` 不用敲 ID |
| `-p 80:80` | 端口映射（主机:容器） | 把主机的 80 暴露给外网 |
| `-v /opt/nginx/conf:/etc/nginx/conf.d:ro` | 卷挂载（只读） | 配置可换，镜像不动 |
| `-e TZ=Asia/Shanghai` | 环境变量 | 镜像内进程读到 `TZ=Asia/Shanghai` |

`docker run` 等价于「先创建容器，再启动」。如果只关心「能跑」，最简形式是 `docker run -d -p 80:80 nginx:1.27-alpine`——主机 80 直接暴露。

### 3. `docker ps`：看状态

```bash
# 只看运行中
docker ps

# 看全部（含已停止）
docker ps -a
```

输出类似：

```
CONTAINER ID   IMAGE          COMMAND                  CREATED       STATUS          PORTS                NAMES
a3f2b1c0e9d8   nginx:1.27-alpine   "/docker-entrypoint.…"   5 seconds ago    Up 4 seconds   0.0.0.0:80->80/tcp   my-nginx
```

记不住容器 ID 时，用 `NAMES` 列（`--name` 设的那个）最方便。

### 4. `docker stop` + `docker rm`：停掉 + 删除容器

```bash
# 优雅停（给进程 10 秒优雅退出时间）
docker stop my-nginx

# 删除容器（不删镜像）
docker rm my-nginx

# 一步到位：跑完就删（CI / 测试场景）
docker run --rm -p 80:80 nginx:1.27-alpine
```

**容器**是运行实例，可以删；**镜像**是只读模板，默认保留。删容器不影响镜像，下次 `docker run` 同一镜像秒级启动。

### 5. `docker rmi`：删镜像

```bash
docker rmi nginx:1.27-alpine
```

镜像被删之前要先确保**没有容器在用它**。否则会报错 `image is being used by stopped container`——这时要么先 `docker rm` 那个停了的容器，要么加 `-f` 强制删。

### 命令间的依赖关系

```
pull ─→ run ─→ stop ─→ rm
                ↓
              (容器停了)
                ↓
              rmi  ← 删镜像（要先 rm 容器）
```

这就是单容器生命周期的完整闭环。

## 真实例子：用 Docker 跑 03 篇的 Spring Boot jar

03 篇那个 Spring Boot 应用：`java -jar app.jar` 启动时，服务器需要：

- JDK 17
- 应用 jar 包
- 链接的 MySQL 驱动 / Redis 客户端 / 等
- 如果连 PostgreSQL，还得 `libpq-dev` 等系统库

用 Docker 之后，**服务器完全不需要这些**——只需要装 Docker daemon：

```bash
# 服务器只做这件事：
docker run -d \
  --name my-spring-app \
  -p 8080:8080 \
  -e SPRING_PROFILES=prod \
  -e DB_URL=jdbc:postgresql://db.example.com/yourdb \
  your-registry/your-app:1.0.0
```

镜像里**已经包含**了：

- OpenJDK 17 运行时
- Spring Boot fat jar（自带所有依赖）
- 应用需要的系统库（如有）

服务器不再装 `mvn`、不再装 JDK、不再关心 jar 是哪台机器打的——**镜像就是契约**。

## 解决 03 篇的三类痛点

回扣 03 篇那三类运维痛点：

| 痛点 | Docker 怎么解决 | 残留问题 |
| --- | --- | --- |
| **服务器变脏** | 服务器只装 Docker daemon，不再装 `mvn` / `pip` / `nvm` | 构建动作发生在别处（本地或 CI） |
| **构建打满资源** | 构建在本地或 CI 服务器，生产只跑预构建好的镜像（runtime 比 build 轻） | 构建机本身的资源仍要规划 |
| **网络不对等** | 镜像 `pull` 是一次性的（缓存到本地），不像 `mvn package` 每次重新下载 | 首次 `pull` 仍要解决 Docker Hub 访问 |

**Docker 没解决一切**——它把「运行」环节从运维痛点里解脱出来，但「构建」环节（CI 上要拉代码、要 `mvn package`、要 `docker build`）依然存在网络 / 资源问题。这些留给后续 CI 篇。

但生产服务器这一侧，已经**完全回归本职**——只跑进程，不再装包、不再是工作台。

## 小结

Docker 把「代码 + 依赖 + 运行时」打包成镜像，服务器只负责跑这个镜像。**服务器不再是开发机，也不再是构建机**——它只跑进程。

这一篇只覆盖**单容器、命令式**用法：5 个命令（`pull` / `run` / `ps` / `stop` / `rm` / `rmi`）就够把单容器应用跑起来、停掉、清理掉。

但真实项目通常不止一个服务：你的应用需要 Nginx 反代，Nginx 需要配置文件，监控需要 Prometheus / Grafana……**当容器数量增长到 3 个、5 个、10 个时，逐条 `docker run` 也会变得繁琐**——那是 [第 08 篇 · Docker Compose](./docker-compose.md) 要解决的事。

下一篇先不急着编排多容器，而是把「手动 `docker run`」也流水线化——进入 [第 06 篇 · 流水线基础](./pipeline-basics.md)。

## 思考

1. 03 篇提到「服务器变脏」是装 `mvn` / `pip` 等构建工具导致的。Docker 之后，**服务器还需要装这些吗？为什么？**
2. 一个镜像可以被多个容器共用。如果 `docker run` 两次同一个镜像，会发生什么？端口会冲突吗？
3. 镜像 `pull` 是从 Docker Hub 拉。在国内云服务器上 `docker pull nginx` 可能很慢或不稳——你有什么办法缓解？（提示：镜像加速器、镜像预下载、私有仓库）

## 参考

1. [Docker 官方文档](https://docs.docker.com/)
2. [Docker CLI 参考](https://docs.docker.com/engine/reference/run/)
3. [Docker Hub](https://hub.docker.com/)