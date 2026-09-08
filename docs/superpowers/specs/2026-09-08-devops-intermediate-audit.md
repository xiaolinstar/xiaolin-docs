# DevOps 中级篇（10–17）口径与索引一致性审查清单

- 日期：2026-09-08
- 范围：[`docs/sre/devops/cicd/`](../sre/devops/cicd/) 下编号 10–17 共 8 篇
- 性质：**诊断报告，不含修改动作**。所有问题仅定位、不在本文档中修复
- 审查维度（仅一类）：**口径与索引一致性**
  1. 序号与 frontmatter `title` 标题
  2. sidebar（[`docs/.vitepress/config.mts`](../.vitepress/config.mts)）标题
  3. [`docs/sre/devops/index.md`](../sre/devops/index.md) 表格
  4. 文档内部 / 跨篇 markdown 链接
  5. 归档与目录归属（`_archived/`、foundation/cicd 误归）

> **关于本报告中的路径**：本报告记录的路径为审计时刻（2026-09-08）的快照。2026-09-08 已执行目录归类（`cicd/` → `intermediate/` / `advanced/` / `extra/`），报告中标注的 `cicd/` 在物理上已不存在；保留旧路径是为了忠实反映审计时刻的口径状态。本文件位于 `docs/superpowers/specs/`，已在 `config.mts` 的 `srcExclude` 中，不会进入站点构建，因此路径不影响线上访问。

---

## 执行摘要

### 核心发现：8 篇 frontmatter `title` 编号整体偏移 −3

| 文件 | 文件 title（实） | sidebar 编号 | index.md 编号 | 偏差 |
| --- | --- | --- | --- | --- |
| environment.md | `07 ｜ 环境变量配置管理` | 10 | 10 | **−3** |
| cicd-separation.md | `08 ｜ CI/CD 权责分离` | 11 | 11 | **−3** |
| ci-pipeline.md | `09 ｜ 持续集成流水线` | 12 | 12 | **−3** |
| harbor-source-control.md | `10 ｜ 私有镜像仓库治理` | 13 | 13 | **−3** |
| k3s.md | `11 ｜ 轻量 K3s 集群` | 14 | 14 | **−3** |
| cd-pipeline.md | `12 ｜ 持续发布流水线` | 15 | 15 | **−3** |
| what-is-cd.md | `13 ｜ 交付边界与灰度` | 16 | 16 | **−3** |
| gitops.md | `14 ｜ GitOps 发布实践` | 17 | 17 | **−3** |

**推测成因**：8 篇在早期按 07–14 编号落地（与基础篇 07–09 紧邻）。后续 sidebar 与 index.md 整体规划调整为 00 + 10–27 后，文件 frontmatter 没有回填。

### 上下游一致性

- 高级篇（18–23）、加餐篇（24–27）：frontmatter 编号均与 sidebar / index.md **一致**，无需修订。
- 基础篇（01–09）：根据 [2026-07-24 spec](../superpowers/specs/2026-07-24-git-github-reposition-design.md) 的对调记录已落地，编号稳定。
- `00 ｜ 渐进式运维导读`（progressive-devops-intro.md）：编号一致 ✓。

### 链接与归档

- 8 篇之间的内部 markdown 链接仅 `cd-pipeline.md → ci-pipeline.md` 两次（[cd-pipeline.md:13](../sre/devops/cicd/cd-pipeline.md#L13)、[cd-pipeline.md:119](../sre/devops/cicd/cd-pipeline.md#L119)），双向通达，未因编号错位失效。
- 无绝对路径跨级引用（`](/sre/...)`）指向 10–17。
- [`docs/sre/devops/cicd/_archived/`](../sre/devops/cicd/_archived/) 与 [`docs/sre/devops/foundation/_archived/`](../sre/devops/foundation/_archived/) 均为空，不存在误归。
- 所有 8 篇均位于 `cicd/` 目录，未发现误归到 foundation/ 或 exception/。

### 整体结论

| 类别 | 问题数 | 严重级 |
| --- | --- | --- |
| 序号偏移（8 篇 × 1 处 title） | 8 | **P0 阻塞**（索引直接误导读者） |
| 序号偏移连带 sidebar 标题错位 | 0 | — |
| 序号偏移连带 index.md 表格错位 | 0 | — |
| 跨篇内部链接断裂 | 0 | — |
| 归档/目录误归 | 0 | — |

**唯一系统性口径问题就是 8 个 frontmatter `title` 编号**。其余四类口径/索引一致性均无异常。

---

## 按文件分组的问题清单

> 格式约定：每篇一段，列出该篇在五类口径/索引问题上的发现。无问题即标 `✓ 无异常`。

### 10 ｜ 环境变量配置管理 — `docs/sre/devops/cicd/environment.md`

- [P0] **frontmatter `title` 编号错位**（[environment.md:1](../sre/devops/cicd/environment.md#L1)）
  - 实：`title: 07 ｜ 环境变量配置管理`
  - 应：`title: 10 ｜ 环境变量配置管理`
  - 与 sidebar（[config.mts:155](../.vitepress/config.mts#L155)）、index.md 表格行对齐。
- ✓ sidebar 标题（"环境变量配置管理"）与 index.md 链接文字一致
- ✓ 无跨篇内部链接
- ✓ 无归档/目录归属问题

### 11 ｜ CI/CD 权责分离 — `docs/sre/devops/cicd/cicd-separation.md`

- [P0] **frontmatter `title` 编号错位**（[cicd-separation.md:1](../sre/devops/cicd/cicd-separation.md#L1)）
  - 实：`title: 08 ｜ CI/CD 权责分离`
  - 应：`title: 11 ｜ CI/CD 权责分离`
- ✓ sidebar（[config.mts:156](../.vitepress/config.mts#L156)）与 index.md 一致
- ✓ 无跨篇内部链接
- ✓ 无归档/目录归属问题

### 12 ｜ 持续集成流水线 — `docs/sre/devops/cicd/ci-pipeline.md`

- [P0] **frontmatter `title` 编号错位**（[ci-pipeline.md:1](../sre/devops/cicd/ci-pipeline.md#L1)）
  - 实：`title: 09 ｜ 持续集成流水线`
  - 应：`title: 12 ｜ 持续集成流水线`
- ✓ sidebar（[config.mts:157](../.vitepress/config.mts#L157)）与 index.md 一致
- ✓ 无跨篇内部链接
- ✓ 无归档/目录归属问题

### 13 ｜ 私有镜像仓库治理 — `docs/sre/devops/cicd/harbor-source-control.md`

- [P0] **frontmatter `title` 编号错位**（[harbor-source-control.md:1](../sre/devops/cicd/harbor-source-control.md#L1)）
  - 实：`title: 10 ｜ 私有镜像仓库治理`
  - 应：`title: 13 ｜ 私有镜像仓库治理`
- ✓ sidebar（[config.mts:158](../.vitepress/config.mts#L158)）与 index.md 一致
- ✓ 无跨篇内部链接
- ✓ 无归档/目录归属问题

### 14 ｜ 轻量 K3s 集群 — `docs/sre/devops/cicd/k3s.md`

- [P0] **frontmatter `title` 编号错位**（[k3s.md:1](../sre/devops/cicd/k3s.md#L1)）
  - 实：`title: 11 ｜ 轻量 K3s 集群`
  - 应：`title: 14 ｜ 轻量 K3s 集群`
- ✓ sidebar（[config.mts:159](../.vitepress/config.mts#L159)）与 index.md 一致
- ✓ 无跨篇内部链接
- ✓ 无归档/目录归属问题

### 15 ｜ 持续发布流水线 — `docs/sre/devops/cicd/cd-pipeline.md`

- [P0] **frontmatter `title` 编号错位**（[cd-pipeline.md:1](../sre/devops/cicd/cd-pipeline.md#L1)）
  - 实：`title: 12 ｜ 持续发布流水线`
  - 应：`title: 15 ｜ 持续发布流水线`
- ✓ sidebar（[config.mts:160](../.vitepress/config.mts#L160)）与 index.md 一致
- ✓ 内部链接 `cd-pipeline.md:13` / `cd-pipeline.md:119` → `ci-pipeline.md` 双向通达
- ✓ 无归档/目录归属问题

### 16 ｜ 交付边界与灰度 — `docs/sre/devops/cicd/what-is-cd.md`

- [P0] **frontmatter `title` 编号错位**（[what-is-cd.md:1](../sre/devops/cicd/what-is-cd.md#L1)）
  - 实：`title: 13 ｜ 交付边界与灰度`
  - 应：`title: 16 ｜ 交付边界与灰度`
- ✓ sidebar（[config.mts:161](../.vitepress/config.mts#L161)）与 index.md 一致
- ✓ 无跨篇内部链接
- ✓ 无归档/目录归属问题

### 17 ｜ GitOps 发布实践 — `docs/sre/devops/cicd/gitops.md`

- [P0] **frontmatter `title` 编号错位**（[gitops.md:1](../sre/devops/cicd/gitops.md#L1)）
  - 实：`title: 14 ｜ GitOps 发布实践`
  - 应：`title: 17 ｜ GitOps 发布实践`
- ✓ sidebar（[config.mts:162](../.vitepress/config.mts#L162)）与 index.md 一致
- ✓ 内部链接仅一条外链（CNCF GitOps Principles），非站内链接
- ✓ 无归档/目录归属问题

---

## 汇总表

| 编号 | 文件 | title 偏移 | sidebar | index.md | 内部链接 | 归档 |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | environment.md | −3 | ✓ | ✓ | n/a | ✓ |
| 11 | cicd-separation.md | −3 | ✓ | ✓ | n/a | ✓ |
| 12 | ci-pipeline.md | −3 | ✓ | ✓ | n/a | ✓ |
| 13 | harbor-source-control.md | −3 | ✓ | ✓ | n/a | ✓ |
| 14 | k3s.md | −3 | ✓ | ✓ | n/a | ✓ |
| 15 | cd-pipeline.md | −3 | ✓ | ✓ | ✓（已查） | ✓ |
| 16 | what-is-cd.md | −3 | ✓ | ✓ | n/a | ✓ |
| 17 | gitops.md | −3 | ✓ | ✓ | n/a | ✓ |

---

## 范围外（明确不做）

- 不涉及 18–27 篇（高级篇 / 加餐篇）frontmatter 抽查（已在前置扫描中确认无异常）
- 不涉及内容质量、术语、配图、mermaid、KaTeX 等其他维度
- 不含修改动作；本文档仅诊断
- 不含实施计划；后续若需要修，可单独立项

---

## 后续建议（不在本次执行范围）

1. **统一 frontmatter 编号方案**：将 8 篇 `title` 编号由 07–14 改写为 10–17。建议一次性提交，避免穿插提交造成更多历史噪声。
2. **同步 sidebar 文本**（可选）：目前 sidebar 标题文字与文件 title 一致，编号修正后无需调整。
3. **同步 index.md 表格**（无需改动）：表格已对齐到 10–17，是修正 frontmatter 后唯一不动的基准。
4. **后续新增篇目**：建议沿用"先确认 sidebar → index.md → frontmatter"的三段式顺序，避免再发生偏移。
