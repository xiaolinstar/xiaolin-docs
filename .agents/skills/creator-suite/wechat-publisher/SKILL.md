---
name: wechat-publisher
description: >-
  从 docs/ Origin 生成公众号（AI持续运维）发布稿，输出 content/dist/{slug}/wechat.md，
  支持 Generate 直接生成与 Polish 二次润色。当用户提到公众号、微信文章、发公众号、wechat 分发、
  从站点文章发微信、润色 wechat.md、convert_for_wechat 时使用。无 Origin 时提示先写 docs/ 原文。
---

# 公众号发布（WeChat Publisher）

账号：**AI持续运维** | 输出：`content/dist/{slug}/wechat.md`

**前提**：正文必须先存在于 `docs/`（Origin）。公众号稿只做**分发改编**，不在此 skill 内从零写文。

```
docs/ Origin（权威原文，上站）
        │
        ├─ Generate → content/dist/{slug}/wechat.md
        └─ Polish（可选，二次润色）
```

启动前读取：[../shared/brand-voice.md](../shared/brand-voice.md)（含 §5.4 系列命名约定）、[../shared/platform-specs.md](../shared/platform-specs.md) §3.2  
详细规则：[repurpose-from-origin.md](references/repurpose-from-origin.md)

---

## 无 Origin 时

若用户尚未有 `docs/` 文章：

1. 提示：**请先在 `docs/` 完成 Origin 并上站**，再生成公众号稿
2. 可协助写 Origin（普通写作流程），但产出落 `docs/`，不跳过 Origin 直接写 `wechat.md`

---

## Generate（从 Origin 生成）

1. 读 `docs/{path}.md` + brand-voice
2. 转换正文：去内链、图片上传提醒、保留个人细节
3. 生成标题 ×3、摘要 80–120 字、文末引流
   - 生成 4 个搜索关键词：1 个主关键词 + 3 个长尾关键词，并同步写入 `meta.yaml` 的 `search_keywords`
   - **系列文章**（DevOps 基础 / 中级 / 高级等）按 [brand-voice §5.4](../shared/brand-voice.md#54-系列文章命名约定) 命名：`{系列名} {序号} ｜ {主题}`；Origin 标题已带序号时直接复用
   - 系列清单（系列名 / 序号区间 / Origin 目录）从 [`content/series.yaml`](../../../content/series.yaml) 读取；不在 SKILL 内硬编码
4. 写入 `content/dist/{slug}/wechat.md`，更新 `meta.yaml`（含 `series_ref` 字段）

**异常系列**（`exception-*.md` 站内链）：先运行脚本再补元数据：

```bash
cd docs/sre/devops && python3 convert_for_wechat.py exception-06.md
```

**范例**：`content/dist/harness-engineering/wechat.md`

---

## Polish（二次润色）

用户要求「润色 / 优化 wechat.md」时，在已生成文件上修改，不默认覆盖 Origin 重生成。

- 更新 frontmatter：`mode: repurpose+polish`、`polish:` 记录、`status: ready`
- 保留 ≥3 处个人真实细节；遵守 brand-voice 禁区

---

## wechat.md 结构

```markdown
---
origin: docs/...
slug: ...
account: AI持续运维
mode: repurpose | repurpose+polish
status: draft | ready | published
polish: []
---

# 发布元数据
## 标题备选（选 1）
## 摘要（80–120 字）

# 正文（粘贴到公众号后台）

# 文末引流

# 发布 checklist
```

---

## 协作

| 场景 | 调用方 |
|------|--------|
| 全平台分发 | `content-repurpose` 委托本 skill 处理公众号 |
| 仅公众号 | `用 wechat-publisher，origin docs/ai/theory/xxx.md` |
| 封面图 | `nano-banana-2`（900×383，2.35:1） |
| 排版修复 | `markdown-formatter` |

---

## 硬性约束

- 遵守 brand-voice；摘要第一人称
- 文末引流站点 + **AI持续运维**
- 不在 `docs/` 下写加工文
- 无 Origin 不生成 `wechat.md`
- 严格审计并过滤 AI/营销八股词（如：`为业务赋能` → `解决业务问题`、`拥抱AI时代` → `应用AI`，以及闭环、抓手、降本增效等），保持真诚的技术人格。

### 数学公式产物约束（必读）

公众号编辑器对 SVG / 复杂 HTML 标签的兼容极差，任何数学公式都必须遵循下述产物形态规则：

1. **inline 公式必须 PNG-base64**：`$Y \to Y'$` 编译后产出 `<img src="data:image/png;base64,iVBOR…">`，**禁止内联 `<svg>` 标签**、**禁止用 `data:image/png` 包 SVG 内容**（MIME 必须为 `image/png`）。
2. **block 公式必须走同一形态**：与 inline 一致使用 `<img src="data:image/png;base64,…">` 居中显示，**禁止用 `<div>` 嵌 `<svg>` 内联**（与 markdown-it 段落解析冲突）。
3. **反斜杠转义必杀**：`\{`、`\to`、`\;`、`\quad` 这种单反斜杠在 `.md` 文件里直接写就行，但**禁止出现 `\\to`、`\\{` 这种叠写**——`\\` 在 LaTeX 是行终止符，绝对不会出预期渲染。
4. **统一字号策略**：渲染器走 KaTeX + Playwright，与 origin 站 markdown-it-katex 完全一致——避免 LaTeX 的 cmsy10/cmmi10/cmr10 多字体栈切换导致的 `v` `Y` `J` 字号漂移；KaTeX 输出 HTML 通过 Playwright `deviceScaleFactor=4` 截图成 PNG-base64（4x DPI 锐利）；wrapper 上下文用 16px / PingFang SC 与正文一致，block 公式额外 CSS `transform: scale(0.6)` 与 inline 行高对齐（~80px）。inline `<img>` 用 `height:1em; vertical-align:text-bottom` 强制与正文 1em 等高、同基线（不用 `-0.16em` 避免向上偏移）。
5. **CI 必跑**：
   ```bash
   node scripts/check-wechat-render.mjs                       # 扫全量
   node scripts/render-wechat-copy.mjs <wechat.md> <...html>   # 单文件重渲
   ```
   校验脚本会扫 `&lt;img src=`、`<p>…<?xml`、`<span …Georgia>` 三类破结构信号，发现即 `exit 1`。

详细反模式与历史踩坑见 [.agents/skills/katex-math/SKILL.md](../../katex-math/SKILL.md)；渲染管线本身见 [`scripts/render-wechat-copy.mjs`](../../../../scripts/render-wechat-copy.mjs) 与 [`scripts/check-wechat-render.mjs`](../../../../scripts/check-wechat-render.mjs)。
