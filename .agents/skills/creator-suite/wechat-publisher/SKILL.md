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
2. **内容降级**（按 §内容降级策略逐条处理）：公式→PNG、Mermaid→PNG、复杂表格→叙述段落、代码块精简、VitePress 容器→普通段落
3. 转换正文：去内链、图片上传提醒、保留个人细节
4. 生成标题 ×3、摘要 80–120 字、文末收尾（见下方约定）
   - 生成 4 个搜索关键词：1 个主关键词 + 3 个长尾关键词，并同步写入 `meta.yaml` 的 `search_keywords`
   - **系列文章**（DevOps 基础 / 中级 / 高级等）按 [brand-voice §5.4](../shared/brand-voice.md#54-系列文章命名约定) 命名：`{系列名} {序号} ｜ {主题}`；Origin 标题已带序号时直接复用
   - 系列清单（系列名 / 序号区间 / Origin 目录）从 [`content/series.yaml`](../../../../content/series.yaml) 读取；不在 SKILL 内硬编码
5. **保留延伸阅读与参考资料**：从 Origin 复制「延伸阅读」和「参考」章节，按 §公众号降级策略调整格式
6. 写入 `content/dist/{slug}/wechat.md`，更新 `meta.yaml`（含 `series_ref` 字段）

**异常系列**（`exception-*.md` 站内链）：先运行脚本再补元数据：

```bash
cd docs/sre/devops && python3 convert_for_wechat.py exception-06.md
```

**范例**：`content/dist/harness-engineering/wechat.md`

---

## Polish（二次润色）

用户要求「润色 / 优化 wechat.md」时，在已生成文件上修改，不默认覆盖 Origin 重生成。

- 更新 frontmatter：`mode: repurpose+polish`、`polish:` 记录；尚未完成后台验收时保持 `status: draft`，通过验收且用户确认可发后才设为 `ready`。
- 保留 ≥3 处个人真实细节；遵守 brand-voice 禁区
- 检查内容降级是否到位：公式图片对齐、表格是否已改写为叙述、代码块是否精简
- 通读降级后的段落衔接，确保改写处与上下文语气一致

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

## 小结

## 延伸阅读（保留 Origin 内容，按降级策略调整格式）

## 参考资料（保留 Origin 内容，URL 单独列出）

---

# 文末收尾
## 下篇预告（系列文章）
## 具体问题（与本文相关）
## 原文入口

# 发布 checklist
```

**文章结构规范**：Origin 应包含「流程旁白 → 小结 → 思考 → 延伸阅读 → 参考」；公众号稿保留「小结 → 延伸阅读 → 参考资料」，「思考」部分可融入正文或省略，尾部追加「下篇预告 + 问题 + 原文入口」。详见 [format-collection.md](references/format-collection.md) 尾部顺序规则。

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
- 文末采用“下篇预告 + 具体问题 + 原文入口”，默认不附固定关注口号；详见下方「尾部设计」。
- 不在 `docs/` 下写加工文
- 无 Origin 不生成 `wechat.md`
- 严格审计并过滤 AI/营销八股词（如：`为业务赋能` → `解决业务问题`、`拥抱AI时代` → `应用AI`，以及闭环、抓手、降本增效等），保持真诚的技术人格。

### 抬头图（强制）

- 每篇公众号稿正文开头、H1 之前必须放置站点风格「鸟」抬头图；缺失视为未就绪，不得标记 `ready`。
- 固定素材：`docs/public/images/wechat-theme/ai-ops-mascot.png`（1905×826，2.30:1）；正文引用 `https://media.xiaolin.fun/docs/wechat-theme/ai-ops-mascot.png`，走 CDN 外链 + Chrome 复制全文。
- 展示宽度 100%（不超过正文宽），不设图注；alt 写「AI持续运维站点鸟图」。
- 抬头图为纯视觉锚点，不替代后台封面：2.35:1 封面单独上传，不进正文。
- CDN 返回非 200 时停止发布，先恢复图片地址；不得用占位图、纯文字或本地路径替代。

### 格式集合与验收状态

- 版本统一由上层 [`VERSION`](../VERSION) 管理，变更说明见 [`CHANGELOG.md`](../CHANGELOG.md)。v1.0.4 完成公众号第二批格式与 SLA 收尾，第一批验收结果继续有效。

- 生成、润色或排版前读取 [format-collection.md](references/format-collection.md)，以其中的验收状态决定默认可用格式。第二批已按验收范围完成；LaTeX 数学排版独立第三批，尚未验证。
- 已通过格式才进入默认集合；待优化或待验证格式只在明确的试验稿中使用。转换脚本能输出、本地结构检查通过，不等于微信端验收通过。
- 具体文章和测试素材存放在 `content/dist/`；本 Skill 只维护通用集合、候选参数及验收规则。下方内容降级策略不能代替格式验收。

### 渲染 SLA 与超限评审

- 每一种渲染格式都应维护 SLA（服务要求），明确适用内容、容量边界、可读性目标和验收条件；具体要求集中维护在格式集合中。尚未定义 SLA 的新格式，先与用户确认要求，再进入试验。
- 生成或改写前，先检查 Origin 是否符合相应格式的 SLA；渲染中发现超限也按同一规则处理。若原文超过 SLA，停止受影响内容的转换，列出原文位置、超出项、当前阈值及阅读影响，与用户共同评审，决定修改 Skill 的 SLA 规范还是修改文章原文，确认后再继续。
- 未经该评审，不自动放宽 SLA，不擅自删减、拆分、改写或替换超限内容来绕过限制；原文修改与规范修改均以用户决定为准。已明确授权的处理方案可直接执行。

### 代码示例的语言

- 自编或实质修改的代码示例默认使用英文注释、日志、参数校验、报错提示与教学占位文本；代码外讲解继续用中文，遵循 [写作规范](../../sre-article-style/SKILL.md) 的“代码示例的语言”。不得改变执行语义；真实业务数据、原样输出、第三方引用和图表标签按原意保留。只更新作者指定文章或当前编辑示例，不批量覆盖历史材料。

### 长代码候选方案

- 长代码或长命令超限时，遵守 SLA 共同评审规则，并读取 [通用代码拆解方案集合](../../sre-article-style/references/code-decomposition.md)。
- 提供适用方案与可复制到微信的渲染候选，由作者或开发者选择；根据授权修改 Origin 或分发稿，不自动放宽 SLA。优先按内容的包含、阶段或调用关系讲解，禁止仅按行数切块。
- 每条长命令单独检查；片段有重复上下文时明确不可拼接，保留完整实现入口及运行前提。本地渲染成功不代表代码可执行或微信验收通过。

### 尾部设计

- 系列文章默认在小结后追加 3 个短段落：下篇预告、与本文相关的具体问题、站点原文入口。单篇文章或系列末篇没有已明确的下一篇时省略预告，不编造选题。
- 不重复小结，不默认追加”关注 AI持续运维，获取更多……”、品牌口号、横幅或二维码。尾部以普通正文呈现，保持轻量。
- 原文 URL 放入发布元数据，供填写后台”原文链接”字段，默认不在正文堆放长 URL。只有配置并确认入口后，才使用”阅读原文”的引导；没有入口时改为清晰的站点地址说明。
- 准确描述站点提供的材料，不把普通文章统称为”完整版与配置清单”。
- 通用模板见 [repurpose-from-origin.md](references/repurpose-from-origin.md) 的「文末追加」。Generate 与 Polish 均遵守本约定。
- 内容与规则分离：具体文章正文、选定尾部及发布状态放在 `content/dist/{slug}/`；Skill 仅维护通用规则与占位模板。

### 延伸阅读与参考资料的降级策略

Origin 中的「延伸阅读」和「参考」章节应保留到公众号稿件，但按以下策略降级：

**延伸阅读**：
- 保留 2 个主题（与 Origin 一致）
- 每个主题的推荐阅读链接：公众号稿中写「推荐阅读 GitHub Docs: XXX」，URL 放入「参考资料」统一列出
- 不在正文内嵌长 URL

**参考资料**：
- 保留 Origin 的参考资料列表（通常 3–5 条）
- 格式：编号 + 标题 + 完整 URL，每条单独一行
- 放在延伸阅读之后、尾部分隔线之前
- 遵循 format-collection.md 的参考资料 SLA（13px、行高 1.6、每条后距 8px）

**完整尾部顺序**（遵循 format-collection.md）：
```
小结 → 延伸阅读 → 参考资料 → 分隔线 → 下篇预告 → 具体问题 → 原文入口
```

### 内容降级策略

公众号编辑器对复杂格式兼容性差。核心原则：**视觉元素保留为图片，文本元素改写表达。** 目标产物是"文字为主体 + 公式/流程图图片为辅助"的精简版。

#### 1. LaTeX 公式 → PNG 图片

简单表达优先使用已验收的普通文本与 Unicode 上下标方案，保留原意、变量定义与适用假设；适用范围见格式集合。超出该范围且需要保留数学排版的复杂公式，另行验证 PNG 方案，不能视为本批已通过。

**渲染管线**：KaTeX 输出 SVG → 转 PNG（用 `sharp` 或 `resvg-js`），不再依赖 Playwright 浏览器截图。

**产物约束**：
- inline 公式：`<img src="..." height="1em" style="vertical-align:text-bottom">`，与正文等高同基线
- block 公式：同格式居中，CSS `transform: scale(0.6)` 与行高对齐
- 禁止内联 `<svg>` 标签、禁止 `data:image/png` 包裹 SVG 内容
- 禁止 `\\` 叠写（LaTeX 中 `\\` 是行终止符）
- 代码块内的 `$...$` 不触发渲染，直接保留原文（如 `$SSH_KEY`、`${VERSION}`）
- 单字符数字（如 `$1$`）直接写 `1`，不为一个数字生成图片

#### 2. Mermaid 图 → PNG 图片

保留图表表达，用 `@mermaid-js/mermaid-cli`（mmdc）渲染为 PNG 后插入。

```bash
npx mmdc -i diagram.mmd -o diagram.png -w 1200 -b transparent
```

产物为普通 `<img>` 标签，公众号可正常渲染。不再使用占位文字替代。

#### 3. 复杂表格 → 叙述性段落

3 列以上或内容过长的表格，用自然语言重新组织信息——不是简单转 bullet list，而是改写为流畅的对比叙述。

**改写示例**：

原文（3 列表格）：
```
| 模式 | 上线步骤 | 执行主体 |
|------|---------|---------|
| 进程模式 | ssh → mvn package → restart | 人手动 |
| 容器模式 | ssh → docker pull → run | 人手动 |
```

降级后：
> 进程模式和容器模式的上线流程本质相同——都是 SSH 登录后逐条执行命令，区别只在中间的业务动作：前者跑 `mvn package` 构建，后者跑 `docker pull` 拉镜像。执行主体始终是人。

简单对比表（2-3 列、≤5 行）保留原样，公众号能正常渲染。

#### 4. 代码块 → 精简为核心示例

- 保留 ≤15 行的关键片段，展示核心逻辑
- 超过 15 行的代码块：截取最关键部分 + 文字说明完整逻辑
- 删除冗余注释和占位符
- 引导读者去站点查看完整版本

#### 5. VitePress 容器 → 普通段落

| 容器 | 降级处理 |
|------|---------|
| `:::details` | 展开内容，去掉折叠 |
| `:::warning` / `:::tip` | "注意：" / "提示：" 前缀 + 正文 |
| `:::code-group` | 只保留最核心的一个代码块 |

#### 6. 已有处理（保持不变）

- `{{term:...}}` → 纯文本
- 站内链接 → "NN 篇《标题》" 式文字引用
- 图片 → 本地上传自有 CDN 后引用 HTTPS URL，Chrome 复制全文到微信；不要求另行上传微信、转存或进入素材库，具体格式与验收范围见格式集合。
- 去 frontmatter、去外部链接

#### 渲染脚本

```bash
# 渲染公众号预览 HTML
node scripts/render-wechat.mjs <wechat.md>

# 校验渲染结果
node scripts/check-wechat-render.mjs
```
