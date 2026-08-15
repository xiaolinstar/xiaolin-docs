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

前两篇我们处理的对象都是“一堆 HTML / CSS / JS”——构建产物是文件，部署动作是把文件放进 Nginx 目录。但这只是软件应用的一种形态。在正式展开“后端服务”之前，有必要先把“软件应用”这盘棋铺开，看清楚 03 篇要解决的问题在整体里处在哪个位置。

## 软件应用的三种主要形态

按“用户最终如何获得应用”分，当今主流软件应用大致有三类：

| 类型 | 例子 | 用户如何获得 | 运行环境在哪 |
| --- | --- | --- | --- |
| **Web 应用** | 博客、电商、文档站、SaaS 后台 | 浏览器访问 URL | 服务端 |
| **移动客户端** | Android / iOS / 鸿蒙 App | 应用商店下载 | 用户手机 |
| **PC 客户端** | Windows / Mac / Linux 桌面应用 | 官网下载或商店分发 | 用户电脑 |

三类应用的部署方式差别很大：

- **Web 应用**：用户不下载任何东西，每次通过浏览器访问，**运行环境完全在服务端**，用户电脑只需要一个浏览器。改一行代码，刷新即生效——这也是 01 篇、02 篇讨论的全部内容。
- **移动客户端**：用户从应用商店下载到手机，**运行环境在用户设备上**，服务端只负责提供 API、推送通知、版本检测。代码改完，要重新打包、走商店审核（Android 通常几小时，iOS 通常 1–3 天），然后用户去更新。
- **PC 客户端**：用户从官网下载安装包，**运行环境在用户电脑**，服务端的责任和移动端类似——提供 API、检测更新。Windows / Mac 客户端常见“开机自启 + 后台常驻 + 自动更新”的形态。

**对本系列而言，聚焦的是 Web 应用和服务端应用**——它们是运维工程师的主战场：Web 应用需要服务端持续提供响应，服务端应用（后端进程、消息队列消费者、定时任务、后台 worker）更是天然就需要持续运行。移动客户端和 PC 客户端的“应用本身部署给用户”这件事，不在本系列的关注范围内——它们对应的服务端责任，正是我们要讨论的“服务端应用”。

## 本篇聚焦：服务端应用

01 篇讲的 Nginx {{term:静态资源}}代理，严格说是 **Web 应用的最简形态**——只有静态资源，没有后端逻辑。用户访问 `http://my-blog.com`，Nginx 直接把 `index.html` 返回，服务就结束了。

但绝大多数 Web 应用不只是静态页面——购物车、登录、订单、评论，这些都需要“记住用户、读写数据、处理业务逻辑”。这一层**不在浏览器里运行**，而在服务器上以**进程**的形态跑着：

```
浏览器（消费 HTML/CSS/JS）
    ↓ HTTP
Nginx（公网入口，80/443）
    ↓ 反向代理
Java / Python 进程（8080/8000，处理业务）
    ↓ 读写
MySQL / Redis / Kafka（数据与中间件）
```

这就是本篇要展开的事：**当部署对象从“静态文件”升级成“需要{{term:运行时}}、依赖库、外部服务的后端进程”时，前两篇的工具还够用吗？哪里不够？**

这一篇围绕两个新问题展开：

1. **在哪构建**：服务器构建，还是本地构建后传产物？
2. **在哪跑**：让进程 24 小时后台挂着：怎么启动 + 怎么脱离终端，让进程在公网反代下持续响应？

## 链路结构没变：还是”用户 → 服务器进程 → 返回”

前 02 篇里那个”处理请求并返回响应”的角色一直都在——它叫 Nginx：默认监听 80/443 端口，把请求通过{{term:反向代理}}（替后端接收公网请求，用户只认识 Nginx 这个入口）转给后端服务进程（或者自己直接返回静态文件）。我们没显式讨论”进程”，是因为 Nginx 把这件事**藏起来了**——它几乎不会因为你的代码内容挂掉，存在感很低。

后端不一样：进程换成你自己启的 Java / Python 进程。但**链路结构没变**——都是”用户浏览器 → 服务器上一个进程在监听端口 → 处理后返回响应”。区别只是：前端的进程是 Nginx，后端的进程是用户自己拉起的 Java / Python。

链路看起来是这样：

```
前端：浏览器 → Nginx(:80/443，公网入口) → 读 dist/ 文件 → 返回 HTML/CSS/JS
后端：浏览器 → Nginx(:80/443，公网入口) → 反代到 :8080 → Java/Python 进程 → 返回 JSON
                                 ↑
                          这一段由 Nginx 维护
                          后端进程一般监听内部端口，不直接暴露公网
```

**客户端只跟 Nginx 通信**——它根本不知道后端进程的端口是什么。后端进程死了，客户端看到的是”502 Bad Gateway”，但**它不知道是 Nginx 挂还是后端挂**。

这样看，前端和后端在”部署”这件事上的差异，本质只有两条：

1. **进程由谁拉起**——前端进程（Nginx）由云服务器或操作系统的标准流程启动；后端进程要自己拉起、自己保活。
2. **进程挂了用户怎么感知**——前端进程挂了是基础设施问题；后端进程挂了是**应用层问题**，运维要先怀疑后端、再去查 Nginx 日志。

用两个最常见的栈对比看：

**这是典型部署示意**——它假设已经用 Nginx 反向代理。但**本篇不要求 Nginx**：后端进程**默认**直接监听 :8080/8000 即可（个人开发者起步、内网服务、K8s 内部都这样）。**当规模上去**、需要软负载 + 网络隔离 + 浏览器跨域规避 + 静态资源代理 + TLS 终止 等能力时，Nginx 才是最佳实践。

**前后端对等**：两者都是云服务器上某个进程在监听端口、读请求、返回响应。区别只在**部署对象类别**：

| 维度 | 前端部署 | 后端部署 |
| --- | --- | --- |
| 部署对象 | `dist/` 文件系统层 | 带运行时的进程（jar / wheel + JVM / Python） |
| 部署动作 | scp 文件到 Nginx 目录 | scp 产物 + 拉起进程 + 监听端口 |
| 进程类型 | Nginx | Java / Python |
| 客户端可见 | Nginx 进程（直接打） | Nginx 反代后的后端进程（后端进程一旦挂掉，客户端才会看到 502） |

依赖上看，后端比前端厚一叠：除了 Nginx 这层「系统级」依赖，还要叠加 `pom.xml` / `pyproject.toml` 这层「业务级」依赖，版本要对齐、编译环境要齐备、跨平台要一致。**部署对象从文件系统层抬到带运行时层，是这一篇要讲的关键跃迁**——进程挂起的难度也跟着抬一档，但**运维动作的本质是同一种**（拉起、监听、保活）。

接下来我们要先建立**静态资源 / 动态资源**的概念——这是 03 篇讨论"在哪跑"的前置知识。

## 静态资源与动态资源


### 静态资源：Nginx 直接服务

- **服务的对象**：HTML / CSS / JS / 图片 / 字体等文件
- **特点**：部署后不再由服务器生成，服务器只做"读文件 → 返回"的动作
- **典型 Web 服务器**：Nginx、Apache、Caddy
- **本系列**：02 篇里 Nginx 已经在做这件事——把 `dist/` 里的文件读出来返回

### 动态资源：Tomcat / gunicorn

- **服务的对象**：请求触发服务端代码 → 动态生成 HTML / JSON 等内容
- **特点**：每次请求都要跑代码、读数据库、调用其他服务
- **典型 Web 服务器**：
  - **Java 侧**：Tomcat（Spring Boot 默认内嵌）
  - **Python 侧**：gunicorn / uvicorn（WSGI / ASGI）
- **本系列**：03 篇要解决的就是这个问题——怎么让动态资源服务稳定挂起

### 静态与动态的核心差别

| 维度 | 静态资源 | 动态资源 |
| --- | --- | --- |
| 服务对象 | 文件（最终形态） | 触发的代码 |
| 服务动作 | 读文件 → 返回 | 跑代码 → 生成内容 |
| 计算成本 | 几乎为 0 | 每次请求都跑 |
| 缓存友好性 | 文件可缓存 | 难缓存（每次结果可能不同） |
| 典型 Web 服务器 | Nginx | Tomcat / gunicorn |

到这里"前端 / 后端"和"静态 / 动态"两个二分法对齐了：前端用 Nginx 处理静态资源，后端用 Tomcat / gunicorn 处理动态资源。

动态资源服务器的具体实现，就是 Java Spring Boot（内嵌 Tomcat）和 Python Flask（用 gunicorn 部署）这两个服务端应用栈——下一节展开。

## 服务端应用开发

承接上节的链路图：02 篇里的 Nginx 也是同类进程（监听 :80，处理静态文件，属基础设施层）；03 篇讨论的是**承载业务逻辑的后端进程**——接收请求、调用代码、读数据库、动态生成响应。这类进程默认监听 :8080（Spring Boot）/ :8000（Flask + gunicorn）即可（Nginx 反代的适用场景详见本篇延伸阅读）。

当下最流行和常见的两个栈：**Java SpringBoot** 和 **Python Flask**。

### Java SpringBoot

Spring 生态的脚手架——开箱即用，约定大于配置（starter）、Java 后端的事实工业标准。

- **监听端口**：默认 8080
- **依赖声明**：`pom.xml`（Maven）/ `build.gradle`（Gradle）
- **启动命令**：`java -jar app.jar`（内嵌 Tomcat 作为 Servlet 容器）
- **关键优势**：fat jar 把代码、依赖、JDK 运行时打成一个自包含的产物，跨机器传产物最方便
- **关键约束**：JVM 启动 5–15 秒；classpath / 堆内存 / GC 绕不开

### Python Flask

轻量 WSGI 微框架——"小而精"，适合 API / 中小服务。

- **监听端口**：Flask 自带 dev server 默认 5000（仅本地开发用）；生产用 gunicorn 时默认 8000
- **依赖声明**：`pyproject.toml`（PEP 621 标准）
- **启动命令**：`gunicorn app:app`（生产，WSGI server）/ `python app.py`（仅 dev，Flask 自带 dev server）
- **关键优势**：上手快、生态深
- **关键约束**：跨机器传产物要看 Python 解释器 + 系统库的脸色；C 扩展包（如 `psycopg2`、`numpy`）最易踩坑

### 服务端应用栈基础

Spring Boot 和 Flask 对开发者、运维工程师都是**必须了解的基本知识**——一个跑在 JVM 上、fat jar 自洽；一个跑在 Python 解释器上、虚拟环境与系统库强耦合。

## 三栈构建对比

三栈横向对比：

| 步骤 | 前端（VitePress / Vite） | Spring Boot（Java） | Flask（Python） |
| --- | --- | --- | --- |
| 依赖声明 | `package.json`（npm） | `pom.xml`（Maven） / `build.gradle`（Gradle） | `pyproject.toml`（PEP 621 标准） |
| 依赖管理 | `pnpm install` | `mvn dependency:resolve` / `gradle dependencies` | `pip install -e .` / `uv sync` |
| 构建产物 | `dist/` 静态文件 | 可执行 jar / war | 源码 + 虚拟环境 / `pip freeze` 锁文件 |
| 启动命令 | 无（产物是文件，由 Nginx 读） | `java -jar app.jar` | `python app.py`（生产用 `gunicorn app:app`） |
| 配置文件 | （基本不用） | `application.yml` / `application.properties` | 环境变量 / `config.py` |
| 外部依赖 | （基本没有） | MySQL 驱动、Redis 缓存等 | MySQL 驱动、Redis 缓存等 |

### 两类构建部署路线，相同的痛点

**路线 A · 服务器构建**：`git pull` 源码 → 服务器上 `mvn package` / `pip install` → 启动。

- Maven 首次下载依赖要十几分钟；`pip install psycopg2` 这类带 C 扩展的包需要服务器装 `libpq-dev`。
- 服务器 CPU/内存被构建过程占用，可能影响正在运行的线上服务。
- 本地是 Java 17，服务器是 Java 11——构建直接失败。

**路线 B · 本地构建后传产物**：本地 `mvn package` 出 jar / 本地 `pip install` 出 wheel → 上传 → 服务器启动。

- Spring Boot 的 jar 相对干净（自带依赖），跨机器跑成功率高。
- Flask 的 `pip install` 产物是**针对构建时的操作系统编译的 `.so` 文件**——本地 macOS 编译后上传到 Linux 服务器常常 `GLIBC_2.28 not found`；即便本地是 Linux，挪到镜像 / glibc 版本不一致的服务器同样可能出问题。
- 「在我电脑上能跑」——本地环境 ≠ 服务器环境，本地产物 ≠ 服务器能用的产物。

两种路线都解决不了所有问题：**Spring Boot 因为自带 fat jar 比 Flask 更有{{term:可移植性}}，但两类栈共享同一个根本问题：构建动作和运行环境是割裂的——我们只传了代码和依赖，没传“运行环境本身”。**

**补充说明**：前端**同样**有构建路线问题——`npm run build` 也是资源密集型任务（大型 webpack / vite 工程 CPU/内存吃紧）。但**因为前端产物是 `dist/` 静态资源 + 可迁移性强**（HTML / CSS / JS / 字体跨系统一致），这两个痛点（资源占用 / 跨平台）的影响比后端轻得多——本地构建后 `scp` 上去即可，与 02 篇的路径完全一致。换句话说：**前端产物的强可迁移性自然补偿了构建痛点的影响**，这才是前端构建路线看起来"轻松"的根本原因。

![两类构建部署路线对比](https://media.xiaolin.fun/docs/img-server-side-deploy/diagram-build-route-a-vs-b.png)

## 三类被低估的运维痛点

上面那两类痛点——“构建时长”“跨平台产物不一致”——更多是**技术视角**。真实部署还会撞上**运维视角**的三类问题，跟栈无关，跟“在哪构建”有关。

### 痛点一 · 服务器会变“脏”

只要走“服务器构建”路线，服务器就不可避免地变脏：

- 装 Java？装 `maven`，配置 `JAVA_HOME` 和 `MAVEN_OPTS`。
- 装 Python？装 `pip`，可能再装 `pyenv`、再装 `virtualenv`。
- 装 Node？装 `nvm`，挂一堆 npm 全局包。

更麻烦的是**版本对齐**：本地 Java 17，服务器也是 Java 17——这条不靠自动工具很难守住。半年后本地的项目换到 Java 21，服务器没升，构建直接失败，**生产服务器成了“另一台开发机”**，还要小心不要让 apt 升级顺手把 JDK 也升级了。

“在服务器上跑业务进程”和“在服务器上装构建工具”是两类完全不同的责任——混在一起，服务器就开始变得不可控。

### 痛点二 · 构建是重资源任务，进程是轻资源任务

服务器的工作是**运行一个常驻进程**——Spring Boot 应用监听 8080，每秒处理几十个请求，CPU / 内存占用稳定。

构建不一样。`mvn package` 第一次要下载几百 MB 依赖、还要编译 Java 源码；`pip install numpy` 要从源码编译 C 扩展，**编译 / 链接是 CPU 密集 + 内存密集**——短时间把 CPU 打满、内存吃光。

如果在同一台服务器上**边跑线上服务边构建**：

- 构建期间响应延迟飙升
- 极端情况下 OOM（Out of Memory）导致应用进程被内核杀掉
- 更隐蔽：构建过程产生的临时文件、缓存目录、`target/` / `.venv/` 等占用磁盘

把构建和运行**混在同一台机器上**，短期能跑，长期必出问题。

### 痛点三 · 网络环境不对等

“本地能装的东西，服务器不一定能装”——这不是机器差异，是**网络环境差异**：

- **本地**（Mac / 办公网）：访问 `docker.io`、`registry.npmjs.org`、`repo.maven.apache.org`、`pypi.org` 通常很顺畅。
- **{{term:云服务器}}**（特别是国内云）：上面那些源常常慢、不稳、甚至被墙。要么挂代理，要么换镜像源，要么干脆“构建在本地做，产物传上去”。

这意味着“服务器构建”路线在网络层就多一道门槛——除非你提前配好镜像源 / 私有仓库 / 代理，否则 `mvn package` 等上十几分钟是常态。

### 三类痛点的共同方向

| 痛点 | 表面症状 | 根本原因 |
| --- | --- | --- |
| 服务器变脏 | 包管理器冲突、版本不一致 | 构建工具和运行时共用一台机器 |
| 构建打满资源 | 线上服务卡顿 / OOM | 构建任务和运行任务共享资源 |
| 网络不对等 | 依赖下载慢 / 失败 | 服务器网络环境受限 |

![三类运维痛点汇总](https://media.xiaolin.fun/docs/img-server-side-deploy/diagram-three-pain-points.png)

三类痛点指向**同一个方向**：**构建动作不该和运行动作挤在同一台服务器上**。大型企业通常有两条成熟路径——

- **专门的 Build Server / CI Server**（构建机）：资源密集型服务器专门跑构建（CI 流水线或 Build Farm），与运行服务器物理分离
- **容器化（05 篇）**：把”代码 + 依赖 + 运行时”打成一个镜像，服务器只**跑**这个镜像，不再装任何构建工具

两条路径作用维度不同——前者剥离”构建动作”，后者打包”运行环境”——**可以叠加使用**。本系列的渐进路径是**先谈容器化**（更轻、个人开发者起步成本低），后续如果需要再聊 Build Server 的工程实践。

痛感解药——把”代码 + 依赖 + 运行时”打包成镜像——是 05 篇 Docker 的事。眼下的问题更朴素：**服务器上已经构建出来了，怎么让进程稳定挂起、每天 24 小时不挂？**

## 让后端进程稳定挂起 24 小时

后端进程要长期运行——不是「调试一次按 Ctrl+C 退出」那种开发期模式。进程默认监听 :8080/8000（Spring Boot 默认 8080，Flask + Gunicorn 默认 8000），关了就有 502。本篇聚焦「怎么让进程稳定挂起」这个核心问题。

启动命令：

```bash
# Spring Boot（通常监听 8080；可走 Nginx 反代，也可直接暴露公网）
java -jar app.jar

# Flask（生产用 gunicorn；通常监听 8000，同上）
# `app:app` 是 gunicorn 的 module:variable 写法，指向 Flask 应用对象（通常在 `wsgi.py` 或 `app.py` 里以 `app = Flask(__name__)` 定义）
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

启动之后还要管两件事——**前台调通**和**后台挂稳**：

| 维度 | 前端（Nginx） | 后端（Java/Python 进程） |
| --- | --- | --- |
| 进程类型 | 你装的 Nginx（02 篇 `apt install nginx`） | 你启的 JVM / Gunicorn |
| 端口 | 80 / 443（公网） | 8080 / 8000（内部，由 Nginx 反代进来） |
| 客户端能不能直接看到进程 | 能（直接打 Nginx） | **不能**（必须经过 Nginx 反代） |
| 进程挂了用户怎么感知 | Nginx 自身 502 | Nginx 502，但 Nginx 还在——运维要先怀疑后端 |
| 重启策略 | 替换文件即可（无需重启进程） | kill 旧进程 → 启动新进程 → 健康检查 |
| 配置变更 | 极少 | DB 连接串、密钥、特性开关（环境变量或配置文件） |
| 日志 | Nginx access log | 应用 stdout + 框架日志（Spring Boot / Flask） |
| 内存管理 | Nginx 自身 worker | JVM 堆内存 `-Xmx`、Python 进程数 |

Nginx 也是进程——它一样需要后台挂稳。02 篇里你用 `apt install nginx` 装了它，它默认通过 {{term:systemd}} 拉起；Java / Python 进程和它没有本质不同，只是后端的"后台挂稳"在这一篇才刚开始。

进程从「前台调试」切换到「后台挂稳」的最朴素方式：

```bash
# 临时调试：终端关了就退出
java -jar app.jar

# 临时后台：终端关了仍在跑（日志默认落到当前目录的 nohup.out）
nohup java -jar app.jar &

# 后台脱离终端：日志走文件，进程不占前台
nohup java -jar app.jar > /var/log/myapp.log 2>&1 &
```

启动后立即做这两件事：

```bash
# 1. 验证进程在跑
ps -ef | grep java          # Spring Boot
ps -ef | grep gunicorn      # Flask

# 2. 验证可访问
curl -I http://your-public-IP:8080     # Spring Boot 健康检查
curl -I http://your-public-IP:8000     # Flask / Gunicorn

# 3. 排查时抓日志
journalctl -u myapp -n 100 -f           # systemd 方式
tail -f /var/log/myapp.log              # nohup + log 文件方式
```

```mermaid
flowchart LR
    A([启动进程]) --> B[前台运行\njava -jar / gunicorn]
    B --> C[后台挂起\nnohup ... &]
    C --> D{验证}
    D -->|ps / curl 通过| E[✅ 稳定运行]
    D -->|502 / 进程不在| F[排查日志\njournalctl / tail -f]
    F --> C
```

<details>
<summary>📐 静态信息图 Prompt（可选升级）</summary>

```
Notion style minimalist line art infographic, hand-drawn marker stroke texture. 16:9 aspect ratio.

Horizontal flow left to right with a feedback loop:
  Step 1 (gray #8c8c8c): 启动进程 (play button icon)
  Step 2 (gray #8c8c8c): 前台运行  java -jar / gunicorn
  Step 3 (blue #1890ff): 后台挂起  nohup ... &
  Step 4 (diamond decision node, gray): 验证 ps / curl
    -- 成功 path (green checkmark, orange #fa8c16 accent): → 稳定运行
    -- 失败 path (red dashed): → 排查日志 journalctl/tail -f → 循环回 Step 3

Clean white background with lots of negative space. No gradients, no 3D effects, no shadows.
```

预期产物路径：`docs/public/images/img-server-side-deploy/diagram-process-lifecycle.png`
CDN 引用：`https://media.xiaolin.fun/docs/img-server-side-deploy/diagram-process-lifecycle.png`
</details>


进程挂了，验证命令先告诉你为什么不挂；下一步再考虑怎么让它自动活过来。

### Spring Boot 独有

- JVM 启动慢、预热慢；要理解 classpath、堆内存、GC。
- fat jar 让「跨机器传产物」这条路线**变得可行**——它把代码、依赖、JDK 运行时打成一个自包含的产物。对比 02 篇的 `dist/` 是文件系统层的纯静态文件，jar 已经是**带运行时**的产物，是镜像层前一步。这就是 Spring Boot 的天然优势。

### Flask 独有

- Flask 自带的 `app.run()` 是 dev server，**{{term:生产环境}}不能用**（性能差、稳定性差、无并发处理）。典型场景：本地开发时 `python app.py` 启动的就是它——端口 5000、控制台日志、单线程，适合“改一行看一行”，**不适合扛线上流量**。
- 生产用 `gunicorn`（同步）或 `uvicorn`（异步 ASGI）这类 {{term:WSGI}} / {{term:ASGI}} server。

## 真实生产：应用 + 中间件 + 数据库

### 应用不只是进程：还有中间件和数据库

上面讨论的”应用进程”（Spring Boot / Flask）是用户自己启的，但**真实生产环境里，后端服务从来不是孤岛**——它还要连一组外部依赖：

| 类型 | 例子 | 作用 |
| --- | --- | --- |
| **应用本身** | Spring Boot / Flask 进程（本篇核心） | 处理业务逻辑 |
| **缓存** | Redis / Memcached | 加速读、削峰 |
| **消息队列** | Kafka / RabbitMQ | 异步、解耦、削峰 |
| **搜索** | Elasticsearch | 全文检索、日志分析 |
| **数据库** | MySQL / PostgreSQL / MongoDB | 持久化 |

严格说 DB 属于”数据持久化{{term:中间件}}”——广义中间件指一切位于操作系统和应用之间的支撑服务，DB 显然在内；本文为了把”不可丢失的数据”单独强调出来，把 DB 单列一行：**任意一个依赖连不上，后端对用户都是 502**——和应用进程挂了是一模一样的脸。但运维排查方向不一样：进程挂了查 JVM / Gunicorn 日志，中间件挂了查 Redis / Kafka 日志，DB 挂了查慢查询、连接数、磁盘。

这一篇先聚焦**应用进程本身**的部署与保活——它是开发者最熟悉的入口。中间件与 DB 的部署、扩容、迁移、监控是独立的大话题：本系列 05 篇的 Docker 容器化、08 篇的 Docker Compose 会把”应用 + 中间件 + DB”一起编排进同一个声明文件，**”依赖”从散落在服务器各处的进程变成一份 `docker-compose.yml`**——本篇先按下不表。

## 怎么保活：进程死了谁拉起来

{{term:进程保活}}是这一篇的新维度，前 02 篇根本没碰到。

详细路径：

**构建产物**（fat jar / wheel + 依赖声明 `pom.xml` / `pyproject.toml`）→ **进程拉起**（`java -jar` / `gunicorn`）→ **后台挂着**（nohup / systemd）→ **验证 + 排查**（`ps -ef` / `curl -I` / `journalctl`）

放到生产部署里，这条路径通常长这样：

**客户端 → Nginx(:80/443) → 反代到 :8080/8000 → 后端进程** —— Nginx 充当”软负载 + 网络隔离 + 浏览器跨域规避 + 静态资源代理 + TLS 终止”多个角色（延伸阅读展开过）

但**本篇不要求 Nginx**——服务端进程**默认**直接监听 :8080/8000 即可，**本篇讲的是「后端进程怎么挂稳」**——这条路径与 Nginx 是否启用无关。

这一篇揭示的根本问题：**构建动作和运行环境割裂**——05 篇 Docker 用「把运行时打包成镜像」从根本上缓解。

将服务注册为 {{term:systemd}} unit 才是生产级保活。把下面的内容保存为 `/etc/systemd/system/myapp.service`（系统级路径，需 `sudo`）：

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
# 日志默认走 journald，可用 `journalctl -u myapp` 查看（无需配置）

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now myapp
sudo systemctl status myapp
```

Flask 用 `gunicorn` 的 systemd unit 结构一样，只是 `ExecStart` 换成 `gunicorn ...`。服务器重启后：`nohup &` 启的进程随 SSH 会话一起消失，只有 `systemctl enable` 注册的服务会随开机自启——这是”保活”从一次性调试升级为生产级保障的最小动作。

**保活**这一层一旦加上，”部署”就从”传文件”升级成了”传文件 + 拉起服务 + 失败自愈”三件事。

## 闭环回到 02 节的范式

这一篇更准确的定位其实是”**范式显式化**”——前 02 篇默认掉的隐含项，现在要变成显式项。

02 篇的 $\forall x \in X,\ f(x) = c$ 三个符号都不换，只是各自的内涵扩了一层；同时 $Y$（操作序列）拆成两段：

- $X$：从”静态站点源码”扩到”后端源码 + 业务级依赖声明”（`pom.xml` / `requirements.txt`）——集合的本质不变，只是能装的范围变大了
- $f$ 的动作链：从”构建 → 上传 → 验证”扩到”`git pull` → `mvn package` / `pip install` → 启动 JVM / Gunicorn → systemd 保活”——同样是一组步骤，只是每一步的内部变重了
- $Y$：从 02 篇的单一操作序列拆成”构建序列”与”运行序列”两段——构建可在本地或专用构建机完成，运行固定在服务器，二者不再挤在同一台机器上
- $c$：从单一的”公网通”拆成两层，公式化为：

$$
c = c_{\text{infra}} \cap c_{\text{app}}
$$

- $c_{\text{infra}}$：Nginx 等基础设施层存活（公网入口能响应）
- $c_{\text{app}}$：后端应用进程也存活（Nginx 反代得到正常响应，不再 502）

后端进程死了 → Nginx 502 → $c_{\text{app}}$ 失效 → $c$ 失效——**”保活”是应用层责任，但用户感知和基础设施层同一张脸**。这就是为什么这一篇要新增”进程保活”这一段动作：动作结构没变，**约定的结果扩了一层**。

和前两篇呼应：$f$ 的内涵在升级，$X$ / $c$ 的边界在扩容，但每次都是一次平稳的扩容——前 02 篇默认掉的隐含项，被显式地纳入范式。

## 小结

这一篇更准确的定位是**范式显式化**：前端和后端在”服务器进程”这件事上是**同一个东西**——区别只在于前端的进程由 Nginx 承担，后端的进程由用户自己启的 Java / Python 承担，**链路结构没变**（用户 → Nginx → 处理 → 返回），变的只是 Nginx 后面那个进程是什么、谁负责拉起、谁负责保活。

后端相比前端要新管三件事：**构建策略**（构建动作在哪做）、**进程生命周期**（启动、监听、重启）、**进程保活**（死了谁拉起）。Spring Boot 自带 fat jar 让产物更可移植，Flask 跨机器则要看 Python 解释器和系统库的脸色——但两类栈的共同痛点都是”代码 / 依赖 / 运行环境割裂”。

下一步进入 [第 04 篇](./git-github.md)：版本管理解决代码追踪问题，但运行环境一致性需要后续容器化——05 篇的 Docker 将登场。

## 流程角色：谁发起 / 谁执行 / 谁审批

- **谁发起**：开发者决定交付构建产物（本地构建）还是源码（服务器构建），交接物不同，服务器要承担的责任就不同
- **谁执行**：运维或开发在服务器上拉起进程、配置 systemd 保活
- **谁审批**：本步无审批；但启动参数一旦写进 systemd unit，后续改动即属{{term:生产变更}}，应走确认流程
- **职责边界**：启动参数（端口、内存、环境变量）由谁定、进程由谁保活，必须在项目里显式说清——否则“我本地能跑”和“服务器上 502”会成为两类互相甩锅的问题

## 思考

1. Flask 的 `python app.py` 本质上是启动了 `app.run()` 这个 dev server。它在生产环境**不应该用**——为什么？生产应该用 `gunicorn` 或 `uvicorn` 替代，核心差距在哪？
2. 服务器上 `pip install psycopg2` 失败提示缺 `libpq-dev`，这属于“服务器构建”还是“本地构建”路线的问题？
3. `nohup java -jar app.jar &` 和 `systemctl start myapp` 有什么区别？服务器重启后谁会活下来？
4. 这一篇比前两篇的部署动作多出了**哪一类新动作**？（提示：Nginx 在 02 篇装完后不需要你手动管它的生命周期，但 Spring Boot / Flask 进程你需要显式处理哪件事？）

## 延伸阅读：Nginx 角色的单一职责

前面把前后端统一为"同一种服务器进程"——这是入门理解。更精确地说：**Nginx 在典型部署里同时承担两个角色**。

### Nginx 的两个角色

- **Web 服务器**：处理静态资源（HTML / CSS / JS / 图片 / 字体）
- **反向代理 / 软负载**：把请求转给后端服务（Spring Boot / Flask）

这两个角色在常见部署里**是同一个 Nginx 进程同时承担的**——节省资源，但**把两个职责耦合在同一个进程里**。

### 浅显理解的边界

"前端比后端薄一层"其实是说：前端把"软负载"和"Web 服务器"**合并**在一层里。看起来简单，底层是**复用了软负载 + Web 服务器的双重能力**——这两件事归一个进程，所以"前端那一层"实际承担了后端要做的事的一半。

### 单一职责的最佳实践

把这两个角色**分离**到不同进程或服务：

| 角色 | 承担者 | 职责 |
| --- | --- | --- |
| Web 服务器（静态） | CDN / Nginx / Apache | 只读静态文件 |
| 反向代理 / 软负载 | Nginx / Envoy / HAProxy | 只做流量分发 |
| 业务服务 | Spring Boot / Flask | 处理业务逻辑 |

这样做的好处：

- **职责分离**：每个组件做一件事
- **可替换**：CDN 替代 Nginx 做静态、Envoy 替代 Nginx 做反代，互不干扰
- **可扩展**：静态和动态可以独立扩容

### 现实妥协

对个人开发者 / 小项目而言，**单个 Nginx 同时承担两个角色是务实选择**——省运维、省成本。规模上去后再考虑分离。

## 参考

1. [Spring Boot 官方文档](https://spring.io/projects/spring-boot)
2. [Flask 官方文档](https://flask.palletsprojects.com/)
3. [systemd 单元文件](https://www.freedesktop.org/software/systemd/man/systemd.unit.html)
4. [gunicorn 部署指南](https://docs.gunicorn.org/en/stable/deploy.html)
