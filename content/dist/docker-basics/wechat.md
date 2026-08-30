# 05 ｜ 容器 Docker：让服务器回归本职

04 篇（Git 与 GitHub） 用 Commit 锁定了代码的每一次变更版本——但当 `git pull` 拉下来的源码回到服务器，依然要 `mvn package`，依然要装 JDK，依然要面对03 篇 已暴露的「服务器变脏」与「环境强耦合」。

更准确地说，04 篇末尾已经点出本篇的登场使命：**如何把"编译好的产物 + 运行环境本身"一起打包？** 这一篇的回答是把它们封装成一张不可变的自包含镜像——**容器** 由抽象理念第一次具象为可被 `docker pull` 的实体。

在传统物理机或裸虚拟机时代，应用部署始终深陷两难死局与环境污染。本篇正式引入 **容器** 与 **不可变基础设施** 的云原生理念，通过 Docker 将服务器从繁重的构建与环境依赖中彻底解放出来，让服务器回归本职——只承载业务进程、提供服务。

## 传统部署的两难死局与环境困境

在容器技术普及前，服务端部署主要有两条经典路线，但两条路线都面临着致命的物理瓶颈：

### 1. 路线 A 的困境：重资源构建拖垮线上服务

在生产服务器上 `git pull` 源码后直接执行 `mvn package` 或 `pip install`：

- **资源争抢**：源码编译与依赖打包是典型的 **CPU 与内存密集型任务**，而生产服务的本职是维持稳定的常驻进程。在同一台服务器上边跑业务边编译，极易导致线上请求超时，甚至触发 Linux 内核的 OOM Killer 将核心服务强制杀死；
- **服务器变脏**：为了完成构建，服务器必须安装 JDK、Maven、Python、Node、gcc 以及各种 C 编译头文件（如 `libpq-dev`）。生产服务器逐渐堆满开发工具链，沦为不可控的 **大号开发机**。

### 2. 路线 B 的困境：环境异构与低可移植性

为了保护服务器资源，改在开发者本地电脑编译出 `jar` 或 `wheel` 产物后再 `scp` 上传：

- **环境割裂**：开发者本地通常是 macOS 或 Windows，而服务器是 Linux。尽管 Java 的 Fat Jar 自带了字节码依赖，但只要涉及底层 C 扩展、本地库或特定的 GLIBC 版本，跨机器运行时就会直接报 `GLIBC not found` 或符号找不到；
- **低可移植性**：构建动作与运行环境割裂，产物只包含了代码，没包含“运行环境本身”，造成了经典的“在我电脑上能跑，服务器上一跑就报错”。

### 共同根源：可变基础设施——为什么两条路线都踩同一个坑

A、B 两条路线表面看是构建工具的选择，**根源却是同一种运维范式**：传统物理机运维本质上是一种 **可变基础设施**（Mutable Infrastructure，俗称宠物模式 Pets）。

- 把每台服务器当宠物悉心照料，出了问题通过 SSH 登录上去打补丁、改配置、就地升级；
- 随着时间推移，每台机器的实际环境都会逐渐偏离初始基准，产生 **配置漂移**（Configuration Drift），最终沦为谁也无法完整复刻的”雪花服务器”（Snowflake Server）。

> **一句话回顾**：本篇工具选 **Docker**——它是当下最主流的容器运行时实现；更系统的理念演进（不可变基础设施、Pets vs Cattle、CNCF 四大支柱）见文末[延伸阅读：云原生不可变基础设施](#延伸阅读云原生不可变基础设施)。

## 容器究竟是什么：与虚拟机有何区别

这一节只为破除一个误区——**容器不是“轻量级虚拟机”**。它与 DevOps 实践的真正关系：**共享宿主机内核**这一点决定了“打包一次、到处跑”，让 GLIBC / 系统库不兼容这类运维噩梦直接消失。

- **虚拟机**：Hypervisor 在硬件层虚拟出一整套 Guest OS，启动分钟级、镜像数 GB。
- **容器**：**共享宿主机 Linux 内核**，靠内核提供的视图隔离（`Namespace`）与资源配额（`Cgroups`）机制，把一个受限进程“伪装”为独立的运行环境。启动秒级、镜像数十 MB。

| 维度 | 虚拟机 | 容器 |
| :--- | :--- | :--- |
| 内核 | 独立 Guest OS | 共享宿主机内核 |
| 启动 / 镜像体积 | 分钟级 / 数 GB | 秒级 / 数十 MB |
| 对 DevOps 的意义 | 整机重建代价高 | **应用进程级换新是日常**——不可变颗粒度精确到单进程 |

**容器就是跑在宿主机内核上的一个受限进程**。它真正的价值不在“代替 VM”，而在让“不可变基础设施”的颗粒度从“整机 OS”精确到“单个应用进程”——这是 VM 时代做不到的事。

## 实体边界：镜像与容器

在操作 Docker 前，必须理清两个核心概念的动静边界：

| 概念 | 本质定义 | 类比面向对象 | 类比 Git | 运行开销 |
| --- | --- | --- | --- | --- |
| **镜像** (Image) | 只读的分层模板（包含代码、依赖、运行时与静态文件系统） | **类** (Class) | 提交快照 (Commit) | 静态存储在磁盘，不占 CPU/内存 |
| **容器** (Container) | 镜像在宿主机上的运行实例（具有可读写层与独立网络栈） | **对象** (Instance) | 工作区检出 (Checkout) | 动态常驻，占用 CPU 与内存 |

**镜像与容器之间的命令流转**——6 条命令描述完整的「拉取 → 启动 → 停止 → 销毁」状态机：

| docker 命令 | 起点 | 终点 | 关键副作用 |
| :--- | :--- | :--- | :--- |
| `docker pull registry/repo:tag` | 远端 Registry | 本地镜像（只读模板） | 镜像缓存到 `/var/lib/docker/` |
| `docker run --name X ...` | 本地镜像 | 运行中容器（独立进程） | 创建写时复制层、`-p` 暴露端口 |
| `docker stop X` | 运行中容器 | 已停止容器 | 主进程收到 `SIGTERM`，10s 后未退则 `SIGKILL` |
| `docker start X` | 已停止容器 | 运行中容器 | 复用已有的写时复制层 |
| `docker rm X` | 已停止容器 | （销毁） | 释放端口 + 写时复制层空间 |
| `docker rmi registry/repo:tag` | 本地镜像 | （销毁） | 若仍被容器引用则报错，需先 `docker rm` |

## 起一个服务的两种方式

上一节给了概念边界，本节用「起一个 Nginx 反代 / 起一个 MySQL 数据库」这个最常见的场景，把 VM 与 Docker 的实操差异落到操作层面。

VM 方式起步就重：下载 Ubuntu Server ISO，新建 VirtualBox 或 VMware 虚拟机，装系统，`apt install nginx`，改配置——30 多分钟、10 多步手动操作都算顺利；服务跑起来后还有独立 OS 内核占着内存，磁盘上更留下一个 10 GB+ 的 `vmdk`。删除时 `vmdk` 文件往往还在，Nginx 配置、`/var/log/nginx/` 日志、`/var/lib/` 数据可能半年里漂到宿主机——最后的状态谁也说不清。

Docker 把这套动作收成一句 `docker run -d -p 80:80 nginx:1.27-alpine`：镜像从 Docker Hub 拉取约 50 MB，容器秒级启动；`docker rm` 释放端口与写时复制层，`-v` 命名的数据卷可独立保留复用。顺带还带来版本与空间两个收益——同一台宿主机上 `nginx:1.25`、`nginx:1.27`、`mysql:5.7`、`mysql:8.0` 可各自跑在独立容器里互不干扰，多服务还能共享同一基础镜像（`alpine`、`ubuntu:22.04`）的只读 layer，把磁盘占用从 100 GB+ 压回几 MB 到几十 MB 的可写层。

——一句话：**创建极简、删除干净、版本可并行、空间可复用**，正是「不可变基础设施」理念在日常运维里最直接的体现。

## 容器应用：Docker 工具集

本节从 5 大核心命令起步，逐步展开 Docker 工具集的完整视图——基础命令（pull / run / ps / stop / rmi）、Docker Hub 镜像仓库、Dockerfile 镜像构建描述符，以及预告多容器场景的网络与卷：

### 1. `docker pull`：拉取不可变镜像模板

```bash
# 拉取公共仓库镜像（生产环境务必显式锁定版本 tag，严禁裸用 latest）
docker pull nginx:1.27-alpine

# 从国内云厂商拉取构建好的业务镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-org/spring-app:1.0.0
```

### 2. `docker run`：创建并启动容器实例

```bash
docker run -d \
  --name my-app \
  -p 8080:8080 \
  -v /data/logs:/var/log/app \
  -e SPRING_PROFILES_ACTIVE=prod \
  --restart always \
  registry.cn-hangzhou.aliyuncs.com/your-org/spring-app:1.0.0
```

实战核心参数拆解：

| 参数 | 功能 | 运维核心价值 |
| --- | --- | --- |
| `-d` | 后台静默运行（Detached） | 让容器主进程脱离当前 SSH 终端，避免会话退出导致服务终止 |
| `--name` | 指定容器可读别名 | 为容器赋予固定标识，后续管理直接按名称执行，无需查询容器 ID |
| `-p 8080:8080` | 端口映射 (`宿主机端口:容器端口`) | 将外部公网流量经由宿主机端口转入容器内部监听端口 |
| `-v 宿主机路径:容器路径` | 数据卷目录挂载（Volume） | **实现数据持久化与配置解耦**（容器销毁重建后日志和持久化数据不丢） |
| `-e KEY=VAL` | 注入运行时环境变量 | 动态切换运行配置（如生产数据库连接串），无需重新编译镜像 |
| `--restart always` | 容器崩溃自愈与开机自启 | **直接替代传统手写 systemd unit**，容器崩溃或系统重启由 Docker 引擎自动拉起 |

### 3. `docker ps`：查看容器运行时状态

```bash
# 查看当前正在运行中的容器
docker ps

# 查看全部容器（包含已停止、异常崩溃退出的容器）
docker ps -a
```

### 4. `docker stop` 与 `docker rm`：优雅停服与实例销毁

```bash
# 优雅停止（向容器主进程发送 SIGTERM 信号，等待 10 秒后若未退出则发送 SIGKILL）
docker stop my-app

# 销毁容器实例（释放容器写时复制层与端口占用）
docker rm my-app

# 临时排查或 CI 测试场景：容器退出后自动销毁
docker run --rm -p 80:80 nginx:1.27-alpine
```

### 5. `docker rmi`：清理本地旧镜像

```bash
# 清理废弃的旧版本镜像以释放宿主机磁盘空间
docker rmi nginx:1.27-alpine
```

> [!TIP]
> **依赖约束规则**：若某个镜像正在被某个容器（即便该容器处于已停止状态）引用，执行 `docker rmi` 将报错拦截。必须先通过 `docker rm` 销毁对应容器，方可安全删除镜像。

### 6. Docker Hub：镜像仓库

Docker 镜像需要在 `Registry`（仓库）存储与分发，类比 npm / pip 的中心包版本库。

- **公共仓库 Docker Hub**（hub.docker.com）：nginx、mysql、postgres 等官方镜像的标准来源，与 GitHub 同一集团，生态最大。
- **私有仓库**：生产镜像一般托管在阿里云 ACR、华为云 SWR、腾讯云 TCR，或自建 Harbor——网络可达性、可控性、私密性都更好。
- **镜像命名约定**：`<registry>/<repo>:<tag>`。公共仓库常省略 `<registry>` 直接写 `nginx:1.27-alpine`；私有仓库完整路径如 `registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.0`。
- **tag 是镜像的精确指纹**：生产环境必须显式锁版本（`1.0.0` 而不是 `latest`），否则上游 push 一次新镜像，所有拉取者就被动升级。

### 7. Dockerfile：把应用打包成镜像

视角 2 那条 `docker run` 命令看似只有一条，**但背后那个 `spring-app:1.0.0` 镜像究竟从哪来**？Dockerfile 就是用来描述「如何把业务代码打包成镜像」的声明式文件——本质上取代了"装 JDK、装 Maven、运行 mvn package、再写一个 shell 脚本"那一长串 03 篇的手工动作。

最小骨架（4 行覆盖 03 篇的"装 JDK + 打包 jar + 启动"全套动作）：

```dockerfile
# 1. 选基础运行时——FROM 这一行替代了"在服务器上 apt install openjdk-17"
FROM eclipse-temurin:17-jre-alpine

# 2. 把产物拷进镜像——COPY 这一行替代了"scp spring-app.jar 到服务器"
COPY target/spring-app-1.0.0.jar /app/app.jar

# 3. 声明容器进程——ENTRYPOINT 是镜像的"java -jar /app/app.jar"
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

# 4. 暴露端口——与 docker run -p 8080:8080 配合
EXPOSE 8080
```

在项目根目录执行构建并推送到私有 Registry：

```bash
docker build -t registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.0 .
docker push registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.0
```

**构建一次，任何机器拉取这条镜像跑出的进程都 100% 等价**——这就是视角 1 里 03 篇「环境异构、低可移植」问题的物理消除点。

### 8. Docker 网络与卷（预告 08 篇）

单容器场景下，本篇的命令已经够用。一旦进入"Spring Boot + MySQL + Nginx"这样的多容器组合，会立刻碰到两类新的工程诉求——本节只点一下名字，详细展开留给 08 篇 Docker Compose：

- **Docker Network**：让多个容器在同一台服务器上**互相通信**——MySQL 容器不需要对外暴露，Spring Boot 容器只需通过内部网络访问 `mysql:3306`。`docker network create` 创建网络，`--network` 参数加入。
- **Docker Volume**：让容器的数据**不被 `docker rm` 销毁**。MySQL 容器一旦 `rm`，所有数据丢失；通过 `-v mysql_data:/var/lib/mysql` 把数据写入命名卷，重启 / 重建容器数据仍在。

### 范式视角：在操作清单 $Y$ 中剥离了什么

回看 02 篇建立的形式化锚点，发布流程是一份操作清单 $Y=\{v_1,\ldots,v_n\}$。05 篇把"构建动作 $v_1$"从生产服务器的 $Y$ 中剥离，**前置到镜像阶段**——

- 原 $v_1$（构建）：服务器上即时执行 `mvn package` / `pip install`，脏服务器、环境强耦合；
- 新 $v_1'$（镜像构建）：在离线构建机或 CI 上执行，产物是不可变的自包含镜像；
- 转移到服务器侧：$v_1''$（pull）→ $v_2$（run）→ $v_3$（verify），三个轻动作闭环。

这一剥离正是 04 篇末尾留给本篇的根本问题——"如何把编译好的产物 + 运行环境打包"——的完整回答。下一步进入 06 篇（流水线基础）：把这三个轻动作写进 pipeline 配置文件，让"手动 ssh"彻底退出部署流程。

## 实战贯穿：从 03 篇的命令链到三件套编排

实战场景**从单 Spring Boot 升级为"Nginx + Spring Boot + MySQL"——这是 03 篇确立的最小生产组合，也是 08 篇 Docker Compose 的前奏**。本节通过一次生产变更的形式化映射，把三件套的动作链从 03 篇的命令式描述压缩为 $Y=\{v_i\}$ 形式化锚点，再用三条 `docker run` 落地。

### 视角 1：从 03 篇的运维负担到 05 篇的 job / step 抽象

要在 03 篇的裸机服务器上跑起"Nginx + Spring Boot + MySQL"最小生产组合，运维人员要分别对**环境资产**（装 OpenJDK、MySQL、Nginx）、**应用资产**（`scp` / `java -jar`）、**进程资产**（`systemd unit`）做手工操作。归到底层，是**环境耦合 / 进程保活 / 跨机器传输**三类共性负担在反复发生——这就是 03 篇「两难死局」的运维侧表现。

把这些动作按**两层粒度**拆开：

- **step（步骤）**：单个原子动作，如 `git pull`、`mvn package`、`scp`、`java -jar`、`docker run`
- **job（作业）**：一次完整的运维事项，由多个有序 step 组成，如"部署 Spring Boot 服务" = `git pull` → `mvn package` → `scp` → `java -jar` → 验证

形式化锚点这样升级：

$$
\begin{aligned}
Y &= \{J_1,\; J_2,\; J_3,\; J_4\} \\
J_1 &= \{v_{1a},\; v_{1b},\; v_{1c}\} \\
J_2 &= \{v_{2a},\; v_{2b},\; v_{2c},\; v_{2d}\} \\
J_3 &= \{v_{3a},\; v_{3b}\} \\
J_4 &= \{v_{4a}\}
\end{aligned}
$$

- **$J_1$（DB）**：装 `mysql-server` + `mysql_secure_installation` + 导入 SQL schema + 启动服务
- **$J_2$（App）**：`scp spring-app.jar` + 装 OpenJDK 17 + `java -jar` + 写 `systemd unit`
- **$J_3$（Nginx）**：手写 `nginx.conf` + `nginx -s reload`
- **$J_4$（verify）**：`curl -fsS http://localhost/api/health`

**job 之间的拓扑序**：$J_1$（DB）→ $J_2$（App）→ $J_3$（Nginx）→ $J_4$（verify），即「DB 就绪 → App 部署 → 反代配置 → 访问验证」。每个 job 内部也是有向无环图（如 $J_2$ 内 v_2a → v_2b → v_2c → v_2d）。

---

Docker 化的关键不是把所有 step 替换成"等价 step"，而是**把每个 job 内部的多 step 折叠到最少**——以镜像为单位的「build once, run anywhere」让 job 内部不再需要服务器上的工具链。映射形式化为 Y → Y'，Y = {J_1, J_2, J_3, J_4} 与 Y' = {J'_1, J'_2, J'_3, J'_4}：

| $J_k$ | 03 篇 job 内部 step 数 | 05 篇折叠为 | 承载物 |
| :--- | :--- | :--- | :--- |
| $J_1$ `DB` | `{v_1a, v_1b, v_1c}` | `pull mysql:8` → `run`（2 step） | 官方镜像 + volume |
| $J_2$ `App` | `{v_2a, v_2b, v_2c, v_2d}` | `build app` → `run`（2 step） | Dockerfile 构建 |
| $J_3$ `Nginx` | `{v_3a, v_3b}` | `pull nginx` → `run`（2 step） | 官方镜像 + volume |
| $J_4$ `verify` | `{v_4a}` | `curl`（不变） | 不变 |

> **核心洞察**：映射 $g$ 让每个 $J'_k$ 内部 step 数从 3-4 折叠到 2——「装环境 + 拷产物 + 写配置 + 起服务」被「pull 镜像 + run 容器」两动作取代。**$Y$ 的 job 集合不变，每个 job 内部 step 数大幅减少，job 之间拓扑序保持稳定**——这就是「容器化让运维精简」的形式化证据。

这两层粒度也为 06 篇（流水线基础） 埋下伏笔：**流水线就是把 $Y$ 写成代码、由引擎按拓扑序自动执行**——CI 与 CD 分离后，「构建镜像」与「部署镜像」就是 2 个独立 job。

### 视角 2：三件套编排的完整 docker run

视角 1 给出了形式化映射，本视角给出 Y' 的实操形态——三条 `docker run` 完整命令：

```bash
# v_1' MySQL：先启动（被 Spring Boot 引用）
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=appdb \
  -v mysql_data:/var/lib/mysql \
  --restart always \
  mysql:8

# v_2' Spring Boot：依赖 MySQL，等 MySQL 就绪后启动
docker run -d \
  --name spring-app \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_HOST=mysql \
  -e DB_PORT=3306 \
  -p 8080:8080 \
  registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.0

# v_3' Nginx：暴露公网 + 反代 Spring Boot
docker run -d \
  --name nginx \
  -p 80:80 \
  -v ./nginx.conf.d:/etc/nginx/conf.d \
  nginx:1.27-alpine
```

其中 `nginx.conf.d/api.conf`：

```nginx
location /api/ {
    proxy_pass http://spring-app:8080;
}
```

> **第 2 步 `--name spring-app` 与 `nginx.conf` 的 `proxy_pass http://spring-app:8080` 是关键**：Docker 默认桥接网络下容器名即为 DNS 名称，Nginx 容器可以直接通过 `spring-app` 这个名字访问 Spring Boot 容器——这是 § 5「Docker 网络与卷」提到的「容器互联」在朴素场景下的应用，无需手工 `--link` 或额外别名。
>
> 但启动顺序仍然是手工依赖（MySQL 先 → App 后），容易产生「MySQL 还未就绪 → App 启动失败」的时序问题。08 篇 Docker Compose 用 `depends_on` 解决这个。

### 视角 3：升级与回退——三件套场景下的「只换不修」

把视角 2 的 Spring Boot 从 `1.0.0` 升级到 `1.0.1`——在两层粒度下，这等价于**只重新执行 $J'_2$ 这一个 job**，$J'_1$ 与 $J'_3$ 保持不变：

```bash
# 1) 拉新业务镜像
docker pull registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.1

# 2) 销毁旧 Spring Boot 容器
docker stop spring-app && docker rm spring-app

# 3) 拉起新容器（参数复用视角 3 那一长串）
docker run -d \
  --name spring-app \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_HOST=mysql \
  -p 8080:8080 \
  registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.1
```

回退（应用出问题时秒回 `1.0.0`）：

```bash
docker stop spring-app && docker rm spring-app
docker run -d --name spring-app -e DB_HOST=mysql -p 8080:8080 \
  registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.0
```

> **关键边界——有状态服务（MySQL）**：MySQL 容器**不能**像 Spring Boot 那样「想 rm 就 rm」——它的数据在 `-v mysql_data:/var/lib/mysql` 命名卷里。升级 MySQL 大版本（`8.0 → 8.4`）时，先备份数据卷：
>
> ```bash
> docker exec mysql mysqldump -uroot -prootpass appdb > backup-$(date +%F).sql
> ```
>
> 然后才能 `stop + rm + run` 新版 MySQL，再用 sql 文件恢复。**不可变基础设施的「只换不修」原则不适用于有状态服务**——这是 § 5「Docker Volume」小节里必须知道的事。

### 已解决

视角 2 的形式化映射落到运维视角上，本质上是**把运维人员从「依赖环境的手工维护」中剥离出来**：

- **可迁移性问题（03 的死局二）**：镜像自带运行时，宿主机换 Ubuntu / Debian / 阿里云镜像都不会影响——「本地能跑、线上报错」的 `GLIBC not found` 一类问题彻底消失。
- **服务器变脏（03 的死局一）**：业务容器一删即净，`docker rm` 之后服务器只跑 Docker Daemon，没有任何 Java、Python、Maven 残留。
- **回退要重做（04 的痛点）**：`docker run app:1.0.0` 一条命令拉回历史版本，不再依赖「备份目录 mv」。

一句话：**运维人员不再花时间维护「依赖环境」，转而只关心「镜像版本表」**——这是 03 篇留下的工程债务在 05 篇被结构性清偿。

### 尚未解决——仍待优化的运维步骤

视角 3 / 视角 4 的命令虽然把「环境异构」解决了，但**「运维人员的操作步骤」仍然有优化空间**。当业务代码需要一次新版发布时，仍然面临两条路径：

| 模式 | 步骤 | 适用 |
| :--- | :--- | :--- |
| **即时构建** | `git pull` → `mvn package` → `docker build` → `docker run` | 国内网络 / 私有服务器 / 无成熟 Registry |
| **push → pull** | CI 构建镜像 → push 到 Registry → 服务器 `docker pull` → `docker run` | 网络通畅 / 已有 Registry |

两条路径在原理上**后者明显优于前者**——构建环境与运行环境解耦、镜像缓存可复用、构建机资源与生产服务器隔离。**但国内网络拉取 Docker Hub / 海外 Registry 镜像的速度常常成为瓶颈**，所以即时构建模式在中小项目里仍然常见。

要真正进入「push → pull」的工业级流水线，还需要：

- **业务镜像从代码自动构建并 push 到 Registry** → 07 篇（GitHub Actions） 解决
- **多容器编排（MySQL 未就绪就启动 App、`docker run` 参数散落多处）** → 08 篇 Docker Compose 解决
- **国内网络镜像加速**（阿里云 ACR、中科大镜像站）→ Docker 工具集配置范畴

**一句话总结**：**05 篇解决的是「可迁移性」，但「运维步骤繁琐」与「网络瓶颈」这两类现实问题，留给 07 / 08 篇以及工程实践一起打**——本篇的任务是把容器化这个「起点」立稳，让后续工具链有清晰的接力棒。

## 小结

至此，Docker 完美终结了传统单组件部署的两难死局：

- **告别服务器即时构建**：重资源构建任务剥离至离线环境或 CI 构建机，生产服务器只拉取镜像运行；
- **告别本地构建环境异构**：不可变镜像将代码与运行时整包交付，彻底攻克了 **低可移植性**（Low Portability）；
- **服务器回归本职**：宿主机彻底摆脱了开发工具与依赖泥潭，专注提供稳定纯粹的容器运行底座。

## 思考

1. 为什么说“容器只是宿主机上的一个受限进程”，而不是像虚拟机那样拥有独立的 OS 内核？这种机制带来了哪些性能与资源优势？
2. 如果在宿主机上执行 `docker run -d -p 8080:8080` 启动了容器 A，再次执行相同的命令（不改端口）启动容器 B，会发生什么？为什么？
3. 容器内部生成的日志和业务数据，在容器被 `docker rm` 销毁后会丢失吗？如何通过 `-v` 挂载参数确保数据绝对安全？

## 延伸阅读：云原生不可变基础设施

### 理念跃迁：云原生不可变基础设施

> **理念源头**：业界对运维模式的反思可以追溯到 Bill Baker 与 Chad Fowler 在 2012 年关于 **"Pets vs Cattle"** 的讨论——把每台服务器当"宠物"悉心照料会陷入配置漂移；云原生用"只换不修"的统一编号实例取代它。Docker 在单应用层面将这一理念具象化为一张不可变镜像。

面对可变基础设施的泥潭，云原生架构给出了颠覆性的设计原则。

> [!NOTE]
> **云原生的四大核心支柱理念**：
> 在 CNCF（云原生计算基金会）的官方定义中，云原生并非简单地“把代码部署在云上”，而是一整套构建弹性、松耦合与高自动化系统的体系标准。其核心支柱包括：**微服务**、**容器**、**服务网格** 与 **不可变基础设施**（Immutable Infrastructure）。

#### 1. 核心哲学：只换不修（Replace, don't repair）

传统物理机运维与云原生运维的核心分水岭，在于对待基础设施的思维方式：

- **传统运维的“宠物模式”**（可变基础设施）：
  运维人员像对待宠物一样悉心照料每台服务器，频繁通过 SSH 登录上去打补丁、改配置、就地升级。随着时间推移，服务器产生 **配置漂移**（Configuration Drift），最终沦为谁也无法完整复刻的“雪花服务器”（Snowflake Server）。
- **云原生运维的“牲畜模式”**（不可变基础设施）：
  **只换不修**。任何部署组件一旦运行即处于只读不可变状态，绝对不再通过 SSH 登录生产环境就地修改。无论是修复 Bug 还是升级功能，统一通过构建全新的不可变交付物，拉起新实例，然后将旧实例彻底销毁。

#### 2. 交付标准重构：不可变镜像

Docker 将“不可变基础设施”的宏大哲学在单应用层面具象化为 **不可变镜像**（Immutable Image）：

> **不可变镜像**：
> 将业务代码产物、应用依赖库、语言运行时（JDK/Python）、底层 OS 文件系统与动态链接库完整封装打包为一个自包含的只读模板。

构建只在离线构建机或 CI 流水线上执行一次并生成镜像。生产服务器上 **只安装一个 Docker 引擎**（Docker Daemon），只需拉取镜像直接运行。服务器彻底摆脱了编译器与环境依赖，**回归只跑常驻进程的本职**。

## 参考

1. [Docker 官方架构指南](https://docs.docker.com/get-started/overview/)
2. [Docker CLI 命令参考手册](https://docs.docker.com/engine/reference/run/)
3. [Docker Hub 官方镜像仓库](https://hub.docker.com/)
4. [CNCF 官方关于云原生与不可变基础设施的定义](https://github.com/cncf/toc/blob/main/DEFINITION.md)
5. [Google SRE 体系关于 Toil 的定义与实践](https://sre.google/sre-book/eliminating-toil/)
