# 基础篇 08 Compose 改写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按方案 C 改写 `08-docker-compose.md`：主干仍是声明式拓扑与期望状态收敛；补齐「流水线引擎 vs 容器编排引擎」与「Job → Service」硬章节；业界术语入库并用 `{{term:}}`。

**Architecture:** 先扩 `docs/glossary/`（真源），再按设计文档的章节落点重排/改写 Origin；06 已立名的词（流水线引擎、DAG、IaC）只 shortcode + 回指，不在 08 重讲定义。

**Tech Stack:** Markdown（VitePress）、`docs/glossary/*.md` frontmatter、`pnpm test:glossary`、本地 `pnpm run docs:dev`。

**Spec:** `docs/superpowers/specs/2026-11-08-foundation-08-compose-revision-design.md`

## Global Constraints

- 方案 C：不把 08 改成流水线理论篇；不提前写中级 10 网络深挖
- 术语：先入库再 `{{term:}}`；全站每词仅一处首次正文详解（06 源头的词 08 禁止括号重定义）
- 禁止术语化：「声明式 patch 模式」「job 内化」；对照表用「容器编排引擎」全称
- 风格：`.agents/skills/sre-article-style/SKILL.md`（无中文序号标题；含流程旁白 / 小结 / 思考 / 延伸 / 参考）
- 本轮不做：wechat 重生、插图/CDN、中级篇修改
- **Git：** 不主动 commit；过程性文件（spec/plan）不单独提交；若用户要求提交，与 glossary + Origin 改动一并作为工作痕迹
- 回复中文；《中文文案排版指北》

---

## File Structure

| 路径 | 职责 |
| --- | --- |
| `docs/glossary/pipeline-engine.md` | 流水线引擎（定义入库；详解源头 06） |
| `docs/glossary/dag.md` | 有向无环图（定义入库；详解源头 06） |
| `docs/glossary/infrastructure-as-code.md` | 基础设施即代码（定义入库；详解源头 06） |
| `docs/glossary/container-orchestration.md` | 容器编排（详解源头 08） |
| `docs/glossary/docker-compose.md` | Docker Compose（详解源头 08） |
| `docs/glossary/compose-service.md` | 服务（Compose Spec Service）（详解源头 08） |
| `docs/glossary/desired-state.md` | 期望状态（详解源头 08） |
| `docs/sre/devops/foundation/08-docker-compose.md` | Origin 改写目标 |
| `docs/sre/devops/foundation/06-pipeline-basics.md` | 只读核对源头表述；本轮原则上不改，除非 glossary `aliases` 冲突需极小对齐 |
| `docs/superpowers/specs/2026-11-08-foundation-08-compose-revision-design.md` | 已定设计（过程痕迹，随工作痕迹提交） |
| `docs/superpowers/plans/2026-11-08-foundation-08-compose-revision.md` | 本计划 |

复用、不新建：`docs/glossary/pipeline.md`、`container.md`、`immutable-infrastructure.md`。

---

### Task 1: 新增 glossary 词条（06 源头三词 + 08 源头四词）

**Files:**
- Create: `docs/glossary/pipeline-engine.md`
- Create: `docs/glossary/dag.md`
- Create: `docs/glossary/infrastructure-as-code.md`
- Create: `docs/glossary/container-orchestration.md`
- Create: `docs/glossary/docker-compose.md`
- Create: `docs/glossary/compose-service.md`
- Create: `docs/glossary/desired-state.md`
- Test: `pnpm test:glossary`（加载器 / 匹配器既有用例应仍通过）

**Interfaces:**
- Consumes: glossary frontmatter 约定（`id` / `term` / `en` / `aliases` / `definition` / `enabled`），见现有 `docs/glossary/pipeline.md`
- Produces: 上述 7 个 `id`，供 Task 2 的 `{{term:id或规范名}}` 使用

- [ ] **Step 1: 创建 `docs/glossary/pipeline-engine.md`**

```markdown
---
id: pipeline-engine
term: 流水线引擎
en: Pipeline Engine
aliases:
  - Pipeline Engine
  - pipeline engine
definition: 解析流水线声明、将 Job 依赖建成 DAG，并按拓扑序负责触发、调度、执行与收尾的中间层；Jenkins、GitHub Actions 等是其具体实现。
enabled: true
---

一句话：流水线引擎 = DAG 解析器 + 拓扑序执行器 + 触发与通知中心。首次正文详解见基础篇 06。
```

- [ ] **Step 2: 创建 `docs/glossary/dag.md`**

```markdown
---
id: dag
term: 有向无环图
en: Directed Acyclic Graph (DAG)
aliases:
  - DAG
  - Directed Acyclic Graph
definition: 节点带方向、且不存在环路的图结构；在流水线中用来表达 Job 之间的依赖与可并行关系，由引擎按拓扑序调度。
enabled: true
---

首次正文展开见基础篇 06「流水线引擎：面向 DAG 建模」。
```

- [ ] **Step 3: 创建 `docs/glossary/infrastructure-as-code.md`**

```markdown
---
id: infrastructure-as-code
term: 基础设施即代码
en: Infrastructure as Code (IaC)
aliases:
  - IaC
  - Infrastructure as Code
  - 基础设施即代码（IaC）
definition: 用版本化的声明文件（而非手工点击与口口相传）描述并管理基础设施与运行拓扑，使变更可审查、可复现、可回滚。
enabled: true
---

Jenkinsfile / Actions YAML 与 compose.yaml 同属 IaC 思想的不同落点。首次对照见基础篇 06。
```

- [ ] **Step 4: 创建 `docs/glossary/container-orchestration.md`**

```markdown
---
id: container-orchestration
term: 容器编排
en: Container Orchestration
aliases:
  - 容器编排引擎
  - Container Orchestration
  - container orchestration
definition: 按声明管理多容器应用的部署、联网、存储与生命周期；单机场景常用 Docker Compose，多机集群场景常用 Kubernetes。
enabled: true
---

本系列基础篇 08 以 Docker Compose 作为单机容器编排的代表；集群调度留给进阶篇。
```

- [ ] **Step 5: 创建 `docs/glossary/docker-compose.md`**

```markdown
---
id: docker-compose
term: Docker Compose
en: Docker Compose
aliases:
  - Compose
  - compose
  - docker compose
definition: 用 Compose Specification（通常落盘为 compose.yaml）定义并运行多容器应用的工具；由 Compose 实现按文件收敛服务拓扑与生命周期。
enabled: true
---

官方文档：https://docs.docker.com/compose/ ；文件规范：Compose Specification。
```

- [ ] **Step 6: 创建 `docs/glossary/compose-service.md`**

```markdown
---
id: compose-service
term: 服务（Compose）
en: Service
aliases:
  - Compose Service
  - service（Compose）
definition: Compose Specification 中的逻辑运行单元：一个服务对应一组共享同一镜像与配置的容器实例，通过网络、卷与 depends_on 等与其他服务组成应用。
enabled: true
---

勿与流水线 Job 混淆：Service 描述「应用里跑什么」；Job 描述「交付流程跑哪一步」。
```

- [ ] **Step 7: 创建 `docs/glossary/desired-state.md`**

```markdown
---
id: desired-state
term: 期望状态
en: Desired State
aliases:
  - Desired State
  - desired state
  - 期望配置
definition: 声明式配置所描述的「系统应然样貌」；引擎负责将实际状态向该描述收敛，而不是由人逐步下达命令式操作序列。
enabled: true
---

Compose 的 `docker compose up` 即按 compose.yaml 的期望状态创建或更新服务；更完整的持续 reconciliation loop 是 Kubernetes 等系统的强化形态。
```

- [ ] **Step 8: 验证 glossary 可加载且单测通过**

Run: `pnpm test:glossary`  
Expected: 全部 PASS（无因新词导致解析失败）。

可选抽查：

```bash
node --input-type=module -e "
import { loadGlossary } from './docs/.vitepress/glossary/loadGlossary.ts';
const idx = loadGlossary('./docs/glossary');
const ids = ['pipeline-engine','dag','infrastructure-as-code','container-orchestration','docker-compose','compose-service','desired-state'];
for (const id of ids) {
  const e = idx.entries.find(x => x.id === id);
  if (!e) throw new Error('missing ' + id);
  console.log('ok', id, e.term);
}
"
```

Expected: 七行 `ok …`

- [ ] **Step 9: 本 Task 不单独 commit**（等 Task 2–3 与 Origin 一并作为工作痕迹）

---

### Task 2: 按方案 C 改写 Origin 结构与硬章节

**Files:**
- Modify: `docs/sre/devops/foundation/08-docker-compose.md`（全文结构重排，非局部补丁可整文件重写后 diff 审）
- Read-only 参考: `docs/superpowers/specs/2026-11-08-foundation-08-compose-revision-design.md`
- Read-only 参考: `docs/sre/devops/foundation/06-pipeline-basics.md`（Job/Step、流水线引擎表述）

**Interfaces:**
- Consumes: Task 1 的七个 glossary `id` + 既有 `pipeline` / `container`
- Produces: 符合验收标准的 Origin；含流程旁白（现稿缺失，须补）

- [ ] **Step 1: 固定目标目录骨架（写入/替换正文时按此 H2 顺序）**

```markdown
<!-- frontmatter 保留 title；updated 改为当日；description 强调双引擎边界 + 期望状态 -->

（引言：场景痛点 + 一句预告双引擎）

## 问题：多服务之后，流水线里塞满了什么

## 两套引擎：流水线引擎与容器编排引擎

## Job 单位怎么变：从 Pipeline Job 到 Compose Service

## Compose 的本质：声明应用拓扑与期望状态

## 本站级示例：多服务可观测性栈   <!-- 若现稿示例仍合适则保留并微调术语 -->

## 期望状态如何收敛

## 流水线如何被打薄

## 单机多服务部署的终点与边界

## 流程旁白

## 小结

## 思考

## 延伸阅读：…

## 参考
```

章标题禁止「一、二、三」；章间用承接句。

- [ ] **Step 2: 写「两套引擎」硬章（必须含且仅含一张主对照表）**

表字段与 spec 一致：声明文件 / 调度·收敛对象 / 图的含义 / 引擎职责 / 对人的问题 / 边界。  
正文首次出现使用：

- `{{term:流水线引擎}}` 或 `{{term:pipeline-engine}}`
- `{{term:容器编排}}`（aliases 含「容器编排引擎」）
- `{{term:Docker Compose}}`
- `{{term:有向无环图}}` / `{{term:DAG}}`（不展开定义）

明确一句：流水线引擎不负责服务拓扑；容器编排引擎不负责何时构建/推送/审批。

- [ ] **Step 3: 写「Job 单位怎么变」硬章**

演进链（纯文本或短表均可）：

```text
docker run 参数
  → Job / Step（shell，06）
  → Pipeline Job（06/07）
  → Compose Service 生命周期
  → Pipeline 仅保留 Deploy + Verify 等交付 Job
```

强制口径：DB / App / Nginx 是 `{{term:服务（Compose）}}`，不是流水线 Job。  
可用「职责下沉 / 委托给 Compose」作比喻，**不要**写「job 内化」当术语。

- [ ] **Step 4: 改写主干「期望状态 / 收敛」并清除弃用说法**

- 全文搜索并删除或改写：`声明式 patch`、`patch 模式`、`内化`（若作术语）、单独「编排引擎」（改为「容器编排引擎」或 Compose）
- 用 `{{term:期望状态}}` + 事实句：`docker compose up` 会创建或重建有变更的 service
- 可注一句：更完整的持续 reconciliation 是 Kubernetes 形态，本篇不展开
- 保留最小可用 `compose.yaml` 示例与 `up` / `ps` / `logs` / `down`；注释英文

- [ ] **Step 5: 保留并收紧「流水线如何被打薄」后果章**

- CD 形态：CI build → `docker compose up` → verify
- 全量 `up` vs 指定服务：建议中小项目全量；复杂度权衡保留
- Build in Server vs CI Build：保留，但篇幅勿压过双引擎硬章

- [ ] **Step 6: 补「流程旁白」+ 更新小结 / 思考 / 延伸 / 参考**

流程旁白（约 80–150 字）：谁发起（开发提交 compose/镜像变更）→ 谁执行（流水线触发 + 服务器上 Compose）→ 审批（本步可无或轻量 Review YAML）→ 边界（拓扑归 Compose，交付节奏归流水线）。

思考至少 3 题，其中 1 题必须考双引擎边界。  
小结 100–150 字，回扣 05–07 与下一篇 09。  
延伸阅读继续可提 healthcheck / profiles；参考保留 Compose 官方文档链接。

- [ ] **Step 7: 术语 shortcode 扫描**

Run:

```bash
rg -n '声明式 patch|job 内化|Job 内化' docs/sre/devops/foundation/08-docker-compose.md || true
rg -n '\{\{term:' docs/sre/devops/foundation/08-docker-compose.md
```

Expected: 弃用短语无匹配；至少出现 pipeline-engine / container-orchestration（或其中文 term）、docker-compose、compose-service、desired-state 相关 shortcode。

- [ ] **Step 8: 本 Task 不单独 commit**

---

### Task 3: 本地预览与验收自检

**Files:**
- Verify: `docs/sre/devops/foundation/08-docker-compose.md`
- Verify: `docs/glossary/*.md`（Task 1 新建）

- [ ] **Step 1: 确保 VitePress dev 在跑**

若未运行：`CI=true pnpm run docs:dev -- --host 0.0.0.0 --port 5173`  
打开：http://localhost:5173/sre/devops/foundation/08-docker-compose.html  
Expected: 页面可渲染；术语悬停（若插件启用）不报错。

- [ ] **Step 2: sre-article-style 清单**

- [ ] 开篇前 3 行有场景/痛点
- [ ] 无 `## 一、` / `### 1.1` 式标题
- [ ] 第一段无「本篇将……」套话
- [ ] 章间有承接句
- [ ] 有流程旁白 / 小结 / 思考 / 延伸 / 参考
- [ ] 有对 09 的伏笔

- [ ] **Step 3: 验收标准对照（spec）**

1. 对照表能分清两套引擎  
2. Job → Service 单位变化可复述  
3. 主干仍是拓扑 + 期望状态收敛  
4. 无弃用术语；glossary 齐全  
5. 预览可读

- [ ] **Step 4:（可选）用户要求时再 commit 工作痕迹**

一次提交建议包含：

- `docs/glossary/{pipeline-engine,dag,infrastructure-as-code,container-orchestration,docker-compose,compose-service,desired-state}.md`
- `docs/sre/devops/foundation/08-docker-compose.md`
- `docs/superpowers/specs/2026-11-08-foundation-08-compose-revision-design.md`
- `docs/superpowers/plans/2026-11-08-foundation-08-compose-revision.md`

Message 示例：

```text
refactor(docs): 改写基础篇 08，分离流水线引擎与容器编排引擎

补充 glossary 词条，按方案 C 强化 Job→Service 与期望状态收敛主线。
```

未获用户明确要求前：**跳过本 Step**。

---

## Spec coverage（自检）

| Spec 要求 | Task |
| --- | --- |
| 方案 C 章节落点 | Task 2 Step 1–6 |
| 双引擎对照表 | Task 2 Step 2 |
| Job 单位演进链 | Task 2 Step 3 |
| 弃用「patch 模式 / job 内化」 | Task 2 Step 4、7 |
| glossary 七词 + 源头归属 | Task 1；Task 2 shortcode |
| 流程旁白（风格强制） | Task 2 Step 6（现稿缺失） |
| 非目标：wechat / 插图 / 中级 | 全局约束，无对应实现 Task |
| 验收与预览 | Task 3 |
| 过程文件不单独提交 | Global Constraints + Task 1/2 Step 9/8、Task 3 Step 4 |

## Placeholder scan

无 TBD / 「类似 Task N」式省略；glossary 正文与章节骨架已给出可执行内容。
