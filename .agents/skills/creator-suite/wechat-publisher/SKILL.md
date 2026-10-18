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
4. 生成标题 ×3、摘要 80–120 字、文末引流
   - 生成 4 个搜索关键词：1 个主关键词 + 3 个长尾关键词，并同步写入 `meta.yaml` 的 `search_keywords`
   - **系列文章**（DevOps 基础 / 中级 / 高级等）按 [brand-voice §5.4](../shared/brand-voice.md#54-系列文章命名约定) 命名：`{系列名} {序号} ｜ {主题}`；Origin 标题已带序号时直接复用
   - 系列清单（系列名 / 序号区间 / Origin 目录）从 [`content/series.yaml`](../../../content/series.yaml) 读取；不在 SKILL 内硬编码
5. 写入 `content/dist/{slug}/wechat.md`，更新 `meta.yaml`（含 `series_ref` 字段）

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

### 内容降级策略

公众号编辑器对复杂格式兼容性差。核心原则：**视觉元素保留为图片，文本元素改写表达。** 目标产物是"文字为主体 + 公式/流程图图片为辅助"的精简版。

#### 1. LaTeX 公式 → PNG 图片

公式保留视觉表达，不降级为自然语言（数学表达的信息密度远高于文字描述）。

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
- 图片 → CDN URL + 手动上传提醒
- 去 frontmatter、去外部链接

#### 渲染脚本

```bash
# 公式渲染（KaTeX SVG → PNG）
node scripts/render-wechat-copy.mjs <wechat.md>

# Mermaid 渲染
npx mmdc -i <input.mmd> -o <output.png>

# 校验
node scripts/check-wechat-render.mjs
```
