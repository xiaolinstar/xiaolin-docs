# 设计文档：基础篇 08 Docker Compose 改写（方案 C）

## 背景与问题

- Origin 路径：`docs/sre/devops/foundation/08-docker-compose.md`（全文已存在，2026-11-08 曾强化 DAG 形式化）。
- 站点侧栏与系列索引已挂接；公众号包 `content/dist/docker-compose/` 仍为 draft，且落后于 Origin——**本设计不覆盖公众号闭环**，Origin 定稿后再另开。
- 作者判断：现稿**专题未写透**。流水线引擎与容器编排引擎缠在一起；job 单位变化散落多节；部分表述接近自造词（如「声明式 patch 模式」「job 内化」）。

系列位置：05 单容器 → 06 流水线引擎 / Job·Step → 07 Actions → **08 Compose 收口单机多服务** → 09 总结 → 中级 10+ Compose 深化。08 的独特交付物应是「多服务期望状态 + 声明式收敛」，不是再讲一遍流水线理论。

## 设计目标

1. **方案 C**：保留「声明式拓扑 / 期望状态收敛」为主干；把「双引擎分离」与「job 单位变化」收成独立硬章节，不大改专题身份。
2. **术语准确**：优先业界标准名；能引用就不自造；新词先入 `docs/glossary/`，正文用 `{{term:…}}`。
3. **前后文连贯**：回扣 06/07 的流水线引擎与 Job/Step；为 09 / 10 留边界（单机 Compose ≠ 集群调度；网络深挖留给 10）。
4. **范围克制**：本轮只改 Origin 结构与 glossary；不做插图、不做 wechat 重生、不改中级篇。

## 方案选择

| 方案 | 主轴 | 结论 |
|---|---|---|
| A | 双引擎对照为主 | 否：抢 06 的戏，稀释 08 立名 |
| B | job 单位演进为主 | 否：易写成单位史，弱化拓扑/收敛 |
| **C** | **声明式拓扑 / 收敛为主干 + 双引擎与 job 单位硬章节** | **采用** |

## 章节落点

| 块 | 调整 |
|---|---|
| 引言 | 保留场景痛点；末尾一句预告：本篇分清流水线引擎与容器编排引擎 |
| 「从手动到声明式」 | 收紧为问题提出：多服务后流水线塞满 service 级 Job 的别扭；减少公式堆叠 |
| **硬章：两套引擎** | 对照表（见下）；术语用「流水线引擎」vs「容器编排引擎」 |
| **硬章：job 单位怎么变** | 演进链（见下）；点明 DB/App/Nginx 不再是流水线 Job |
| Compose 本质 / 示例 / 期望状态收敛 | 主干保留；删除与上两章重复的「内化」长论，改为回指 |
| 流水线如何被打薄 | 保留为后果章：全量 `up` vs 指定服务；Build in Server vs CI Build |
| 边界 / 小结 / 思考 / 延伸 / 参考 | 边界补「编排 ≠ 流水线调度」；思考加 1 道双引擎边界题；结构仍符合 sre-article-style |

刻意不做：不把 08 改成第二篇流水线理论；不提前塞 10 的网络深挖。

### 双引擎对照表（主表唯一）

| 维度 | 流水线引擎 | 容器编排引擎（Compose） |
|---|---|---|
| 声明文件 | Jenkinsfile / Actions YAML | `compose.yaml` |
| 调度 / 收敛对象 | **Job** | **Service** |
| 图的含义 | Job 依赖 DAG | Service 依赖（谁先起、谁连谁） |
| 引擎职责 | 触发、并行、失败传播、日志与权限 | 建网、拉镜像、按依赖启动、按期望状态收敛 |
| 对人的问题 | 这次变更要跑哪些交付步骤？ | 应用期望长成什么样？ |
| 边界 | 不负责服务拓扑细节 | 不负责何时构建 / 推送 / 审批 |

healthcheck 深挖、多项目共存、K8s 不进此表。

### Job 单位演进链

```text
Container 启动参数（docker run）
  → Job / Step（shell，06）
  → Pipeline Job（流水线引擎，06/07）
  → Compose Service 生命周期（容器编排引擎）
  → Pipeline 仅保留 Deploy + Verify 等交付 Job
```

口径：DB / App / Nginx 是 Compose Spec 的 **Service**，不是流水线 **Job**。流水线保留「构建推送 → `docker compose up` → 验证」这类 Deployment Pipeline 阶段。

## 术语约定

### 命名

- 对照表与首次立名用全称：**容器编排引擎**（可括注「以 Docker Compose 为代表」）。
- 后文可简称 Compose；禁止单独用「编排」指代流水线调度。
- 严格区分 **Job**（流水线）与 **Service**（Compose）。

### 复用已有 glossary

| id | 规范名 |
|---|---|
| `pipeline` | 流水线（可在词条或 06 回指 Deployment Pipeline / Humble & Farley） |
| `container` | 容器 |
| `immutable-infrastructure` | 不可变基础设施（按需） |

### 本轮新增 glossary（`docs/glossary/*.md`）

| 拟 id | 中文规范名 | 英文 / 出处 | 首次正文解释源头 |
|---|---|---|---|
| `pipeline-engine` | 流水线引擎 | Pipeline engine（Jenkins / Actions 等实现） | **06**（已有专节「流水线引擎：面向 DAG 建模」）；08 只 `{{term:}}` + 回指 |
| `container-orchestration` | 容器编排 | Container orchestration | **08** |
| `docker-compose` | Docker Compose | 产品名 / Compose Specification | **08** |
| `compose-service` | 服务（Compose） | Service（Compose Spec） | **08** |
| `desired-state` | 期望状态 | Desired state（声明式配置 / IaC 通识） | **08** |
| `infrastructure-as-code` | 基础设施即代码 | Infrastructure as Code (IaC) | **06** 已对照「流水线即代码 / IaC」；08 只回指，不重讲定义 |
| `dag` | 有向无环图 | Directed Acyclic Graph (DAG) | **06**（已展开定义）；08 只 shortcode |

字段名 / 文件名不入库：`depends_on`、`healthcheck`、`compose.yaml`——正文行内代码。

### 弃用或降级的说法

| 现稿倾向 | 处理 |
|---|---|
| 「声明式 patch 模式」当术语 | 改为 **期望状态收敛**；事实描述 `compose up` 重建有变更的 service；可注完整 reconciliation loop 是 K8s 更强形态 |
| 「job 内化」当术语 | 改为 **职责下沉 / 委托给 Compose**；教学比喻可留一句，**不入库** |
| 单独「编排引擎」 | 改为「容器编排引擎」 |
| 把 service 称作流水线 job | 禁止 |

## 风格与结构约束

- 遵循 `.agents/skills/sre-article-style/SKILL.md`：无中文序号标题；引言场景化；章间承接句；含流程旁白 / 小结 / 思考 / 延伸阅读 / 参考。
- 代码示例注释英文化（skill §7）；面向读者的图表标签可用中文。
- 术语：`.agents/rules/core.md`——先入库再 `{{term:}}`；每词全站仅一处首次正文详解。

## 非目标（本轮不做）

- 公众号 `wechat.md` 重生与 approval
- 08 插图 / CDN
- 中级 10–15 正文修改
- 改 curriculum 旧 spec 编号表

## 验收标准

1. 读者能在对照表中说清：流水线引擎管什么、容器编排引擎管什么。
2. 读者能复述 job → service 的单位变化，且不把 Compose Service 叫成 Pipeline Job。
3. 主干仍是「多服务期望状态 + 收敛」；双引擎与 job 单位是支撑硬章，不是另起专题。
4. 新增术语均在 `docs/glossary/` 且正文 shortcode 可用；无「声明式 patch 模式」「job 内化」作为术语出现。
5. 预览页（本地 VitePress）结构与 sre-article-style 自检清单通过。

## 实施顺序（进入 writing-plans 后细化）

1. 新增 glossary 词条（`pipeline-engine` / `dag` / `infrastructure-as-code` 的**定义**可从 06 正文提炼入库；**首次详解旁白**仍属 06，08 不重复解释）。
2. 按章节落点改写 `08-docker-compose.md`。
3. 本地预览 + 风格 / 术语自检。
4. （另开）公众号同步与插图。
