---
title: 03 ｜ 服务端应用部署：依赖、运行时与进程保活
description: 从静态站点升级到带运行时的服务端应用，以 Spring Boot 与 Flask 双栈示例展开“构建策略 / 进程生命周期 / 进程保活”三个新维度，为容器化铺路。
date: 2026-07-10
updated: 2026-08-04
category: SRE 运维
tags:
  - DevOps
  - Spring Boot
  - Flask
  - 服务端部署
---

前两篇我们处理的对象都是“一堆 HTML / CSS / JS”——构建产物是静态文件，部署动作是把文件放进 Nginx 目录，服务器只需执行“读文件 → 返回”的简单动作。

但绝大多数真实业务绝不只是静态展示——用户登录、购物车、订单支付、数据统计，这些都需要“执行业务代码、读写数据库、记录会话状态”。这一层**不在浏览器里运行**，而是以**后端 API 进程**的形态常驻在服务器上：

![一次服务端请求如何流转](/images/img-server-side-deploy/infographic-request-flow.png)

这就是本篇的核心跃迁：**当部署对象从“纯静态文件”升级为“需要{{term:运行时}}、第三方依赖库、常驻监听端口的后端 API 进程”时，前两篇的部署方式还够用吗？哪里不够？**

这一篇围绕两个新问题展开：

1. **在哪构建**：服务器构建，还是本地构建后传产物？
2. **在哪跑**：如何让后端 API 进程脱离终端、24 小时稳定常驻，并在故障时自动拉起？

## 架构演进：静态资源与动态资源

### 链路结构：从单进程到前后端分工

前 02 篇里那个“处理请求并返回响应”的角色一直都在——它叫 Nginx：默认监听 80/443 端口，把请求通过{{term:反向代理}}（替后端接收公网请求，用户只认识 Nginx 这个入口）转给后端服务进程（或者自己直接返回静态文件）。我们没显式讨论“进程”，是因为 Nginx 把这件事**藏起来了**——它几乎不会因为你的代码内容挂掉，存在感很低。

后端不一样：进程换成你自己启的 Java / Python 进程。但**链路结构没变**——都是“用户浏览器 → 服务器上一个进程在监听端口 → 处理后返回响应”。区别只是：前端的进程是 Nginx，后端的进程是用户自己拉起的 Java / Python。

链路看起来是这样：

![Nginx 在前后端分离中的位置](/images/img-server-side-deploy/infographic-nginx-routing.png)

**客户端只跟 Nginx 通信**——它根本不知道后端进程的端口是什么。后端进程死了，客户端看到的是“502 Bad Gateway”，但**它不知道是 Nginx 挂还是后端挂**。

这样看，静态资源托管与后端服务在日常运维中的感知差异，主要体现在两点：

1. **进程维护责任不同**：
   - 静态资源托管由接入层基础设施（Nginx）直接承担，由操作系统级服务拉起，极少因为业务逻辑崩溃；
   - 后端 API 是开发者编写的业务进程（Spring Boot / Flask），业务逻辑复杂且连接外部依赖，必须由运维显式配置启动、监听与进程保活。
2. **故障感知与排查路径不同**：
   - **Nginx 挂了（接入层故障）**：客户端表现为“连接被拒绝（Connection Refused）”或完全无法连接，直接排查入口服务器与 Nginx 状态；
   - **后端进程挂了（应用层故障）**：Nginx 依然健在，并会代替死掉的后端向用户返回 **502 Bad Gateway**——入口是通的，死的是上游应用，运维需直接抓取业务日志。

**但从服务器底层来看，两者的本质又是完全对等的**：
- 前端：以 **Nginx 作为 Web 服务器**，监听 80 端口，载荷是磁盘上的静态文件（`dist/`）；
- 后端：以 **Tomcat（内嵌于 Spring Boot）或 Gunicorn 作为 Web 服务器**，监听 8080/8000 端口，载荷是可执行的应用代码（`app.jar` / `app.py`）。

静态文件和 Java Main 本质上都是交给各自 Web 服务器执行的“内容物”。之所以目前看起来部署形态差异很大，是因为物理机上“装 Nginx 传文件”与“装 JDK 跑进程”的运维动作还未统一——**这个本质的一致性，在 05 篇 Docker 容器化中将被彻底具象化（前端镜像是 Nginx+文件，后端镜像是 JDK+Jar，在 Docker 看来都是跑一个监听端口的容器）**。

| 维度 | 前端部署（静态） | 后端部署（动态 API） |
| --- | --- | --- |
| 部署对象 | `dist/` 纯文件载荷 | 带运行时的进程载荷（jar / wheel + JVM / Python） |
| 承担服务的 Web 容器 | Nginx（读静态文件返回） | Tomcat / Gunicorn（跑业务代码返回） |
| 部署动作 | scp 文件到 Nginx 目录 | scp 产物 + 拉起进程 + 监听端口 |
| 客户端感知 | 直接打到 Nginx（挂了报连接拒绝） | Nginx 反代转发（后端挂了由 Nginx 返回 502） |

依赖上看，后端比前端厚一叠：除了 Web 容器这层基础能力，还要叠加 `pom.xml` / `pyproject.toml` 的业务级依赖。**部署对象从纯文件层抬升到带运行时层，是这一篇要讲的关键跃迁**——虽然运维动作本质相同，但后端的保活与多组件依赖治理难度提升了一个台阶。

### 静态资源与动态资源的核心差异

- **静态资源（Nginx 直接服务）**：HTML / CSS / JS / 图片 / 字体等文件。部署后不再由服务器生成，服务器只做“读文件 → 返回”的动作。
- **动态资源（Tomcat / gunicorn）**：请求触发服务端代码 → 动态生成 HTML / JSON 等内容。每次请求都要跑代码、读数据库、调用其他服务。

| 维度 | 静态资源 | 动态资源 |
| --- | --- | --- |
| 服务对象 | 文件（最终形态） | 触发的代码 |
| 服务动作 | 读文件 → 返回 | 跑代码 → 生成内容 |
| 计算成本 | 几乎为 0 | 每次请求都跑 |
| 缓存友好性 | 文件可缓存 | 难缓存（每次结果可能不同） |
| 典型 Web 服务器 | Nginx | Tomcat / gunicorn |

到这里“前端 / 后端”和“静态 / 动态”两个二分法对齐了：前端用 Nginx 处理静态资源，后端用 Tomcat / gunicorn 处理动态资源。

### 常见服务端应用栈：Spring Boot 与 Flask

当下最流行和常见的两个栈：**Java {{term:Spring Boot}}** 和 **Python Flask**。

#### 1. Java Spring Boot

Spring 生态的脚手架——开箱即用，约定大于配置（starter）、Java 后端的事实工业标准。

- **监听端口**：默认 8080
- **依赖声明**：`pom.xml`（Maven）/ `build.gradle`（Gradle）
- **启动命令**：`java -jar app.jar`（内嵌 Tomcat 作为 Servlet 容器）
- **关键优势**：fat jar 把代码、依赖、JDK 运行时打成一个自包含的产物，跨机器传产物最方便
- **关键约束**：JVM 启动 5–15 秒；classpath / 堆内存 / GC 绕不开

#### 2. Python Flask

轻量 WSGI 微框架——“小而精”，适合 API / 中小服务。

- **监听端口**：Flask 自带 dev server 默认 5000（仅本地开发用）；生产用 gunicorn 时默认 8000
- **依赖声明**：`pyproject.toml`（PEP 621 标准）
- **启动命令**：`gunicorn app:app`（生产，WSGI server）/ `python app.py`（仅 dev，Flask 自带 dev server）
- **关键优势**：上手快、生态深
- **关键约束**：跨机器传产物要看 Python 解释器 + 系统库的脸色；C 扩展包（如 `psycopg2`、`numpy`）最易踩坑

## 构建策略与三类运维痛点

### 三栈构建横向对比

| 步骤 | 前端（VitePress / Vite） | Spring Boot（Java） | Flask（Python） |
| --- | --- | --- | --- |
| 依赖声明 | `package.json`（npm） | `pom.xml`（Maven） / `build.gradle`（Gradle） | `pyproject.toml`（PEP 621 标准） |
| 依赖管理 | `pnpm install` | `mvn dependency:resolve` / `gradle dependencies` | `pip install -e .` / `uv sync` |
| 构建产物 | `dist/` 静态文件 | 可执行 jar / war | 源码 + 虚拟环境 / `pip freeze` 锁文件 |
| 启动命令 | 无（产物是文件，由 Nginx 读） | `java -jar app.jar` | `python app.py`（生产用 `gunicorn app:app`） |
| 配置文件 | （基本不用） | `application.yml` / `application.properties` | 环境变量 / `config.py` |
| 外部依赖 | （基本没有） | MySQL 驱动、Redis 缓存等 | MySQL 驱动、Redis 缓存等 |

### 两类构建部署路线及痛点

**路线 A · 服务器构建**：`git pull` 源码 → 服务器上 `mvn package` / `pip install` → 启动。

- Maven 首次下载依赖要十几分钟；`pip install psycopg2` 这类带 C 扩展的包需要服务器装 `libpq-dev`。
- 服务器 CPU/内存被构建过程占用，可能影响正在运行的线上服务。
- 本地是 Java 17，服务器是 Java 11——构建直接失败。

**路线 B · 本地构建后传产物**：本地 `mvn package` 出 jar / 本地 `pip install` 出 wheel → 上传 → 服务器启动。

- Spring Boot 的 jar 相对干净（自带依赖），跨机器跑成功率高。
- Flask 的 `pip install` 产物是**针对构建时的操作系统编译的 `.so` 文件**——本地 macOS 编译后上传到 Linux 服务器常常 `GLIBC_2.28 not found`；即便本地是 Linux，挪到镜像 / glibc 版本不一致的服务器同样可能出问题。
- “在我电脑上能跑”——本地环境 ≠ 服务器环境，本地产物 ≠ 服务器能用的产物。

两种路线都解决不了所有问题：**Spring Boot 因为自带 fat jar 比 Flask 更有{{term:可移植性}}，但两类栈共享同一个根本问题：构建动作和运行环境是割裂的——我们只传了代码和依赖，没传“运行环境本身”。**

**补充说明**：前端**同样**有构建路线问题——`npm run build` 也是资源密集型任务。但**因为前端产物是 `dist/` 静态资源 + 可迁移性强**，这两个痛点（资源占用 / 跨平台）的影响比后端轻得多——本地构建后 `scp` 上去即可。前端产物的强可迁移性自然补偿了构建痛点的影响。

![两类构建部署路线对比](/images/img-server-side-deploy/infographic-build-routes.png)

### 三类被低估的运维痛点

真实部署还会撞上**运维视角**的三类问题，跟栈无关，跟“在哪构建”有关。

#### 痛点一 · 服务器会变“脏”

只要走“服务器构建”路线，服务器就不可避免地变脏：装 Java、装 Maven、装 Python、装 `pyenv`、装 Node。更麻烦的是**版本对齐**：半年后本地换到 Java 21，服务器没升，构建直接失败，**生产服务器成了另一台开发机**。

#### 痛点二 · 构建是重资源任务，进程是轻资源任务

服务器的工作是**运行一个常驻进程**（CPU / 内存占用稳定）。而构建任务（编译 / 链接）是 **CPU 密集 + 内存密集**。在同一台服务器上边跑线上服务边构建，可能导致线上服务响应延迟飙升，甚至引发 OOM（Out of Memory）导致进程被内核杀掉。

#### 痛点三 · 网络环境不对等

“本地能装的东西，服务器不一定能装”——这是**网络环境差异**：本地访问官方仓库通常顺畅，而{{term:云服务器}}（特别是国内云）访问海外源常受限。除非提前配好镜像源或私有仓库，否则在线依赖拉取常耗时漫长。

| 痛点 | 表面症状 | 根本原因 |
| --- | --- | --- |
| 服务器变脏 | 包管理器冲突、版本不一致 | 构建工具和运行时共用一台机器 |
| 构建打满资源 | 线上服务卡顿 / OOM | 构建任务和运行任务共享资源 |
| 网络不对等 | 依赖下载慢 / 失败 | 服务器网络环境受限 |

![三类运维痛点汇总](/images/img-server-side-deploy/infographic-deployment-risks.png)

三类痛点在 SRE 运维视角下归结为同一个核心瓶颈——**低可移植性（Low Portability，环境强耦合）**：构建动作与运行环境割裂，产物只包含了代码和依赖，没包含“运行环境本身”，脱离了特定机器就面临环境漂移。成熟工程实践通常采用：

- **专门的 Build Server / CI Server**：构建机与运行服务器物理分离。
- **容器化（05 篇）**：把“代码 + 依赖 + 运行时”打包成自包含镜像，服务器只跑镜像，彻底攻克跨机迁移障碍。

## 进程生命周期与生产级保活

### 进程状态切换：从前台调试到后台脱离

后端进程要长期运行——不是“调试一次按 Ctrl+C 退出”的开发期模式。

启动命令示例：

```bash
# Spring Boot（通常监听 8080）
java -jar app.jar

# Flask（生产用 gunicorn；若前置有 Nginx 反代，推荐仅绑定 127.0.0.1 提升安全性）
# `app:app` 指向 Flask 应用对象（通常在 wsgi.py 或 app.py 中定义）
gunicorn -w 4 -b 127.0.0.1:8000 app:app
```

进程从“前台调试”切换到“后台挂稳”的方式：

```bash
# 1. 临时调试：终端关了就退出
java -jar app.jar

# 2. 临时后台：终端关了仍在跑（日志默认落到当前目录 nohup.out）
nohup java -jar app.jar &

# 3. 后台脱离终端：日志重定向到指定文件
nohup java -jar app.jar > /var/log/myapp.log 2>&1 &
```

启动后的最小验证与排查闭环：

```bash
# 1. 验证进程在跑
ps -ef | grep java          # Spring Boot
ps -ef | grep gunicorn      # Flask

# 2. 验证端口与健康检查
curl -I http://127.0.0.1:8080     # Spring Boot 健康检查
curl -I http://127.0.0.1:8000     # Flask / Gunicorn

# 3. 排查时抓日志
journalctl -u myapp -n 100 -f     # systemd 方式
tail -f /var/log/myapp.log        # nohup 方式
```

![进程生命周期：启动、后台运行、验证与日志回环](/images/img-server-side-deploy/diagram-process-lifecycle-wechat.png)

::: details 📐 静态信息图 Prompt 与路径参考

```text
Notion style minimalist line art infographic, hand-drawn marker stroke texture. 16:9 aspect ratio.
Horizontal flow left to right with a feedback loop:
  Step 1 (gray #8c8c8c): 启动进程 (play button icon)
  Step 2 (gray #8c8c8c): 前台运行 java -jar / gunicorn
  Step 3 (blue #1890ff): 后台挂起 nohup ... &
  Step 4 (diamond decision node, gray): 验证 ps / curl
    -- 成功 path (green checkmark, orange #fa8c16 accent): → 稳定运行
    -- 失败 path (red dashed): → 排查日志 journalctl/tail -f → 循环回 Step 3
Clean white background with lots of negative space. No gradients, no 3D effects, no shadows.
```

- 产物路径：`docs/public/images/img-server-side-deploy/diagram-process-lifecycle.png`
- CDN 引用：`https://media.xiaolin.fun/docs/img-server-side-deploy/diagram-process-lifecycle.png`

:::

### 生产级常驻：systemd 保活

将服务注册为 {{term:systemd}} unit 才是生产级保活。把以下内容保存为 `/etc/systemd/system/myapp.service`（系统级路径，需 `sudo`）：

```ini
[Unit]
Description=My Spring Boot Application
After=network.target

[Service]
User=ubuntu
ExecStart=/usr/bin/java -jar /opt/myapp/app.jar
Restart=on-failure
RestartSec=5
Environment=SPRING_PROFILES=prod

[Install]
WantedBy=multi-user.target
```

```bash
# 重载配置并启动自启
sudo systemctl daemon-reload
sudo systemctl enable --now myapp
sudo systemctl status myapp
```

Flask 配合 `gunicorn` 的 systemd unit 结构完全一致，仅需将 `ExecStart` 换为 `gunicorn` 启动命令。服务器重启后，`nohup &` 进程随 SSH 会话退出或关机而销毁，只有 `systemctl enable` 注册的服务会随开机自启并具备崩溃重启能力。

> [!NOTE]
> **💡 时代视角的演进注脚**：
> 在当今云原生与微服务架构中，应用开发者确实已经很少直接手写 `systemd unit` 了——应用进程的常驻保活与崩溃自愈已被全面交由 **Docker（`--restart always`）** 或 **Kubernetes** 统一托管。
> 但在此处理解 `systemd` 依然至关重要：它是 Linux 裸机时代唯一的工业级保活标准，也是容器保活策略的思想源头。体会过裸机手写 systemd 配置的繁琐与系统全局侵入性，才能真正领会后续 05 篇容器化带来的巨大解脱。

### 真实生产全貌：应用、中间件与数据库

在真实生产环境中，后端服务从来不是孤岛。

#### 1. 大型企业的复杂生产全貌

在大型互联网或企业级系统中，服务端由复杂的拓扑网络构成：

| 组件类别 | 典型代表 | 在服务端承担的职责 |
| --- | --- | --- |
| **应用服务** | {{term:Spring Cloud}} 微服务集群、Flask / FastAPI 实例 | 核心业务逻辑与 API 接口 |
| **缓存系统** | Redis、Memcached | 热点数据加速、高并发削峰 |
| **消息队列** | Kafka、RabbitMQ、RocketMQ | 异步解耦、流量削峰、分布式事件流 |
| **搜索引擎** | Elasticsearch、OpenSearch | 全文检索、日志聚合与监控检索 |
| **持久化存储** | MySQL、PostgreSQL、MongoDB | 关系型/文档型核心数据落盘 |

在这种复杂拓扑下，**任意一个依赖连不上，后端对用户而言都是 502 或不可用**。排查方向也各不相同：应用进程挂了查 JVM / Gunicorn 日志，中间件挂了抓 Redis / Kafka 状态，数据库连不上则要排查连接池打满、慢查询或磁盘占用。

#### 2. 聚焦最小生产组合：Spring Boot + MySQL

为了避免过早陷入微服务拓扑的复杂度，我们聚焦当今开发中最通用、最经典的**最小完整生产组合**：

> **最小后端栈 = 常驻应用进程 (Spring Boot / Flask) + 独立关系型数据库 (MySQL / PostgreSQL)**

> [!NOTE]
> **关于嵌入式 SQLite 的边界**：
> SQLite 虽轻（仅为本地磁盘上的单一 `.db` 文件，零独立进程、零网络配置），但因缺乏独立进程模型和多并发网络连接支持，通常仅用于本地端侧或开发测试。真实服务端项目必须使用 MySQL 或 PostgreSQL 这类**通过独立 TCP 端口（如 3306 / 5432）提供网络守护进程的数据库服务**。

#### 3. 手动运维多组件的四大经典痛点

一旦从“单应用进程”迈入“应用 + 数据库”的多组件架构，如果在物理机或裸虚拟机上手工维护，运维成本将急剧飙升：

- **安装配置重且繁琐**：在服务器上执行 `apt install mysql-server` 后，必须手动初始化 root 密码、配置字符集（`utf8mb4`）、调整监听地址（`bind-address`）并创建业务库和用户，步骤繁琐且难以标准化。
- **启动顺序与依赖倒置**：Spring Boot 启动时默认会通过 HikariCP 连接池探测数据库连通性。如果数据库未启动或初始化未完成，应用进程将直接抛出连接异常崩溃退出。如何保证 **数据库先就绪、应用后拉起** 成为启动脚本的难题。
- **多版本共存与主机环境污染**：若服务器上同时运行多个项目（例如项目 A 依赖 MySQL 5.7，项目 B 依赖 MySQL 8.0），在同一台操作系统中安装多套不同版本的 MySQL 会导致系统库冲突、数据目录混淆与端口冲突，生产主机迅速被污染。
- **清理与卸载噩梦**：当测试或不再需要某套环境时，手动卸载极其痛苦——散落在 `/etc/mysql/`、`/var/lib/mysql/` 的配置文件、数据卷和系统用户常常无法彻底清理干净。

#### 4. 走向现代化工程治理的引线

这种手工在物理机上“装软件、配参数、管依赖、排查顺序、清扫残留”的繁琐操作，在 Google SRE 体系中被称为典型的 **高运维苦工（High Toil）**——高度依赖人工记忆与命令式手工敲击，脆弱易漏且无长期沉淀。

传统物理机部署的这两大核心噩梦（**单组件的低可移植性** 与 **多组件的高运维苦工**），正是驱动现代架构演进的根本动力：

- **05 篇（Docker 单组件容器化）**：将代码与完整运行环境封箱为不可变镜像，彻底终结 **低可移植性** 难题，实现秒级拉起、随删随走、零主机污染；
- **08 篇（Docker Compose 多服务编排）**：用一份声明式的 `docker-compose.yml` 彻底终结 **多组件手工苦工**，一键声明网络互通、数据卷挂载与 `depends_on` 启动依赖顺序。

## 闭环回到 02 篇的范式

这一篇的定位是**范式显式化**——前 02 篇默认掉的隐含项，现在变成显式的依赖与步骤。

02 篇确立的生产变更操作清单 $Y=\{v_1,v_2,\ldots,v_n\}$ 与有向无环图（DAG）$G=(V, E)$ 范式不变，但在服务端与多组件场景下，图的节点与依赖关系发生了关键跃迁：

### 1. 操作集 $V$ 的结构化分段（Partitioning）

02 篇的静态发布是简单的三节点线性链：

$$
v_{\text{build}} \xrightarrow{} v_{\text{upload}} \xrightarrow{} v_{\text{verify}}
$$

而服务端部署因引入了“编译构建”与“常驻守护进程”，操作集 $V$ 明确分裂为两个子集：

- **构建子图 $V_{\text{build}}$**（CPU/内存密集型，应与运行服务器物理隔离）：
  $$V_{\text{build}} = \{v_{\text{pull}},\, v_{\text{compile}}\}$$
- **运行与编排子图 $V_{\text{run}}$**（常驻守护型，需在生产服务器执行）：
  $$V_{\text{run}} = \{v_{\text{db}},\, v_{\text{app}},\, v_{\text{reload}},\, v_{\text{verify}}\}$$

### 2. 多组件启动的拓扑依赖（Topological Order）

02 篇各步骤之间只有单线先后关系，而在引入 MySQL 数据库后，$E$ 增加了跨组件的强依赖边：

$$
(v_{\text{db}} \to v_{\text{app}}) \in E \implies \tau(v_{\text{db}}) < \tau(v_{\text{app}})
$$

必须满足 **数据库就绪 $\to$ 应用拉起** 的严格拓扑序。若 $v_{\text{db}}$ 失败或延迟，$v_{\text{app}}$（Spring Boot 的 HikariCP 连接池）将直接崩溃，导致整条流水线在定义层面无法推进。

### 3. 终点验证 $v_{\text{verify}}$ 的双层穿透

02 篇的终点验证仅需黑盒请求 Nginx 静态文件。而在“Nginx + 后端 API 进程”的架构下，终点验证节点 $v_{\text{verify}}$ 演进为两层互锁：

1. **底层进程与端口探活（灰盒）**：
   - 验证 `systemctl status myapp` 处于 active 状态；
   - 本地回环 `curl -I http://127.0.0.1:8080` 能够正常响应。
2. **公网反代与业务穿透（黑盒）**：
   - 外部访问 `curl http://your-public-IP/api/...`，确认 Nginx 正确反代且返回业务 JSON，不再呈现 502 Bad Gateway。

只有两层探活均返回成功，整条发布 DAG 才算真正到达稳定终止态。这就将复杂的“进程治理与多组件运维”重新收敛回了统一的数学与工程闭环。

## 小结

至此，在引入服务端应用与数据库后，现代 Web 应用的生产部署现状清晰呈现：

从 **系统运行时与服务进程** 的视角看，整台服务器上常驻着 3 个独立的常驻服务进程：

1. **Nginx 进程（接入与静态宿主）**：作为公网唯一入口，**直接在进程内部持有并读取 `dist/` 静态文件载荷**；同时作为反向代理网关。
2. **Spring Boot 进程（Java 运行时）**：内嵌 Tomcat，作为独立的常驻应用进程处理 `/api/*` 动态业务。
3. **MySQL 进程（数据持久化守护进程）**：作为独立的数据库服务，负责数据底层落盘。

静态资源 `dist/` **并不是一个独立运行的组件或进程**，而是被 Nginx 进程直接包裹并读取的文件资产。因此，生产变更的操作清单 $Y$ 正式解耦为两个独立的操作子集：

![服务端部署拓扑：Nginx、静态文件、应用进程与数据库](/images/img-server-side-deploy/diagram-service-topology-wechat.png)

### 两种独立的生产变更操作集

在日常迭代中，发布不再是“全量重来”，而是根据变更范围精准落入两个独立的操作集合：

| 变更场景 | 触发的操作子集 | 涉及的物理动作 | 运维影响面 |
| --- | --- | --- | --- |
| **仅改前端**（UI 文案 / 页面组件） | **操作集 $Y_{\text{frontend}}$** | 本地 `pnpm build` $\to$ `scp` 覆盖 `dist/` $\to$ 验证网页 | **极低**：仅替换 Nginx 内部静态文件，Nginx 与后端均无需重启，秒级生效 |
| **仅改后端**（业务接口 / 数据库） | **操作集 $Y_{\text{backend}}$** | 编译 `app.jar` $\to$ 上传 $\to$ 确认 DB 就绪 $\to$ `systemctl restart` $\to$ 验证 API | **中等**：需重启 Spring Boot 应用进程，重新建立数据库连接池 |

前端和后端在“服务器进程”这件事上本质相同——区别在于前端由 Nginx 承担，后端由用户自己拉起的 Java / Python 进程承担，**链路结构没变**（用户 → Nginx → 处理 → 返回），变化的是谁负责拉起、谁负责保活。

后端相比前端要新管两件事：**进程生命周期**（启动、监听、重启）、**进程保活**（死了谁拉起）。构建动作（`npm run build` / `mvn package`）两类栈都跑，**差异在产物可迁移性**——前端 `dist/` 纯静态文件本地构建后 `scp` 即可；后端 fat jar 跨机器友好，但 wheel 含 `.so` 仍受 GLIBC 约束。两类栈的共同痛点都是”代码 / 依赖 / 运行环境割裂”。

下一步进入 [第 04 篇（Git 与 GitHub）](./git-github.md)：版本管理解决代码追踪问题，进而为 05 篇 Docker 容器化奠定基础。

## 思考

1. Flask 的 `python app.py` 本质上启动了 dev server。它在生产环境**不应该用**——为什么？生产用 `gunicorn` 或 `uvicorn` 替代的核心差距在哪？
2. 服务器上 `pip install psycopg2` 失败提示缺 `libpq-dev`，这属于“服务器构建”还是“本地构建”路线的问题？
3. `nohup java -jar app.jar &` 和 `systemctl start myapp` 有什么区别？服务器重启后谁会活下来？
4. 这一篇比前两篇的部署动作多出了**哪一类新动作**？（提示：对比 Nginx 与 Spring Boot / Flask 的生命周期管理差异）

## 延伸阅读：Nginx 角色的单一职责与跨域解法

更精确地说，Nginx 在前后端分离的典型部署里同时承担两个角色：

- **Web 服务器（静态代理）**：处理静态资源（HTML / CSS / JS / 图片 / 字体）。
- **反向代理 / 软负载**：把请求转给后端服务（Spring Boot / Flask），并通过同域收敛彻底规避浏览器跨域问题。

| 角色 | 承担者 | 职责 |
| --- | --- | --- |
| Web 服务器（静态） | CDN / Nginx / Apache | 只读静态文件 |
| 反向代理 / 软负载 | Nginx / Envoy / HAProxy | 流量分发与同域跨域收敛 |
| 业务服务 | Spring Boot / Flask | 处理业务逻辑 |

对个人开发者与中小项目，单个 Nginx 同时承担两个角色是最务实的选择；规模扩大后，建议按单一职责原则进行解耦与独立扩容。

详见专题解析：[《浏览器同源策略与 Nginx 跨域全链路解析》](../../../software-development/security/same-origin-policy.md)。

### 补充视角：前后端不分离架构在部署上的差异

在现代 Web 生态中，前后端分离已成为绝对主流，但依然存在**传统前后端不分离**的架构（如早期 JSP、PHP、Thymeleaf、Django Templates 等模板引擎单体应用）：

- **架构特征**：HTML 页面由后端进程在收到请求时动态拼装生成，静态资源（CSS/JS）通常直接内嵌在 Jar 包或后端源码工程中（如 `src/main/resources/static/`）。
- **部署运维差异**：
  1. **发布操作集退化为 1 个**：不存在独立的 `dist/` 静态覆盖操作集。即便只修改了页面上的一个按钮样式或文案，也必须**重新编译全量应用产物并重启后端进程**；
  2. **Nginx 角色退化为纯反代**：Nginx 无需在本地挂载 `dist/` 文件目录，所有流量（包括首页 HTML 与静态资源请求）均由 Nginx 一律反向代理转发给 Spring Boot / Tomcat 进程。
- **现状认知**：在当今多端适配（Web、小程序、App 共享同一套 RESTful API）与前后端专业分工的背景下，传统服务端模板渲染在新项目中已较少作为首选，多见于遗留系统维护或极简的内部管理后台。

## 参考

1. [Spring Boot 官方文档](https://spring.io/projects/spring-boot)
2. [Flask 官方文档](https://flask.palletsprojects.com/)
3. [systemd 单元文件](https://www.freedesktop.org/software/systemd/man/systemd.unit.html)
4. [gunicorn 部署指南](https://docs.gunicorn.org/en/stable/deploy.html)
