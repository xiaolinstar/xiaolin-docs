---
title: 04 ｜ 服务端应用部署：依赖、运行时与进程保活
description: 从静态站点升级到带运行时的服务端应用，以 Spring Boot 与 Flask 双栈示例展开「构建策略 / 进程生命周期 / 进程保活」三个新维度，为容器化铺路。
date: 2026-07-10
updated: 2026-07-15
category: SRE 运维
tags:
  - DevOps
  - Spring Boot
  - Flask
  - 服务端部署
---

前三篇我们处理的对象都是「一堆 HTML / CSS / JS」——构建产物是文件，部署动作是把文件放进 Nginx 目录。这一篇要迈出新的一步：**当部署对象从「静态文件」变成「需要运行时、依赖库、外部服务的后端进程」时，前三篇的工具还够用吗？哪里不够？**

这一篇围绕三个新问题展开：

1. **在哪构建**：服务器构建，还是本地构建后传产物？
2. **在哪跑**：怎么启动一个持续运行的后端进程？
3. **怎么保活**：进程死了谁拉起来？

## 本质一致：前端后端都是「服务器进程」

前 3 篇看似在讲「静态文件」，其实**那个进程一直都在**——它叫 Nginx，是云服务器的标准预装件，开机自启、监听 80 / 443 端口，浏览器请求来了 Nginx 读 `dist/` 里的文件返回。我们没显式讨论「进程」，是因为 Nginx 把这件事**藏起来了**：它几乎不会因为你的代码内容挂掉，存在感很低。

后端不一样：进程换成你自己启的 Java / Python 进程。但**链路结构没变**——都是「用户浏览器 → 服务器上一个进程在监听端口 → 处理后返回响应」。区别只是：前端的进程是云服务器预装的 Nginx，后端的进程是用户自己拉起的 Java / Python。

链路看起来是这样：

```
前端：浏览器 → Nginx(:80/443，公网入口) → 读 dist/ 文件 → 返回 HTML/CSS/JS
后端：浏览器 → Nginx(:80/443，公网入口) → 反代到 :8080 → Java/Python 进程 → 返回 JSON
                                 ↑
                          这一段由 Nginx 维护
                          后端进程一般监听内部端口，不直接暴露公网
```

**客户端只跟 Nginx 通信**——它根本不知道后端进程的端口是什么。后端进程死了，客户端看到的是「502 Bad Gateway」，但**它不知道是 Nginx 挂还是后端挂**。

这样看，前端和后端在「部署」这件事上的差异，本质只有两条：

1. **进程是不是预装件**——Nginx 是云服务器默认装的，几乎不用管；后端进程要自己拉起、自己保活。
2. **进程挂了用户怎么感知**——Nginx 挂了是基础设施问题；后端进程挂了是**应用层问题**，运维要先怀疑后端、再去查 Nginx 日志。

依赖上看，后端比前端厚一叠：除了 Nginx 这层「系统级」依赖，还要叠加 `pom.xml` / `requirements.txt` 这层「业务级」依赖，版本要对齐、编译环境要齐备、跨平台要一致。这才是这一篇真正要展开的事——**进程从「预装件」换成「用户自己启的」，依赖从「系统级」叠到「业务级」**。

## 在哪构建：双栈对比

03 篇给出的范式是「`git push` 源码，服务器 `git pull` + 构建 + 落盘」。这条范式**仍然适用**——但「构建」这一步在后端栈里要复杂得多。用两个最常见的栈对比看：

| 步骤 | Spring Boot（Java） | Flask（Python） |
| --- | --- | --- |
| 依赖声明 | `pom.xml`（Maven） / `build.gradle`（Gradle） | `requirements.txt` 或 `pyproject.toml` |
| 依赖管理 | `mvn dependency:resolve` / `gradle dependencies` | `pip install -r requirements.txt` |
| 构建产物 | 可执行 jar / war | 源码 + 虚拟环境 / `pip freeze` 锁文件 |
| 启动命令 | `java -jar app.jar` | `python app.py`（生产用 `gunicorn app:app`） |
| 配置文件 | `application.yml` / `application.properties` | 环境变量 / `config.py` |
| 外部依赖 | MySQL 驱动、Redis 客户端、HTTP 客户端等 | 同 |

### 两类构建路线，相同的痛点

**路线 A · 服务器构建**：`git pull` 源码 → 服务器上 `mvn package` / `pip install` → 启动。

- Maven 首次下载依赖要十几分钟；`pip install psycopg2` 这类带 C 扩展的包需要服务器装 `libpq-dev`。
- 服务器 CPU/内存被构建过程占用，可能影响正在运行的线上服务。
- 本地是 Java 17，服务器是 Java 11——构建直接失败。

**路线 B · 本地构建后传产物**：本地 `mvn package` 出 jar / 本地 `pip install` 出 wheel → 上传 → 服务器启动。

- Spring Boot 的 jar 相对干净（自带依赖），跨机器跑成功率高。
- Flask 的 `pip install` 产物是**针对本地 macOS 编译的 `.so` 文件**，上传到 Linux 服务器常常 `GLIBC_2.28 not found`。
- 「在我电脑上能跑」——本地环境 ≠ 服务器环境，本地产物 ≠ 服务器能用的产物。

两种路线都解决不了所有问题。**Spring Boot 因为自带 fat jar 比 Flask 更「可移植」，但两类栈共享同一个根本问题：构建动作和运行环境是割裂的——我们只传了代码和依赖，没传「运行环境本身」。**

## 运维视角：三类被低估的痛点

上面那两类痛点——「构建时长」「跨平台产物不一致」——更多是**技术视角**。真实部署还会撞上**运维视角**的三类问题，跟栈无关，跟「在哪构建」有关。

### 痛点 1 · 服务器会变「脏」

只要走「服务器构建」路线，服务器就不可避免地变脏：

- 装 Java？装 `maven`，配置 `JAVA_HOME` 和 `MAVEN_OPTS`。
- 装 Python？装 `pip`，可能再装 `pyenv`、再装 `virtualenv`。
- 装 Node？装 `nvm`，挂一堆 npm 全局包。

更麻烦的是**版本对齐**：本地 Java 17，服务器也是 Java 17——这条不靠自动工具很难守住。半年后本地的项目换到 Java 21，服务器没升，构建直接失败。**生产服务器成了「另一台开发机」**，还要小心不要让 apt 升级顺手把 JDK 也升级了。

「在服务器上跑业务进程」和「在服务器上装构建工具」是两类完全不同的责任——混在一起，服务器就开始变得不可控。

### 痛点 2 · 构建是重资源任务，进程是轻资源任务

服务器的工作是**运行一个常驻进程**——Spring Boot 应用监听 8080，每秒处理几十个请求，CPU / 内存占用稳定。

构建不一样。`mvn package` 第一次要下载几百 MB 依赖、还要编译 Java 源码；`pip install numpy` 要从源码编译 C 扩展。**编译 / 链接是 CPU 密集 + 内存密集**——短时间把 CPU 打满、内存吃光。

如果在同一台服务器上**边跑线上服务边构建**：

- 构建期间响应延迟飙升
- 极端情况下 OOM（Out of Memory）导致应用进程被内核杀掉
- 更隐蔽：构建过程产生的临时文件、缓存目录、`target/` / `.venv/` 等占用磁盘

把构建和运行**混在同一台机器上**，短期能跑，长期必出问题。

### 痛点 3 · 网络环境不对等

「本地能装的东西，服务器不一定能装」——这不是机器差异，是**网络环境差异**：

- **本地**（Mac / 办公网）：访问 `docker.io`、`registry.npmjs.org`、`repo.maven.apache.org`、`pypi.org` 通常很顺畅。
- **云服务器**（特别是国内云）：上面那些源常常慢、不稳、甚至被墙。要么挂代理，要么换镜像源，要么干脆「构建在本地做，产物传上去」。

这意味着「服务器构建」路线在网络层就多一道门槛——除非你提前配好镜像源 / 私有仓库 / 代理，否则 `mvn package` 等上十几分钟是常态。

### 三类痛点的共同方向

| 痛点 | 表面症状 | 根本原因 |
| --- | --- | --- |
| 服务器变脏 | 包管理器冲突、版本不一致 | 构建工具和运行时共用一台机器 |
| 构建打满资源 | 线上服务卡顿 / OOM | 构建任务和运行任务共享资源 |
| 网络不对等 | 依赖下载慢 / 失败 | 服务器网络环境受限 |

三类痛点指向**同一个方向**：**构建动作不该和运行动作挤在同一台服务器上**。要么把构建搬到另一台专门的「构建机」，要么把构建**连同它的运行环境**一起打包、让运行时容器化——下一篇的 Docker 就是后者：把「代码 + 依赖 + 运行时」打成一个镜像，服务器只负责**跑**这个镜像，不再装任何构建工具。

## 在哪跑：进程要「持续活着」

前 3 篇里那个「进程」叫 Nginx——云服务器预装件，开机自启，几乎不会因为你的代码而死。后端进程不一样：是你手动启的，要监听内部端口、要持续响应、要能被重启。**它对客户端不可见**——客户端只看到 Nginx，看不到 `:8080` 上的 Java 进程。

```bash
# Spring Boot（监听内部端口 8080；不直接暴露公网，由 Nginx 反代进来）
java -jar app.jar

# Flask（生产用 gunicorn；同上监听内部端口，不直接暴露公网）
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

启动之后还要管这些事：

| 维度 | 前端（Nginx） | 后端（Java/Python 进程） |
| --- | --- | --- |
| 端口 | 80 / 443（公网） | 8080 / 8000（内部，由 Nginx 反代进来） |
| 客户端能不能直接看到进程 | 能（直接打 Nginx） | **不能**（必须经过 Nginx 反代） |
| 进程挂了用户怎么感知 | Nginx 自身 502 | Nginx 502，但 Nginx 还在——运维要先怀疑后端 |
| 重启策略 | 替换文件即可 | kill 旧进程 → 启动新进程 → 健康检查 |
| 配置变更 | 极少 | DB 连接串、密钥、特性开关（环境变量或配置文件） |
| 日志 | Nginx access log | 应用 stdout + 框架日志（Spring Boot / Flask） |
| 启动慢 | 无 | JVM 启动 5–15 秒；Flask 几乎瞬时 |
| 内存管理 | 无 | JVM 堆内存 `-Xmx`、Python 进程数 |

**Spring Boot 独有**：

- JVM 启动慢、预热慢；要理解 classpath、堆内存、GC。
- fat jar 让「跨机器传产物」这条路线**变得可行**——这是 Spring Boot 的天然优势。

**Flask 独有**：

- Flask 自带的 `app.run()` 是 dev server，**生产环境不能用**（性能差、稳定性差、无并发处理）。
- 生产用 `gunicorn`（同步）或 `uvicorn`（异步 ASGI）这类 WSGI / ASGI server。

## 怎么保活：进程死了谁拉起来

这是这一篇的新维度，前 3 篇根本没碰到。

```bash
# 临时调试：终端关了进程就死
nohup java -jar app.jar &

# Linux 主流：服务器开机自启 + 失败自动重启
systemctl enable --now myapp

# 容器化（后续篇章）：容器即「带运行时的产物」
docker run -d --restart=unless-stopped myapp:latest
```

这一篇**点到为止**——给一个最小的 systemd unit 样例，让读者知道「保活」是个真问题，但完整方案是后面的内容。

`/etc/systemd/system/myapp.service`（Spring Boot 示例）：

```ini
[Unit]
Description=My Spring Boot App
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
sudo systemctl daemon-reload
sudo systemctl enable --now myapp
sudo systemctl status myapp
```

Flask 用 `gunicorn` 的 systemd unit 结构一样，只是 `ExecStart` 换成 `gunicorn ...`。**保活**这一层一旦加上，「部署」就从「传文件」升级成了「传文件 + 拉起服务 + 失败自愈」三件事。

## 闭环回到 02 节的范式

这一篇更准确的定位其实是「**范式显式化**」——前 3 篇默认掉的隐含项，现在要变成显式项：

- 前 3 篇的 $Y$（公网验证通过）**早就隐含**「Nginx 进程持续运行」——只是那时候的进程是预装件，我们没显式讨论。
- 这一篇的 $Y''$ 把 $Y$ 拆开成两层：

$$
Y'' = Y_{\text{infra}} \cap Y_{\text{app}}
$$

- $Y_{\text{infra}}$：Nginx 等基础设施层仍然存活（公网入口能响应）
- $Y_{\text{app}}$：后端应用进程也存活（Nginx 反代得到正常响应，不再 502）

写成函数形式：

$$
f'' : X'' \rightarrow Y'', \quad f''(x'') = p \rightarrow q''(x'')
$$

- $X''$：后端源码空间（Spring Boot / Flask，含依赖锁文件 `pom.xml` / `requirements.txt`）
- $p$：`git push` 源码（与上一篇一致）
- $q''$：服务器动作链——和 $q$ 比起来，每一步的「内部」变重了：拉源码 → `mvn package` / `pip install` → 启动 JVM / Gunicorn → systemd 拉起 → 健康检查
- $Y''$：从单一的「公网通」拆成「Nginx 通 + 后端进程通」两层

$X''$ 没比 $X$ 多什么「本质」类型，但 $Y''$ 多了一层。后端进程死了 → Nginx 502 → $Y_{\text{app}}$ 失效 → $Y''$ 失效——**「保活」是应用层责任，但用户感知和基础设施层同一张脸**。这就是为什么这一篇要新增「进程保活」这一段动作：动作结构没变，**结果的内涵扩了一层**。

和 02 节呼应：$f$ 一直在升级，$X$ / $Y$ 一直在扩容，但每次都是一次平稳的扩容——前 3 篇默认掉的隐含项，被显式地纳入范式。

## 小结

这一篇更准确的定位是**范式显式化**：前端和后端在「服务器进程」这件事上是**同一个东西**——区别只在于前端的进程是云服务器预装的 Nginx，后端的进程是用户自己启的 Java / Python。**链路结构没变**（用户 → Nginx → 处理 → 返回），变的只是 Nginx 后面那个进程是什么、谁负责拉起、谁负责保活。

后端相比前端要新管三件事：**构建策略**（构建动作在哪做）、**进程生命周期**（启动、监听、重启）、**进程保活**（死了谁拉起）。Spring Boot 自带 fat jar 让产物更可移植，Flask 跨机器则要看 Python 解释器和系统库的脸色——但两类栈的共同痛点都是「代码 / 依赖 / 运行环境割裂」。

下一步进入 [第 05 篇](./docker-compose.md)：当这三者都要打包过去、且要保证任何机器都能跑时，容器化登场——Docker 把「运行环境」一并打进镜像，从此「在我电脑上能跑」变成「在任何机器上能跑」。

## 思考

1. Spring Boot 的 `java -jar app.jar` 和 Flask 的 `python app.py` 都启动了，但哪一个在生产环境**不应该用**？为什么？
2. 服务器上 `pip install psycopg2` 失败提示缺 `libpq-dev`，这属于「服务器构建」还是「本地构建」路线的问题？
3. `nohup java -jar app.jar &` 和 `systemctl start myapp` 有什么区别？服务器重启后谁会活下来？
4. 这一篇比 03 篇的部署动作多出了**哪一类新动作**？

## 参考

1. [Spring Boot 官方文档](https://spring.io/projects/spring-boot)
2. [Flask 官方文档](https://flask.palletsprojects.com/)
3. [systemd 单元文件](https://www.freedesktop.org/software/systemd/man/systemd.unit.html)
4. [gunicorn 部署指南](https://docs.gunicorn.org/en/stable/deploy.html)
