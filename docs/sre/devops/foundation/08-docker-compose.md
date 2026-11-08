---
title: 08 ｜ 多服务容器编排：Docker Compose
description: 微服务进入生产后，使用 Docker Compose 把多服务拓扑、网络、存储和配置随源码提交管理；它是单机多容器应用的声明式部署终点，也让流水线回归版本交付与结果验证。
date: 2026-03-06
updated: 2026-11-05
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
  - IaC
---

05 篇解决了”一个容器怎么运行”，06 / 07 篇解决了”版本怎么构建、推送和触发”。但开发侧引入微服务后，一个应用往往会拆成网关、前端、API、数据库、缓存和消息队列，运维对象从 1 个变成多个。

逐条 `docker run` 仍然可以把它们启动起来，却会重新变成一套靠记忆维护的运维琐事：网络、端口、卷、环境变量、依赖顺序和重启策略散落在命令参数里。真正需要管理的不是”多敲几条命令”，而是**多个服务如何组成一个应用**。

这就是 Docker Compose：把应用的服务拓扑和期望状态写进 `compose.yaml`，随源码一起提交、Review 和版本管理。它和 Jenkinsfile / GitHub Actions 是同一套基础设施即代码思想的不同落点：

| | Jenkinsfile / Actions YAML | `compose.yaml` |
| --- | --- | --- |
| 声明的是 | **怎么构建与部署**（动作链） | **跑哪些服务、如何互联**（期望状态） |
| 写在哪 | 代码仓库 | 代码仓库 |
| 谁执行 | 流水线引擎 | `docker compose` CLI |
| 思想 | 运维左移 / IaC | 运维左移 / IaC |

05 篇把「装环境 + 拷产物 + 写配置 + 起服务」折叠为 `docker run`；08 篇把「$n$ 条 `docker run`」折叠为 `docker compose up`。运维复杂度从 $O(n)$ 降为 $O(1)$——无论应用由 3 个还是 30 个服务组成，运维动作集合不变。

对绝大多数开源项目来说，Compose 也是默认的自部署入口之一：项目把 `compose.yaml`、环境变量模板和启动说明随源码发布，用户只需准备 Docker，再按文档执行 `docker compose up -d`。因此 Compose 文件不是临时脚本，而是项目交付物的一部分。

## 从手动到声明式：运维动作的演进

05 篇的 `docker run` 把「装环境 + 拷产物 + 写配置 + 起服务」折叠为一条指令——单容器的环境可移植性解决了。

但真实项目有 $m$ 个服务（DB / App / Nginx），加上 verify 就是 $m+1$ 个 job。这些 job 之间有依赖关系，流水线引擎可以编排。

**流水线的视角**：定义 job 之间的依赖 DAG（$J_1 \to J_2 \to J_3 \to J_4$），引擎按拓扑序调度。但流水线是 $x$ 的函数——每次要跑的 job 集合不同：

$$
P(x) = \{J_i \mid J_i \text{ 需要执行}\}
$$

人需要判断 $x$ 的范围（只改前端？全量变更？），决定启用哪些 job。两种朴素解法：

1. **人工操作 job**：运维人员感知 $x$，手动决定跑哪些——依赖人的经验
2. **流水线参数控制**：每个 job 接收参数（1=执行，0=跳过）——入口参数复杂，仍需人判断 $x$

**Compose 的视角**：声明描述了 service 级别的 DAG（`db` → `app` → `nginx`）+ 多个 `docker run`。这个 DAG 被**内化**到 Compose 引擎内部——**pipeline 不再关注容器服务的依赖关系，被抽象掉了**。

pipeline 只看到 1 个 job：`docker compose up`。pipeline 的复杂度从 $O(m)$ 降为 $O(1)$，与 $x$ 无关：

$$
\text{Pipeline}_{\text{after}} = \underbrace{\text{CI build}}_{\text{Job 1}} \to \underbrace{\text{docker compose up}}_{\text{Job 2}} \to \underbrace{\text{verify}}_{\text{Job 3}}
$$

这就是 Docker Compose 要解决的问题——让流水线回归版本交付与结果验证，中间的部署动作交给 Compose 引擎。

## Compose 的本质：声明应用拓扑与期望状态

`docker run` 是**命令式**：你告诉系统每一步怎么做。

`docker-compose.yml` 是**声明式**：你描述期望状态，由 Compose 把实际状态收敛过去。

### 运维动作的形式化映射

回顾 05 篇：单容器部署是映射 $f: X \to Y$，其中 $X$ 是变更输入，$Y$ 是容器集合 $\{v_1, v_2, \dots, v_n\}$。运维动作是逐条执行 $n$ 次 `docker run`。

Compose 引入**应用级抽象**：定义 $g: Y \to A$，其中 $A$ 是「应用」——一个由多个**服务**组成的逻辑单元。运维动作从 $n$ 次 `docker run` 折叠为**1 次** `docker compose up`：

$$
\text{ops}(A) = \text{docker compose up -d} \quad (\text{与 } n \text{ 无关})
$$

**关键洞察**：运维复杂度从 $O(n)$ 降为 $O(1)$。无论应用由 3 个还是 30 个服务组成，运维人员的动作集合不变——`up`、`ps`、`logs`、`down`。运维人员甚至不需要知道启动的是 Nginx、Tomcat 还是 FastAPI，只需管理「应用」这个逻辑单元。

可以把几种工具的职责分开理解：

| 层次 | 解决的问题 |
| --- | --- |
| Docker Image | 服务运行什么 |
| Container | 服务运行实例 |
| Docker Compose | 多个服务如何组成一个应用 |
| Jenkinsfile / GitHub Actions | 什么时候构建、推送和部署 |
| Kubernetes | 多机调度、弹性扩缩和故障自愈 |

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    image: your-registry/your-app:1.0.0
    environment:
      DB_URL: jdbc:postgresql://db:5432/app
    depends_on:
      - db

  gateway:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api

volumes:
  pgdata:
```

日常只需要：

```bash
docker compose up -d      # 创建网络、拉镜像、按依赖启动
docker compose ps         # 看状态
docker compose logs -f    # 看日志
docker compose down       # 停掉并清理容器与网络（卷默认保留）
```

### 声明式 patch 模式：只更新变化的服务

Compose 的 `up -d` 是**声明式 patch**——对比 `compose.yaml` 的期望状态与当前运行状态，**只重启有变化的服务**，其他服务不受影响。

例如只改了 `app` 服务的镜像版本：

```yaml
services:
  api:
    image: your-registry/your-app:1.0.1  # 从 1.0.0 升级到 1.0.1
```

执行 `docker compose up -d` 后：

| 服务 | 行为 | 原因 |
|------|------|------|
| `db` | **不重启** | 配置未变化 |
| `app` | **重建并重启** | 镜像版本变化 |
| `nginx` | **不重启** | 配置未变化 |

**与命令式的对比**：如果用 `docker run`，你需要手动判断哪个容器需要更新、执行 `stop` + `rm` + `run`，还要确保不影响其他服务。Compose 的声明式引擎自动完成差异对比和增量更新。

这个特性让**生产变更风险大幅降低**——改什么动什么，不动的不碰。配合 07 篇的流水线，CD 阶段只需执行 `docker compose up -d`，无需关心这次改了 1 个还是 3 个服务。

`depends_on` 默认只保证启动顺序，不保证数据库已经可以接受连接。生产配置应为依赖服务增加 `healthcheck`，并让应用自身具备连接重试能力；容器显示 `Up`，不代表应用已经真正就绪。

对比：

| 维度 | 手动 `docker run` | Docker Compose |
| --- | --- | --- |
| 配置管理 | 散落在命令行 | YAML 进 Git，可追溯 |
| 启动方式 | 逐个敲，记依赖顺序 | 一条命令，`depends_on` 声明顺序 |
| 环境一致性 | 每次手敲易错 | 同一份 YAML 本地 / 测试 / 生产同构 |
| 停止清理 | 逐个 `stop` + `rm` | `docker compose down` |
| 团队协作 | 靠文档或口口相传 | `clone` + `compose up` 即可复现 |

Compose 文件通常命名为 `compose.yaml`；`docker-compose.yml` 是历史命名，现代 Docker Compose 仍兼容它。

## 本站级示例：多服务可观测性栈

上面是「应用三件套」的最小模型。本仓库实际用 Compose 编排了网关、站点与可观测性套件（示意结构）：

| 服务 | 作用 |
| --- | --- |
| Nginx 网关 | 反向代理、入口 |
| VitePress 站点 | 文档站容器 |
| Prometheus / Grafana | 指标与面板 |
| Loki + Promtail | 日志采集与存储 |

完整 YAML 可随项目仓库版本管理——**新人不必背命令，只需读文件**。这正是 07 篇说的「运维左移」：上线拓扑从某个人脑子里，变成仓库里的显性代码。

> 生产密钥不要写进 YAML 明文。用 `.env`（加入 `.gitignore`）或密钥管理注入；YAML 里只写 `${POSTGRES_PASSWORD}` 这类引用。

## Compose 如何把流水线打薄

Compose **不替代**流水线，而是把”容器应用如何部署”从流水线脚本中抽离出来，成为流水线调用的**部署动作载体**。

### 06 篇的遗留问题：运维动作是 $x$ 的函数

回顾 06 篇：运维动作 $f$ 是变更输入 $x$ 的函数——$x$ 的范围决定要跑哪些 job：

$$
f(x) = \begin{cases}
J_2 \to J_3 \to J_4 & \text{if } x = \text{只改前端} \\
J_1 \to J_2 \to J_3 \to J_4 & \text{if } x = \text{全量变更} \\
J_3 \to J_4 & \text{if } x = \text{只改 nginx.conf}
\end{cases}
$$

**问题**：每次部署前，人需要先判断 $x$ 的范围，再决定跑哪些 job。这个判断容易遗漏——尤其是多服务场景，改了一个服务的配置，可能影响依赖它的其他服务。

**06 篇的朴素做法**：流水线参数控制——人手动指定跑哪些 job：

```bash
# 方案 A：全量跑（安全但浪费）
bash ./db.sh && bash ./app.sh && bash ./nginx.sh && bash ./verify.sh

# 方案 B：按需跑（高效但容易遗漏）
bash ./app.sh && bash ./nginx.sh && bash ./verify.sh  # 只改前端时
```

**流水线引擎的局限**：06 篇的流水线（Jenkins/GitHub Actions）解决的是**调度问题**（并行/依赖/失败传播），**不是变更范围感知问题**。流水线仍然是「人定义跑哪些 job，引擎按拓扑序执行」——人还是需要知道 $x$ 的范围。

### 08 篇的解法：声明式 patch 模式

Compose 把运维动作从 $f(x)$ 升级为**声明式收敛**——人不再需要判断 $x$ 的范围，只需描述期望状态，由 Compose 引擎自动计算差异并应用最小变更：

$$
f_{\text{compose}}(\text{compose.yaml}) = \text{自动感知哪些服务需要更新}
$$

**对比**：

| 维度 | 06 篇（命令式） | 08 篇（声明式） |
|------|----------------|----------------|
| 变更感知 | 人工判断 $x$ 的范围 | Compose 自动计算差异 |
| 部署执行 | 人指定跑哪些 job | `docker compose up -d` 自动处理 |
| 遗漏风险 | 高（人可能漏判依赖） | 低（引擎保证收敛） |

### 从多 job 到单 job：运维动作的内化

基于上述解法，06 篇的 4 个 job 被 Compose **内化**为 1 个 job——`docker compose up`。流水线不再关心应用内部有多少服务，只关心「应用」这个整体：

$$
\text{CD pipeline} = \underbrace{\text{CI build}}_{\text{06/07 篇}} \to \underbrace{\text{docker compose up}}_{\text{08 篇：1 个 job}}
$$

**关键区别**：

| 维度 | 06 篇（无 Compose） | 08 篇（有 Compose） |
|------|---------------------|---------------------|
| 流水线 job 数 | 4 个（DB/App/Nginx/verify） | **1 个**（compose up） |
| job 内部 | 每个 job 2-4 个 step | Compose 引擎负责服务编排 |
| 运维人员认知 | 需要知道 $n$ 个容器的细节 | 只需知道应用名 $A$ |
| 依赖管理 | 流水线脚本显式声明 | `compose.yaml` 的 `depends_on` |

**Compose 是容器中的一个 job，而启动 db、启动 web、启动 backend 已经不算是流水线中的 job 了**——它们被 Compose 引擎内化为服务编排的内部细节。流水线的职责回归到「版本交付与结果验证」：

```text
git push
  → CI：构建镜像并推仓库（06/07 篇的 job）
  → CD：git pull → docker compose pull → docker compose up -d（08 篇：1 个 job）
  → CD：curl /health（verify job，保持不变）
```

### 应用状态变更：声明式收敛

05/06 篇的部署是**命令式动作序列**——每次变更都是「执行一组操作」，操作完成后系统状态取决于操作是否正确执行。

08 篇的部署是**声明式状态收敛**——每次变更都是「描述期望状态」，由 Compose 引擎负责把实际状态收敛到期望状态。

| 维度 | 命令式（05/06 篇） | 声明式（08 篇） |
|------|-------------------|----------------|
| 变更单位 | 操作（pull/run/stop/rm） | 状态（compose.yaml） |
| 执行逻辑 | 人告诉系统「怎么做」 | 人告诉系统「要什么」 |
| 结果保证 | 依赖操作正确性 | 依赖引擎收敛能力 |
| 回滚方式 | 反向操作（易错） | 切换 YAML 版本（可追溯） |

**Patch 模式的深层含义**：`docker compose up -d` 不是「重新部署整个应用」，而是「计算差异并应用最小变更」。这意味着：

- **状态连续性**：未变化的服务保持运行，不中断
- **变更可预测**：改什么动什么，不动的不碰
- **回滚即切换**：`git checkout` 旧版本 + `docker compose up -d` = 回滚

### 多应用场景：只部署变化的服务

当应用由多个服务组成时，某次变更可能只涉及其中 1 个服务。例如只改了前端代码（`nginx`），`db` 和 `app` 不需要动。

**06 篇的解法**：人工判断 $x$ 的范围，按需挑选 job——`bash ./app.sh && bash ./nginx.sh`。需要人工感知变更范围，容易遗漏。

**08 篇的解法**：Compose 的声明式 patch 模式自动感知哪些服务需要更新，无需人工判断。

**Compose 支持两种部署粒度**：

| 方式 | 命令 | 行为 |
|------|------|------|
| **全量 up** | `docker compose up -d` | 对比所有服务，只重建变化的 |
| **指定服务 up** | `docker compose up -d nginx` | 只处理 `nginx` 及其依赖 |

**流水线如何配合**？

**方案 A：全量 up（推荐）**

```text
git push
  → CI：构建所有服务的镜像（即使只改了 gateway）
  → CD：git pull → docker compose pull → docker compose up -d
```

优点：流水线简单，无需感知变更范围；Compose 自动判断哪些服务需要重建。
缺点：CI 构建所有镜像，即使只改了 1 个服务。

**方案 B：指定服务 up（精细控制）**

```text
git push
  → CI：git diff 分析变更范围 → 只构建 gateway 镜像
  → CD：git pull → docker compose pull gateway → docker compose up -d gateway
```

优点：CI 只构建变化的服务，节省构建资源。
缺点：流水线需要感知变更范围（`git diff` 分析），复杂度增加。

**建议**：中小项目用方案 A——构建资源成本通常低于流水线复杂度成本。当服务数量多（>10）或构建耗时长（>10 分钟）时，再考虑方案 B。

### Compose 解决的关键问题

| 问题 | 05/06 篇的解法 | 08 篇的解法 |
|------|---------------|-------------|
| **环境一致性** | Dockerfile 保证单容器可移植 | `compose.yaml` 保证多服务拓扑可移植 |
| **依赖管理** | 流水线脚本显式声明顺序 | `depends_on` + `healthcheck` 声明式依赖 |
| **配置追溯** | Shell 脚本进 Git | YAML 进 Git，变更可 Review |
| **运维复杂度** | $O(n)$：$n$ 个容器 × 4 个 job | $O(1)$：1 个 `compose up` |
| **变更风险** | 全量重建（易中断） | 增量更新（只动变化的） |
| **团队协作** | 靠文档或口口相传 | `clone` + `compose up` 即可复现 |

**核心价值**：Compose 让运维从「管理容器」升级为「管理应用」——运维人员不需要知道应用内部有多少服务、每个服务的启动参数是什么，只需管理「应用」这个逻辑单元的生命周期（up/ps/logs/down）。

服务器仍然可以**只装 Docker**——不装 `mvn` / `pip`，由 Dockerfile 和 Compose 在服务器上完成构建。这就是 **Build in Server**：适合个人项目、开源项目和单机小规模部署，源码到服务器后执行 `docker compose up --build -d` 即可。规模扩大后，再切换为 CI 构建镜像、服务器只执行 `pull + up`，以减少生产机资源消耗并提高构建可追溯性。

因此，流水线有两种合理形态：Build in Server 模式下，流水线主要负责更新源码、触发 `docker compose up --build` 和验证结果；CI Build 模式下，流水线负责构建并推送镜像，服务器只执行 `docker compose pull` 和 `docker compose up -d`。两种模式都由 Compose 负责服务拓扑和生命周期，差别在于镜像在哪里构建。

Build in Server 的代价也需要明确：构建会消耗生产机的 CPU、内存和磁盘，构建结果还可能受服务器环境影响；当需要多环境复用、构建审计、快速回滚或减少生产资源争抢时，应切换到 CI Build。

部署前建议先检查最终配置，再执行变更：

```bash
docker compose config
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100
```

## 单机多服务部署的终点与边界

| 场景 | 建议 |
| --- | --- |
| 个人 / 中小项目，单机部署或多台机器分别独立部署 | **Compose 足够**——单机多服务部署的终点 |
| 数十服务、多节点、弹性扩缩 | 再考虑 K3s / Kubernetes |
| 多区域容灾、灰度发布 | Service Mesh / GitOps（进阶篇） |

**掌握 Compose + 前面 01–07，已经能覆盖绝大多数中小型项目的单机部署工作。** 这也是基础篇把 Compose 放在最后一篇的原因：它把“可移植性 + 声明式 + 多服务”收成一个可落地的闭环。Compose 是单机、多容器应用的部署终点，但不是多机集群的调度方案。

## 小结

Docker Compose 把 05 的单容器能力扩展为**多服务期望状态**：一份 YAML、一条 `up`、一键 `down`。它与 Jenkinsfile / Actions YAML 同属 IaC——区别只是声明对象不同（拓扑 vs 动作链）。

05 篇解决「一个容器怎么运行」，06/07 篇解决「版本怎么构建推送」，08 篇解决「多个容器怎么组成应用」。下一步进入 [第 09 篇 · 基础篇总结](./09-foundation-summary.md)：回顾 01–08 的范式跃迁、能力清单，以及「够用」与「还差得远」的边界。

## 思考

1. **安全边界**：`compose.yaml` 里有数据库密码时，是写进 `.env` 还是用密钥管理？两者各自适合什么场景？
2. **就绪 vs 启动**：`depends_on` 只保证启动顺序，MySQL 容器显示 `Up` 但还在初始化，应用连库会怎样？如何用 `healthcheck` 解决？

## 延伸阅读：从单机编排到多机调度

### 健康检查与优雅启停

`depends_on` 默认只保证启动顺序，不保证服务就绪。生产级 Compose 文件应为数据库、缓存等有状态服务添加 `healthcheck`，并让应用具备连接重试能力。优雅停服同理：`docker compose down` 默认发送 SIGTERM，应用需要捕获信号完成收尾（刷盘、断开连接），超时后才会收到 SIGKILL。

健康检查不是「配了就安全」——它只是把「服务是否可用」的判断从容器运行时上移到应用层。真正的就绪保证需要两层配合：Compose 的 `healthcheck` + 应用自身的重试逻辑。

### Compose 与 Kubernetes 的边界

Compose 是单机多容器部署的终点，但不是多机集群的调度方案。当服务数量超过单机承载、需要弹性扩缩或多区域容灾时，才需要 Kubernetes。K8s 的 Pod/Service/Deployment 概念与 Compose 的 service/volume/network 有对应关系，但抽象层级更高——理解 Compose 的声明式思想，是学习 K8s 的良好铺垫。

引入 K8s 的决策点不是「服务数量」，而是「运维复杂度是否超过单机可管理范围」。多数中小项目终身不需要 K8s。

### 进阶功能：按需启用

Compose 的功能远不止 `up/down`，但多数项目只需要核心子集。以下功能按场景按需启用：

- **profiles**：按需启动服务子集。`docker compose --profile monitoring up` 只启动 Prometheus/Grafana，日常开发不占用资源
- **include**：跨文件组合。把可观测性栈拆到独立 compose 文件，主文件 include，保持核心拓扑清晰
- **logging**：日志驱动配置。生产环境指定 json-file 驱动的大小限制和轮转策略，避免日志撑爆磁盘

这些功能不是「必须掌握」，而是「知道存在，需要时再查」。Compose 的设计哲学是渐进式复杂——从 `docker run` 到 `compose.yaml` 到 profiles/include，每一步都可选。

## 参考

1. [Docker Compose 官方文档](https://docs.docker.com/compose/)
2. [Compose 文件规范](https://docs.docker.com/compose/compose-file/)
3. [Compose CLI 参考](https://docs.docker.com/compose/reference/)
