# Glossary Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 VitePress 站点建立集中术语知识库，构建期自动匹配 / 短码 `{{term:…}}` 挂悬停释义，并在本篇首次出现时插入轻量旁注。

**Architecture:** `docs/glossary/*.md` 为真源；`loadGlossary` 构建 `TermIndex`；`markdown-it` 插件依次处理短码 → 文本最长匹配 → 首次旁注；theme 注册 `GlossaryTerm` / `GlossaryAside` 渲染交互。

**Tech Stack:** VitePress 1.6、markdown-it 14、Vue 3（theme 组件）、Node.js `node:test`（匹配器单测）、可选 `gray-matter` 解析 frontmatter。

**Spec:** `docs/superpowers/specs/2026-07-20-glossary-tooltip-design.md`

## Global Constraints

- 释义真源仅知识库；正文不写定义
- 一期默认自动匹配（方案 B）；短码为显式可扩展 API
- 跳过 `code_inline` / `fence` / `code_block` / 链接文本；最长匹配、不重叠
- MVP 不做：术语索引页、抑制语法、分发渠道、存量批量改短码
- `docs/superpowers/**` 已在 `srcExclude`（勿重复劳动）；`docs/glossary/**` 必须加入 `srcExclude`，避免一词一文件变成站点路由
- 不主动 `git commit`，除非用户明确要求；计划中的 Commit 步骤改为「暂存说明 / 跳过」或询问后再提交
- 回复与规则文案使用中文；遵守《中文文案排版指北》

---

## File Structure

| 路径 | 职责 |
| --- | --- |
| `docs/glossary/production-env.md` | 种子术语「生产环境」 |
| `docs/glossary/cloud-server.md` | 种子术语「云服务器」 |
| `docs/.vitepress/glossary/types.ts` | `GlossaryEntry` / `TermIndex` 类型 |
| `docs/.vitepress/glossary/loadGlossary.ts` | 读目录 → 解析 frontmatter → TermIndex |
| `docs/.vitepress/glossary/matchTerms.ts` | 纯函数：对一段文本做最长匹配，返回区间 |
| `docs/.vitepress/glossary/plugin.ts` | markdown-it 插件（短码 + 自动匹配 + 首次旁注） |
| `docs/.vitepress/glossary/matchTerms.test.ts` | `node:test` 单测 |
| `docs/.vitepress/theme/components/GlossaryTerm.vue` | inline 术语 + tip |
| `docs/.vitepress/theme/components/GlossaryAside.vue` | 首次旁注块 |
| `docs/.vitepress/theme/index.ts` | 全局注册两组件 |
| `docs/.vitepress/config.mts` | `md.use(glossaryPlugin)` + `srcExclude` glossary |
| `.agents/rules/core.md` | 术语写作规则对齐设计 |
| `AGENTS.md` | 交叉引用措辞微调 |
| `docs/sre/devops/foundation/production-env.md` | 样文：至少一处显式短码，其余靠自动匹配验收 |

---

### Task 1: 知识库种子词 + srcExclude

**Files:**
- Create: `docs/glossary/production-env.md`
- Create: `docs/glossary/cloud-server.md`
- Modify: `docs/.vitepress/config.mts`（`srcExclude` 增加 `**/glossary/**`）

**Interfaces:**
- Consumes: 无
- Produces: 两份合法 frontmatter 术语文件；glossary 目录不进站

- [ ] **Step 1: 创建种子术语「生产环境」**

写入 `docs/glossary/production-env.md`：

```markdown
---
id: production-env
term: 生产环境
aliases:
  - 线上环境
definition: 面向真实用户提供服务的运行环境，变更需受发布门禁约束。
enabled: true
---

面向真实用户、需保持持续可用的运行环境。详细讨论见系列文《生产环境入门》。
```

- [ ] **Step 2: 创建种子术语「云服务器」**

写入 `docs/glossary/cloud-server.md`：

```markdown
---
id: cloud-server
term: 云服务器
aliases:
  - ECS
  - 轻量服务器
definition: 云厂商提供的可公网访问的虚拟机实例，常用于承载个人或业务站点。
enabled: true
---

可按量或包年租用的虚拟机，是个人站上线的常见载体。
```

- [ ] **Step 3: 排除 glossary 路由**

在 `docs/.vitepress/config.mts` 的 `srcExclude` 中追加 `'**/glossary/**'`（保留已有 `wechat` / `_archived` / `superpowers`）。

- [ ] **Step 4: 验收文件存在**

Run: `ls docs/glossary && rg -n "glossary" docs/.vitepress/config.mts`

Expected: 列出两个 md；`srcExclude` 含 `**/glossary/**`

---

### Task 2: TermIndex 类型、加载与匹配纯函数（TDD）

**Files:**
- Create: `docs/.vitepress/glossary/types.ts`
- Create: `docs/.vitepress/glossary/matchTerms.ts`
- Create: `docs/.vitepress/glossary/matchTerms.test.ts`
- Create: `docs/.vitepress/glossary/loadGlossary.ts`
- Modify: `package.json`（增加脚本 `test:glossary`；按需增加 `gray-matter` 依赖）

**Interfaces:**
- Consumes: `docs/glossary/*.md`
- Produces:
  - `type GlossaryEntry = { id: string; term: string; definition: string; aliases: string[]; enabled: boolean }`
  - `type TermHit = { start: number; end: number; entry: GlossaryEntry; matched: string }`
  - `type TermIndex = { entries: GlossaryEntry[]; phrases: { phrase: string; entry: GlossaryEntry }[] }`（`phrases` 已按 `phrase.length` 降序）
  - `function buildTermIndex(entries: GlossaryEntry[]): TermIndex`
  - `function matchTerms(text: string, index: TermIndex): TermHit[]`
  - `function loadGlossary(dir: string): TermIndex`
  - `function resolveTermKey(key: string, index: TermIndex): GlossaryEntry | undefined`（按 id / term / alias 查）

- [ ] **Step 1: 写失败单测**

创建 `docs/.vitepress/glossary/matchTerms.test.ts`：

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildTermIndex, matchTerms, resolveTermKey } from './matchTerms.ts'
import type { GlossaryEntry } from './types.ts'

const entries: GlossaryEntry[] = [
  {
    id: 'production-env',
    term: '生产环境',
    definition: '面向真实用户的环境',
    aliases: ['线上环境'],
    enabled: true,
  },
  {
    id: 'cloud-server',
    term: '云服务器',
    definition: '云上的虚拟机',
    aliases: ['ECS'],
    enabled: true,
  },
  {
    id: 'disabled-term',
    term: '已下线词',
    definition: '不应匹配',
    aliases: [],
    enabled: false,
  },
]

describe('matchTerms', () => {
  const index = buildTermIndex(entries)

  it('longest match wins', () => {
    const hits = matchTerms('部署到生产环境即可', index)
    assert.equal(hits.length, 1)
    assert.equal(hits[0].matched, '生产环境')
    assert.equal(hits[0].entry.id, 'production-env')
  })

  it('matches aliases', () => {
    const hits = matchTerms('切到线上环境', index)
    assert.equal(hits[0].entry.id, 'production-env')
    assert.equal(hits[0].matched, '线上环境')
  })

  it('non-overlapping matches', () => {
    const hits = matchTerms('生产环境与云服务器', index)
    assert.equal(hits.length, 2)
    assert.equal(hits[0].matched, '生产环境')
    assert.equal(hits[1].matched, '云服务器')
  })

  it('skips disabled entries', () => {
    assert.equal(matchTerms('已下线词出现了', index).length, 0)
  })

  it('resolveTermKey by id/term/alias', () => {
    assert.equal(resolveTermKey('production-env', index)?.id, 'production-env')
    assert.equal(resolveTermKey('生产环境', index)?.id, 'production-env')
    assert.equal(resolveTermKey('线上环境', index)?.id, 'production-env')
    assert.equal(resolveTermKey('不存在', index), undefined)
  })
})
```

说明：若希望 `buildTermIndex` / `resolveTermKey` 与 `matchTerms` 分文件，可将前两者放在 `loadGlossary.ts` 并改 import；单测 import 路径保持可运行即可。推荐把 `buildTermIndex`、`matchTerms`、`resolveTermKey` 都放在 `matchTerms.ts`（纯函数、无 IO），`loadGlossary.ts` 只做磁盘读取。

- [ ] **Step 2: 跑测确认失败**

Run: `node --test --experimental-strip-types docs/.vitepress/glossary/matchTerms.test.ts`

Expected: FAIL（模块不存在或导出缺失）

- [ ] **Step 3: 实现类型与匹配**

`docs/.vitepress/glossary/types.ts`：

```ts
export type GlossaryEntry = {
  id: string
  term: string
  definition: string
  aliases: string[]
  enabled: boolean
}

export type TermPhrase = {
  phrase: string
  entry: GlossaryEntry
}

export type TermIndex = {
  entries: GlossaryEntry[]
  phrases: TermPhrase[]
}

export type TermHit = {
  start: number
  end: number
  entry: GlossaryEntry
  matched: string
}
```

`docs/.vitepress/glossary/matchTerms.ts` 核心逻辑：

```ts
import type { GlossaryEntry, TermHit, TermIndex } from './types.ts'

export function buildTermIndex(entries: GlossaryEntry[]): TermIndex {
  const enabled = entries.filter((e) => e.enabled)
  const phrases = enabled.flatMap((entry) =>
    [entry.term, ...entry.aliases]
      .filter(Boolean)
      .map((phrase) => ({ phrase, entry })),
  )
  phrases.sort((a, b) => b.phrase.length - a.phrase.length)
  return { entries: enabled, phrases }
}

export function matchTerms(text: string, index: TermIndex): TermHit[] {
  const hits: TermHit[] = []
  let i = 0
  while (i < text.length) {
    let found: TermHit | undefined
    for (const { phrase, entry } of index.phrases) {
      if (text.startsWith(phrase, i)) {
        found = { start: i, end: i + phrase.length, entry, matched: phrase }
        break
      }
    }
    if (found) {
      hits.push(found)
      i = found.end
    } else {
      i += 1
    }
  }
  return hits
}

export function resolveTermKey(key: string, index: TermIndex): GlossaryEntry | undefined {
  const hit = index.phrases.find((p) => p.phrase === key)
  if (hit) return hit.entry
  return index.entries.find((e) => e.id === key)
}
```

- [ ] **Step 4: 实现 loadGlossary**

优先：`pnpm add -D gray-matter`（或 npm/yarn 等价），然后：

```ts
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { buildTermIndex } from './matchTerms.ts'
import type { GlossaryEntry, TermIndex } from './types.ts'

export function loadGlossary(dir: string): TermIndex {
  if (!fs.existsSync(dir)) return buildTermIndex([])
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
  const entries: GlossaryEntry[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8')
    const { data } = matter(raw)
    return {
      id: String(data.id),
      term: String(data.term),
      definition: String(data.definition),
      aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : [],
      enabled: data.enabled !== false,
    }
  })
  return buildTermIndex(entries)
}
```

若不想加依赖：用正则截取 `---` 之间 YAML，手写解析 `id`/`term`/`definition`/`enabled` 与 `aliases` 列表（仅支持本知识库简单 YAML）。

- [ ] **Step 5: package.json 测试脚本**

```json
"test:glossary": "node --test --experimental-strip-types docs/.vitepress/glossary/matchTerms.test.ts"
```

- [ ] **Step 6: 跑测确认通过**

Run: `pnpm test:glossary`

Expected: 全部 PASS

- [ ] **Step 7: 冒烟加载真实目录**

Run:

```bash
node --experimental-strip-types -e "
import { loadGlossary } from './docs/.vitepress/glossary/loadGlossary.ts'
import path from 'node:path'
const idx = loadGlossary(path.resolve('docs/glossary'))
console.log(idx.phrases.map(p => p.phrase).join(','))
"
```

Expected: 输出含 `生产环境`、`线上环境`、`云服务器`、`ECS`、`轻量服务器`（顺序按长度降序）

---

### Task 3: markdown-it 插件

**Files:**
- Create: `docs/.vitepress/glossary/plugin.ts`
- Modify: `docs/.vitepress/config.mts`

**Interfaces:**
- Consumes: `loadGlossary`, `matchTerms`, `resolveTermKey`, `TermIndex`
- Produces: `export function glossaryPlugin(md: MarkdownIt): void`  
  渲染规则：
  - inline：`<GlossaryTerm term="规范名" definition="释义">匹配文本</GlossaryTerm>`
  - 旁注块：`<GlossaryAside term="规范名" definition="释义" />`
  - 短码未命中：`console.warn('[glossary] unknown term: …')`，输出原始纯文本

- [ ] **Step 1: 实现插件骨架**

`plugin.ts` 要点（完整实现时按此结构写满，勿留空函数）：

1. 模块加载时：`const index = loadGlossary(path.resolve(__dirname, '../../glossary'))`（注意从 `docs/.vitepress/glossary/plugin.ts` 到 `docs/glossary` 的相对路径为 `../../glossary`；也可用 `fileURLToPath` + `path.join`）。
2. **ruler 1 — inline rule `glossary_term_shortcode`**：匹配 `/\{\{term:([^}]+)\}\}/`，查 `resolveTermKey`，成功则 push `glossary_term` token（attrs: `id`, `term`, `definition`；content = `entry.term` 或 matched key 的展示名用 `entry.term`）；失败则 warn + 文本 token。
3. **ruler 2 — core rule `glossary_term_autolink`**（在 `inline` 之后）：遍历 `state.tokens`；对 `inline` token 的 `children`：跳过 `code_inline`、`link_open`…`link_close` 之间、已有 `glossary_term`；对 `text` 节点调用 `matchTerms`，拆成 text + `glossary_term` 交替。
4. **ruler 3 — core rule `glossary_first_aside`**：扫描全部 token，记录每个 `entry.id` 是否已旁注；遇到第一个 `glossary_term`，在其**所属 block**（向上找到包含它的 `inline` 的前一个同级位置，即该 `paragraph_open` / `heading_open` 等之前）插入 `glossary_aside` token（block级 html）。实现时可用：遍历顶层 tokens，若 `tokens[i].type === 'inline'` 且 children 含尚未 aside 过的 glossary_term，则在 `i` 之前（通常是 `paragraph_open` 的 index）`splice` 一个 `html_block` 旁注。

渲染：

```ts
md.renderer.rules.glossary_term = (tokens, idx) => {
  const t = tokens[idx]
  const term = t.attrGet('term') || ''
  const definition = t.attrGet('definition') || ''
  const text = t.content
  return `<GlossaryTerm term="${escapeAttr(term)}" definition="${escapeAttr(definition)}">${escapeHtml(text)}</GlossaryTerm>`
}
```

旁注用 `html_block` 内容直接写 `<GlossaryAside … />`。

`escapeAttr` / `escapeHtml` 必须实现（至少转义 `& " < >`）。

- [ ] **Step 2: 挂到 VitePress config**

在 `docs/.vitepress/config.mts`：

```ts
import { glossaryPlugin } from './glossary/plugin'

// markdown.config 内：
md.use(glossaryPlugin)
```

- [ ] **Step 3: 最小 Markdown 冒烟（不启完整 UI）**

可用临时脚本对单行字符串 `md.render('部署到{{term:生产环境}}与云服务器')`，断言 HTML 含 `GlossaryTerm` 与至少一个 `GlossaryAside`。

或启动 dev 留到 Task 5 一起验收。本任务至少保证 `pnpm docs:build` 不因插件抛错失败。

Run: `pnpm docs:build`

Expected: 构建成功（允许既有无关 warning）

---

### Task 4: Vue 组件 + theme 注册

**Files:**
- Create: `docs/.vitepress/theme/components/GlossaryTerm.vue`
- Create: `docs/.vitepress/theme/components/GlossaryAside.vue`
- Modify: `docs/.vitepress/theme/index.ts`

**Interfaces:**
- Consumes: 插件输出的 props `term` / `definition`；`GlossaryTerm` 默认 slot 为可见锚文本
- Produces: 可交互 UI

- [ ] **Step 1: 实现 GlossaryTerm.vue**

行为要求：

- 可见文本：slot（匹配到的原文）
- 样式：`border-bottom: 1px dashed`（用 `var(--vp-c-brand-1)` 或 `var(--vp-c-text-2)`，勿引入新品牌色）
- 桌面：`mouseenter` / `mouseleave` 显示 tip
- 移动：`click` toggle；点击外部关闭（`onMounted` 监听 document）
- a11y：根节点 `button` 或 `tabindex="0"` + `aria-describedby` 指向 tip 的 id
- tip 内容为 `definition` prop

结构示例：

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
const props = defineProps<{ term: string; definition: string }>()
const open = ref(false)
const tipId = computed(() => `glossary-tip-${props.term}`)
// … hover / click / outside 逻辑
</script>

<template>
  <span class="glossary-term" @mouseenter="open = true" @mouseleave="open = false" @click.stop="open = !open">
    <button type="button" class="glossary-term__label" :aria-describedby="tipId" :aria-expanded="open">
      <slot />
    </button>
    <span v-show="open" :id="tipId" role="tooltip" class="glossary-term__tip">{{ definition }}</span>
  </span>
</template>
```

（实现时可微调结构，但必须满足悬停/点击与 a11y。）

- [ ] **Step 2: 实现 GlossaryAside.vue**

```vue
<script setup lang="ts">
defineProps<{ term: string; definition: string }>()
</script>

<template>
  <aside class="glossary-aside" role="note">
    <p><strong>{{ term }}</strong>：{{ definition }}</p>
  </aside>
</template>
```

样式：浅底/左边框，视觉接近 blockquote，使用现有 VP CSS 变量。

- [ ] **Step 3: 注册组件**

在 `docs/.vitepress/theme/index.ts` 的 `enhanceApp`：

```ts
import GlossaryTerm from './components/GlossaryTerm.vue'
import GlossaryAside from './components/GlossaryAside.vue'

app.component('GlossaryTerm', GlossaryTerm)
app.component('GlossaryAside', GlossaryAside)
```

- [ ] **Step 4: 确认组件可被 MD 中的标签解析**

Run: `pnpm docs:dev`，打开任含「生产环境」的页面，DevTools 中应出现自定义组件而非裸字符串标签。

---

### Task 5: 样文验收 + 写作规则

**Files:**
- Modify: `docs/sre/devops/foundation/production-env.md`（最少改动：将首次导语中一处改为短码，便于显式 API 验收；其余「生产环境」「云服务器」依赖自动匹配）
- Modify: `.agents/rules/core.md`
- Modify: `AGENTS.md`（交叉引用一句）

**Interfaces:**
- Consumes: 完整插件 + 组件
- Produces: 可演示页面 + 对齐后的写作规则

- [ ] **Step 1: 样文加一处短码**

将 `production-env.md` 导语中：

`需要将它部署到「生产环境」。`

改为：

`需要将它部署到 {{term:生产环境}}。`

（同时按新规则去掉该处直角引号术语用法；文中其它「生产环境」「云服务器」可暂留，自动匹配仍应生效——若「」导致匹配失败，将「生产环境」改为无引号正文或短码。）

注意：自动匹配在「」**内部**仍应能匹配到「生产环境」四字；若实现是整段 text 匹配，直角引号不影响子串。保持即可。

- [ ] **Step 2: 手工验收清单**

Run: `pnpm docs:dev`，打开 `/sre/devops/foundation/production-env.html`（或本地等价路径）

勾选：

- [ ] 本页第一次「生产环境」前出现旁注，文案与知识库 `definition` 一致
- [ ] 同页后续「生产环境」仅虚线下划线，无第二段旁注
- [ ] 悬停（或移动点击）显示释义
- [ ] 「云服务器」同样有首次旁注 + 后续 tip
- [ ] 文中代码块 / 行内 code 内的词不被包裹
- [ ] `{{term:生产环境}}` 渲染正常

- [ ] **Step 3: 更新 `.agents/rules/core.md`**

将「直角引号与术语标记规范」整段替换为：

```markdown
- 术语与知识库规范：领域术语以 `docs/glossary/` 为唯一释义真源。正文优先使用短码 `{{term:规范名或id}}`；一期构建会对知识库词（含 aliases）做自动匹配并挂悬停释义，本篇首次出现自动插入旁注。禁止再用直角引号「」作为术语机器锚点（避免与旧约定混淆）。一般引用、口语转述使用弯引号“”；嵌套用『』。新增术语须先入库（`id`/`term`/`definition`，可选 `aliases`）再在正文使用。
```

保留「引号与加粗结合规范」——若仍提及直角引号，改为适用于**非术语**引用场景；或删掉与术语冲突的句子，改为：弯引号与加粗并存时，加粗在引号内：`“**强调**”`。

- [ ] **Step 4: 更新 AGENTS.md 交叉引用**

将「直角引号、加粗兼容」改为「术语知识库、加粗兼容」或等价措辞，仍指向 `.agents/rules/core.md`。

- [ ] **Step 5: 回归构建**

Run: `pnpm docs:build && pnpm test:glossary`

Expected: 构建成功；单测 PASS

- [ ] **Step 6: 更新 spec 状态**

将 `docs/superpowers/specs/2026-07-20-glossary-tooltip-design.md` 文首状态改为：`已定稿（实现中 / 已完成）`（按实际）。

---

## Self-Review（对照 spec）

| Spec 要求 | 对应任务 |
| --- | --- |
| 知识库一词一 MD + frontmatter | Task 1 |
| loadGlossary + 最长匹配 + aliases + enabled | Task 2 |
| 短码 `{{term:…}}` | Task 3 |
| 自动匹配跳过 code/link | Task 3 |
| 本篇首次旁注 | Task 3 + 4 |
| GlossaryTerm / GlossaryAside + 悬停/点击 | Task 4 |
| 样文 + 规则更新 | Task 5 |
| glossary / superpowers 不进站 | Task 1（glossary）；superpowers 已完成 |
| 二期抑制语法 | 明确不在本 plan |

无 TBD；类型名在 Task 2/3 一致；Commit 步骤按 Global Constraints 默认跳过。
