# 术语知识库与悬停释义设计

日期：2026-07-20  
状态：已定稿（实现中 / 已完成）  
范围：VitePress 站点正文术语标注、集中知识库、悬停释义、本篇首次旁注

## 背景与目标

站点需要统一领域术语写法，并在阅读时提供释义。业界惯例（MDN Glossary、Kubernetes `glossary_tooltip`）是：**集中术语表为真源**；正文首次可有可见解释；后续仅轻量标注 + 悬停。

目标：

1. 鼠标悬停（桌面）/ 点击（移动）显示术语含义
2. 本篇首次出现时自动插入轻量旁注；同篇后续仅 inline 释义
3. 写作侧以短码 `{{term:…}}` 为可扩展 API；一期默认对知识库词做自动匹配（方案 B）
4. 误判升高时再启用强制声明或抑制，不阻塞 MVP

非目标（本期不做）：

- NLP / 模糊分词猜词
- 全站术语索引页的完整产品化（可预留路由，MVP 可不做页面）
- 公众号等分发渠道的 tooltip（分发稿仍为纯文本）

## 决策摘要

| 项 | 选择 |
| --- | --- |
| 释义真源 | 集中知识库（方案 A） |
| 首次出现 | 自动插入轻量旁注（方案 B） |
| 后续出现 | 仅悬停 / 点击 |
| 显式 API | `{{term:规范名或别名}}` |
| 默认匹配 | 知识库白名单自动匹配（方案 B） |
| 实现位置 | 构建期 `markdown-it` 插件（非运行时 DOM 扫描） |
| 旧「」术语锚点 | 废弃；规则改为短码 + 知识库 |

## 架构

```text
docs/glossary/*.md          知识库真源
        │
        ▼
loadGlossary()              构建时加载 → TermIndex（按词长降序）
        │
        ▼
markdown-it 插件
  1. 解析 {{term:…}} → term token
  2. 文本节点最长匹配 → term token（跳过 code/link 等）
  3. 每页首次某 term → 插入 first-mention 旁注节点
        │
        ▼
Vue 组件 GlossaryTerm / GlossaryAside
        │
        ▼
静态 HTML + 客户端悬停/点击交互
```

与现有栈对齐：在 `docs/.vitepress/config.mts` 的 `markdown.config` 中 `md.use(glossaryPlugin)`，与 task-list、KaTeX 并列。

## 知识库格式

路径：`docs/glossary/`  
约定：一词一文件，文件名与 `id` 一致（小写 + `-`），例如 `production-env.md`。

Frontmatter 字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 稳定标识，如 `production-env` |
| `term` | 是 | 规范中文名，如 `生产环境` |
| `definition` | 是 | 短释义（悬停与首次旁注共用，建议 ≤ 80 字） |
| `aliases` | 否 | 别名数组，参与自动匹配 |
| `enabled` | 否 | 默认 `true`；`false` 则不匹配、不渲染 |

正文（Markdown body）可选：术语表页展开说明；MVP 插件只读 frontmatter。

示例：

```markdown
---
id: production-env
term: 生产环境
aliases:
  - 线上环境
definition: 面向真实用户提供服务的运行环境，变更需受发布门禁约束。
enabled: true
---

（可选长文说明，供未来 `/glossary/` 页使用。）
```

## 正文约定

### 显式短码

- 语法：`{{term:生产环境}}` 或 `{{term:production-env}}`（支持 `term` / `id` / `aliases` 解析）
- 未命中知识库：构建期警告（开发可见），渲染为普通文本，不中断构建
- 扩展位（二期，本期只解析基础形式）：属性、覆盖释义等一律不做

### 自动匹配（方案 B）

- 对普通文本节点，用 TermIndex **按词长降序**做精确子串匹配
- 跳过：`code_inline`、`fence`、`code_block`、链接文本、已是 term 的节点
- 同一文本节点内不重叠包裹
- 仅匹配 `enabled: true` 条目

### 首次旁注

- 作用域：**单篇页面**（一次 Markdown 渲染）
- 某 term 在本页第一次变为 term token 时，在其**所在块级元素之前**插入旁注节点（视觉类似 blockquote，由 `GlossaryAside` 渲染：`**规范名**：definition`）
- 同页后续同一 `id` 不再插入旁注
- 作者无需手写 `>` 释义

### 二期误判治理（预留，MVP 可不实现语法）

- 抑制自动匹配：`glossaryIgnore` frontmatter 字符串列表，或短码 `{{!term:某词}}`（实现计划中二期任务）
- 条目下线：`enabled: false`

## 渲染与交互

| 场景 | 行为 |
| --- | --- |
| 桌面 | 术语带虚线下划线；悬停显示 `definition` |
| 移动 | 点击切换显示/隐藏 tip（无 hover） |
| 无障碍 | 可聚焦；`title` 或 `aria-describedby` 指向释义 |
| 链到术语表 | MVP 可选；若做，链到 `/glossary/#id`（页面本身可二期） |

组件：

- `GlossaryTerm`：inline 术语 + tip
- `GlossaryAside`：首次旁注块

样式跟随站点既有 CSS 变量，不引入新品牌色体系。

## 规则变更

更新 `.agents/rules/core.md`：

- 删除「直角引号专用于术语锚点」的约定
- 改为：领域术语以知识库为准；正文优先 `{{term:…}}`；一期允许依赖自动匹配；「」不再作为术语机器锚点
- 一般引用仍按中文排版使用弯引号或直角引号的**非术语**职责（在规则中写清：术语勿用「」包裹以免与旧稿混淆）

`AGENTS.md` 若仅交叉引用，同步一句指向新约定即可。

## MVP 范围

1. `docs/glossary/` 骨架 + ≥ 2 个种子术语（建议：`生产环境`、`云服务器`）
2. `loadGlossary` + `markdown-it` 插件（短码 + 自动匹配 + 首次旁注）
3. 两个 Vue 组件并接入 theme
4. 用一篇现有文（如 `production-env.md`）做样例验收
5. 更新写作规则
6. `docs/superpowers/**` 加入 VitePress `srcExclude`，避免设计稿进站

明确不做（MVP）：术语索引整页、抑制语法、分发渠道适配、存量全文批量加短码。

## 测试与验收

- 单元：匹配器（最长匹配、跳过 code、别名、disabled）
- 手工：`pnpm docs:dev` 打开样文——首次有旁注、后续仅 underline、悬停文案与知识库一致、代码块内不出现 tip
- 回归：未改动的页面构建无报错

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 自动匹配误伤常用词 | 词长降序；种子词先选多字专名；二期 ignore |
| 短码与自动双重包裹 | 先处理短码再扫文本；已标记区间跳过 |
| 旁注打断阅读节奏 | 旁注极短（共用 `definition`）；仅首次 |
| 知识库膨胀难维护 | 一词一文件；`enabled` 下线 |

## 实现顺序（供后续 plan 拆分）

1. 知识库 schema + 种子词
2. TermIndex 加载与匹配纯函数 + 测试
3. markdown-it 插件（短码 → 自动匹配 → 首次旁注）
4. Vue 组件 + theme 注册
5. 样文验收 + 规则更新 + `srcExclude`
