---
origin: docs/sre/devops/foundation/05-docker-basics.md
origin_url: https://xiaolinstar.cn/sre/devops/foundation/05-docker-basics.html
slug: docker-basics
account: AI持续运维
mode: repurpose
status: draft
polish: []
---

> **渲染提醒**：本文含 LaTeX 公式（inline `$...$` + block `$$...$$`），发布前需运行 `node scripts/render-wechat-copy.mjs content/dist/docker-basics/wechat.md` 将公式转为 PNG。

# 发布元数据

## 标题备选（选 1）

1. DevOps 基础 05 ｜ 容器 Docker：让服务器回归本职
2. 服务器构建 vs 本地 scp：为什么两条部署路线都走进了死胡同
3. 从 Pets 到 Cattle：Docker 如何用一条 docker run 终结环境噩梦

**选用**：1（系列化命名，沿用「DevOps 基础 NN ｜ 标题」格式）

## 摘要（108 字）

04 篇用 Git 锁定了代码版本，但源码回到服务器后，仍然要装 JDK、跑构建、面对环境差异。本文从服务器构建与本地编译两条路线的困境出发，讲清容器与虚拟机的本质区别、镜像与容器的命令流转，再用 Dockerfile 和三件套编排把「环境 + 产物」一起交付。

## 搜索关键词（4 个）

Docker 容器、Dockerfile 镜像构建、容器化部署、不可变基础设施

---

# 正文（粘贴到公众号后台）

# 05 ｜ 容器 Docker：让服务器回归本职

04 篇（Git 与 GitHub）用 Commit 锁定了代码的每一次变更版本——但当 `git pull` 拉下来的源码回到服务器，依然要 `mvn package`，依然要装 JDK，依然要面对 03 篇已暴露的「服务器变脏」与「环境强耦合」。

更准确地说，04 篇末尾已经点出本篇的登场使命：**如何把"编译好的产物 + 运行环境本身"一起打包？** 这一篇的回答是把它们封装成一张不可变的自包含镜像——**容器**由抽象理念第一次具象为可被 `docker pull` 的实体。

在传统物理机或裸虚拟机时代，应用部署始终深陷两难死局与环境污染。本篇正式引入**容器**与**不可变基础设施**的云原生理念，通过 Docker 将服务器从繁重的构建与环境依赖中彻底解放出来，让服务器回归本职——只承载业务进程、提供服务。

## 传统部署的两难死局

在容器技术普及前，服务端部署主要有两条经典路线，但两条路线都面临着致命的物理瓶颈。

### 路线 A：服务器即时构建

在生产服务器上 `git pull` 源码后直接执行 `mvn package` 或 `pip install`。源码编译与依赖打包是典型的 CPU 与内存密集型任务，而生产服务的本职是维持稳定的常驻进程。在同一台服务器上边跑业务边编译，极易导致线上请求超时，甚至触发 Linux 内核的 OOM Killer 将核心服务强制杀死。为了完成构建，服务器还必须安装 JDK、Maven、Python、gcc 等各种开发工具链，生产服务器逐渐沦为不可控的**大号开发机**。

### 路线 B：本地编译后 scp 上传

为了保护服务器资源，改在开发者本地电脑编译出 `jar` 或 `wheel` 产物后再 `scp` 上传。开发者本地通常是 macOS 或 Windows，而服务器是 Linux——尽管 Java 的 Fat Jar 自带了字节码依赖，但只要涉及底层 C 扩展或特定的 GLIBC 版本，跨机器运行就会直接报 `GLIBC not found`。构建动作与运行环境割裂，产物只包含了代码，没包含"运行环境本身"，造成了经典的"在我电脑上能跑，服务器上一跑就报错"。

### 共同根源：可变基础设施

两条路线表面看是构建工具的选择，根源却是同一种运维范式：传统物理机运维本质上是一种**可变基础设施**（俗称宠物模式 Pets）。把每台服务器当宠物悉心照料，出了问题通过 SSH 登录上去打补丁、改配置、就地升级；随着时间推移，每台机器的实际环境都会逐渐偏离初始基准，产生**配置漂移**，最终沦为谁也无法完整复刻的"雪花服务器"。

提示：本篇工具选 Docker——它是当下最主流的容器运行时实现；更系统的理念演进（不可变基础设施、Pets vs Cattle、CNCF 四大支柱）见文末延伸阅读。

## 容器究竟是什么：与虚拟机有何区别

这一节只为破除一个误区——**容器不是"轻量级虚拟机"**。它与 DevOps 实践的真正关系：**共享宿主机内核**这一点决定了"打包一次、到处跑"，让 GLIBC / 系统库不兼容这类运维噩梦直接消失。

虚拟机通过 Hypervisor 在硬件层虚拟出一整套 Guest OS，启动分钟级、镜像数 GB。容器则**共享宿主机 Linux 内核**，靠内核提供的 Namespace 做视图隔离、Cgroups 做资源配额，把一个受限进程"伪装"为独立的运行环境，启动秒级、镜像数十 MB。

**容器就是跑在宿主机内核上的一个受限进程**。它真正的价值不在"代替 VM"，而在让"不可变基础设施"的颗粒度从"整机 OS"精确到"单个应用进程"——这是 VM 时代做不到的事。

## 实体边界：镜像与容器

在操作 Docker 前，必须理清两个核心概念的动静边界。**镜像**（Image）是只读的分层模板，包含代码、依赖、运行时与静态文件系统——类比面向对象的"类"，或 Git 的提交快照，静态存储在磁盘，不占 CPU 和内存。**容器**（Container）是镜像在宿主机上的运行实例，具有可读写层与独立网络栈——类比面向对象的"对象"，或 Git 的工作区检出，动态常驻，占用 CPU 与内存。

镜像与容器之间由 6 条命令描述完整的「拉取 → 启动 → 停止 → 销毁」状态机：`docker pull` 从远端 Registry 拉取镜像到本地；`docker run` 从本地镜像创建并启动容器，同时创建写时复制层和暴露端口；`docker stop` 向容器主进程发送 SIGTERM，10 秒后未退则 SIGKILL；`docker start` 重新启动已停止的容器，复用已有的写时复制层；`docker rm` 销毁容器，释放端口与写时复制层空间；`docker rmi` 删除本地镜像，若仍被容器引用则报错，需先 `docker rm`。

## 起一个服务的两种方式

用「起一个 Nginx 反代」这个最常见的场景，把 VM 与 Docker 的实操差异落到操作层面。

VM 方式起步就重：下载 Ubuntu Server ISO，新建虚拟机，装系统，`apt install nginx`，改配置——30 多分钟、10 多步手动操作都算顺利；服务跑起来后还有独立 OS 内核占着内存，磁盘上留下一个 10 GB+ 的 `vmdk`。删除时 `vmdk` 文件往往还在，Nginx 配置、日志、数据可能半年里漂到宿主机——最后的状态谁也说不清。

Docker 把这套动作收成一句 `docker run -d -p 80:80 nginx:1.27-alpine`：镜像从 Docker Hub 拉取约 50 MB，容器秒级启动；`docker rm` 释放端口与写时复制层，`-v` 命名的数据卷可独立保留复用。同一台宿主机上 `nginx:1.25`、`nginx:1.27`、`mysql:5.7`、`mysql:8.0` 可各自跑在独立容器里互不干扰，多服务还能共享同一基础镜像的只读 layer，把磁盘占用从 100 GB+ 压回几 MB 到几十 MB 的可写层。

一句话：**创建极简、删除干净、版本可并行、空间可复用**，正是「不可变基础设施」理念在日常运维里最直接的体现。

## 容器应用：Docker 工具集

### 1. `docker pull`：拉取不可变镜像模板

```bash
# 生产环境务必显式锁定版本 tag，严禁裸用 latest
docker pull nginx:1.27-alpine
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

实战核心参数：`-d` 让容器后台运行，脱离 SSH 终端；`--name` 给容器起可读别名；`-p 宿主机端口:容器端口` 做端口映射；`-v 宿主机路径:容器路径` 挂载数据卷，实现数据持久化与配置解耦——容器销毁重建后数据不丢；`-e KEY=VAL` 注入环境变量，动态切换运行配置；`--restart always` 让容器崩溃自愈与开机自启，直接替代传统手写 systemd unit。

### 3. `docker ps` / `docker stop` / `docker rm`

`docker ps` 查看运行中的容器，加 `-a` 查看全部（含已停止）。`docker stop` 优雅停服（SIGTERM → 10s → SIGKILL），`docker rm` 销毁实例释放资源。临时测试场景可以用 `docker run --rm`，容器退出后自动销毁。

### 4. `docker rmi`：清理本地旧镜像

```bash
docker rmi nginx:1.27-alpine
```

注意：若镜像正被某个容器（即便已停止）引用，`docker rmi` 会报错拦截，必须先 `docker rm` 销毁对应容器。

### 5. Docker Hub：镜像仓库

Docker 镜像在 Registry（仓库）存储与分发，类比 npm / pip 的中心包版本库。公共仓库 Docker Hub（`hub.docker.com`）是 nginx、mysql 等官方镜像的标准来源；生产镜像一般托管在阿里云 ACR、华为云 SWR 或自建 Harbor。

镜像命名格式 `<registry>/<repo>:<tag>`，公共仓库常省略 registry 直接写 `nginx:1.27-alpine`，私有仓库需要完整路径。tag 是镜像的精确指纹——生产环境必须显式锁版本（`1.0.0` 而不是 `latest`），否则上游 push 一次新镜像，所有拉取者就被动升级。

### 6. Dockerfile：把应用打包成镜像

`docker run` 命令里那个 `spring-app:1.0.0` 镜像从哪来？Dockerfile 就是描述「如何把业务代码打包成镜像」的声明式文件——本质上取代了 03 篇"装 JDK、装 Maven、运行 mvn package、再写 shell 脚本"那一长串手工动作。

最小骨架（4 行覆盖"装 JDK + 打包 jar + 启动"全套动作）：

```dockerfile
FROM eclipse-temurin:17-jre-alpine
COPY target/spring-app-1.0.0.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
EXPOSE 8080
```

构建并推送到私有 Registry：

```bash
docker build -t registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.0 .
docker push registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.0
```

**构建一次，任何机器拉取这条镜像跑出的进程都 100% 等价**——这就是 03 篇「环境异构、低可移植」问题的物理消除点。

### 7. Docker 网络与卷（预告 08 篇）

单容器场景下，以上命令已经够用。一旦进入"Spring Boot + MySQL + Nginx"多容器组合，还需要两类能力——Docker Network 让多个容器在同一台服务器上互相通信（容器名即 DNS 名称）；Docker Volume 让容器数据不被 `docker rm` 销毁（MySQL 容器一旦 rm，所有数据丢失，需通过 `-v` 命名卷持久化）。详细展开留给 08 篇 Docker Compose。

## 范式视角：Docker 剥离了什么

回看 02 篇建立的形式化锚点，发布流程是一份操作清单 $Y=\{v_1,\ldots,v_n\}$，按拓扑序逐步执行。05 篇把"构建动作 $v_1$"从生产服务器的 $Y$ 中剥离，**前置到镜像阶段**——原来在服务器上即时执行 `mvn package`，现在在离线构建机或 CI 上打包成不可变镜像；服务器侧只剩 $v_1''$（pull）→ $v_2$（run）→ $v_3$（verify）三个轻动作闭环。

这一剥离正是 04 篇末尾留给本篇的根本问题——"如何把编译好的产物 + 运行环境打包"——的完整回答。下一步进入 06 篇（流水线基础）：把这三个轻动作写进 pipeline 配置文件，让"手动 ssh"彻底退出部署流程。

## 实战贯穿：三件套编排

实战场景从单 Spring Boot 升级为"Nginx + Spring Boot + MySQL"——这是 03 篇确立的最小生产组合，也是 08 篇 Docker Compose 的前奏。

### 从运维负担到 job / step 抽象

在 03 篇的裸机服务器上跑起这套组合，运维人员要分别对环境资产（装 OpenJDK、MySQL、Nginx）、应用资产（`scp` / `java -jar`）、进程资产（`systemd unit`）做手工操作。归到底层，是**环境耦合 / 进程保活 / 跨机器传输**三类共性负担在反复发生。

把这些动作按两层粒度拆开：**step**（步骤）是单个原子动作，如 `docker run`；**job**（作业）由多个有序 step 组成，如"部署 Spring Boot 服务" = 拉镜像 → 停旧容器 → 启新容器 → 验证。

裸机时代四个 job 各自包含 2~4 个 step：DB 部署要装 `mysql-server`、做安全初始化、导入 schema、启动服务（3 step）；App 部署要 `scp` 产物、装 JDK、`java -jar`、写 systemd unit（4 step）；Nginx 要手写配置、reload（2 step）；最后 curl 验证（1 step）。

Docker 化的关键不是把所有 step 替换成"等价 step"，而是**把每个 job 内部的多 step 折叠到最少**——以镜像为单位的「build once, run anywhere」让 job 内部不再需要服务器上的工具链。DB 从 3 step 折叠为 `pull mysql:8` → `run`（2 step）；App 从 4 step 折叠为 `build app` → `run`（2 step）；Nginx 同样折叠为 2 step。job 集合不变，拓扑序保持稳定，每个 job 内部 step 数大幅减少——这就是「容器化让运维精简」的核心证据。

这两层粒度也为 06 篇（流水线基础）埋下伏笔：**流水线就是把操作清单写成代码、由引擎按拓扑序自动执行**——CI 与 CD 分离后，「构建镜像」与「部署镜像」就是 2 个独立 job。

### 三件套的完整 docker run

```bash
# MySQL：先启动（被 Spring Boot 引用）
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=appdb \
  -v mysql_data:/var/lib/mysql \
  --restart always \
  mysql:8

# Spring Boot：依赖 MySQL
docker run -d \
  --name spring-app \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_HOST=mysql \
  -p 8080:8080 \
  registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.0

# Nginx：暴露公网 + 反代 Spring Boot
docker run -d \
  --name nginx \
  -p 80:80 \
  -v ./nginx.conf.d:/etc/nginx/conf.d \
  nginx:1.27-alpine
```

其中 Nginx 反代配置只需一行核心：

```nginx
location /api/ {
    proxy_pass http://spring-app:8080;
}
```

`--name spring-app` 与 `proxy_pass http://spring-app:8080` 是关键——Docker 默认桥接网络下容器名即为 DNS 名称，Nginx 容器可以直接通过名字访问 Spring Boot 容器，无需手工 `--link`。但启动顺序仍然是手工依赖（MySQL 先 → App 后），容易产生「MySQL 还未就绪 → App 启动失败」的时序问题，08 篇 Docker Compose 用 `depends_on` 解决。

### 升级与回退：「只换不修」

把 Spring Boot 从 `1.0.0` 升级到 `1.0.1`，等价于只重新部署 App 这一个 job，DB 与 Nginx 保持不变：

```bash
docker pull registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.1
docker stop spring-app && docker rm spring-app
docker run -d \
  --name spring-app \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_HOST=mysql \
  -p 8080:8080 \
  registry.cn-hangzhou.aliyuncs.com/xiaolin-docs/spring-app:1.0.1
```

回退只需把 tag 改回 `1.0.0`，一条命令搞定。

注意：MySQL 容器**不能**像 Spring Boot 那样「想 rm 就 rm」——它的数据在命名卷里。升级 MySQL 大版本时，先备份数据卷（`docker exec mysql mysqldump ...`），然后才能 `stop + rm + run` 新版。**不可变基础设施的「只换不修」原则不适用于有状态服务**。

### 已解决与尚未解决

容器化落到运维视角上，本质上是**把运维人员从「依赖环境的手工维护」中剥离出来**：镜像自带运行时，宿主机怎么换都不影响——`GLIBC not found` 一类问题彻底消失；业务容器一删即净，`docker rm` 之后服务器只跑 Docker Daemon，没有任何残留；`docker run app:1.0.0` 一条命令拉回历史版本，不再依赖「备份目录 mv」。运维人员不再花时间维护「依赖环境」，转而只关心「镜像版本表」。

但运维步骤仍有优化空间。即时构建模式（`git pull` → `mvn package` → `docker build` → `docker run`）适合国内网络和无成熟 Registry 的场景；push → pull 模式（CI 构建 → push 到 Registry → 服务器 pull → run）在原理上更优——构建环境与运行环境解耦、镜像缓存可复用。要真正进入工业级流水线，还需要：业务镜像自动构建并 push（07 篇 GitHub Actions 解决）、多容器编排（08 篇 Docker Compose 解决）、国内网络镜像加速。

05 篇解决的是「可迁移性」，「运维步骤繁琐」与「网络瓶颈」留给 07 / 08 篇——本篇的任务是把容器化这个「起点」立稳。

## 小结

至此，Docker 完美终结了传统单组件部署的两难死局：

- **告别服务器即时构建**：重资源构建任务剥离至离线环境或 CI 构建机，生产服务器只拉取镜像运行；
- **告别本地构建环境异构**：不可变镜像将代码与运行时整包交付，彻底攻克了**低可移植性**；
- **服务器回归本职**：宿主机彻底摆脱了开发工具与依赖泥潭，专注提供稳定纯粹的容器运行底座。

## 思考

1. 为什么说"容器只是宿主机上的一个受限进程"，而不是像虚拟机那样拥有独立的 OS 内核？这种机制带来了哪些性能与资源优势？
2. 如果执行 `docker run -d -p 8080:8080` 启动了容器 A，再次执行相同命令（不改端口）启动容器 B，会发生什么？为什么？
3. 容器内部的日志和业务数据，在容器被 `docker rm` 销毁后会丢失吗？如何通过 `-v` 挂载参数确保数据安全？

## 延伸阅读：云原生不可变基础设施

理念源头：业界对运维模式的反思可以追溯到 Bill Baker 与 Chad Fowler 在 2012 年关于 **"Pets vs Cattle"** 的讨论——把每台服务器当"宠物"悉心照料会陷入配置漂移；云原生用"只换不修"的统一编号实例取代它。Docker 在单应用层面将这一理念具象化为一张不可变镜像。

在 CNCF（云原生计算基金会）的官方定义中，云原生并非简单地"把代码部署在云上"，而是一整套构建弹性、松耦合与高自动化系统的体系标准，核心支柱包括：**微服务**、**容器**、**服务网格**与**不可变基础设施**。

传统运维的"宠物模式"（可变基础设施）下，运维人员像对待宠物一样悉心照料每台服务器，频繁 SSH 登录打补丁、改配置、就地升级，服务器逐渐产生配置漂移，沦为"雪花服务器"。云原生运维的"牲畜模式"（不可变基础设施）则**只换不修**——任何组件一旦运行即处于只读状态，不再就地修改，修复 Bug 或升级功能统一通过构建新的不可变交付物、拉起新实例、销毁旧实例来完成。

Docker 将这一哲学具象化为**不可变镜像**：将业务代码、依赖库、语言运行时、底层 OS 文件系统完整封装为自包含的只读模板。构建只在 CI 流水线上执行一次，生产服务器只安装 Docker 引擎，拉取镜像直接运行——服务器彻底摆脱编译器与环境依赖，回归只跑常驻进程的本职。

---

# 文末引流

> 完整版含更多配置细节与形式化推导，欢迎访问站点 [xiaolinstar.cn](https://xiaolinstar.cn) 阅读原文。
>
> 关注 **AI持续运维**，获取更多 DevOps / SRE 实战内容。

---

# 发布 checklist

- [ ] 运行 `node scripts/render-wechat-copy.mjs content/dist/docker-basics/wechat.md` 渲染公式为 PNG
- [ ] 上传信息图至 CDN（`/images/img-docker-basics/infographic-build-route-a-vs-b-vs-c.png`）
- [ ] 公众号后台粘贴正文，检查公式 PNG 渲染效果
- [ ] 设置标题：DevOps 基础 05 ｜ 容器 Docker：让服务器回归本职
- [ ] 设置摘要：108 字版本
- [ ] 封面图：900×383（2.35:1）
