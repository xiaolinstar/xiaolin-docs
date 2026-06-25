---
name: content-repurpose
version: 1.0.0
description: >-
  将 VitePress 站点长文或用户提供的源材料一源多用，拆分为公众号、掘金、知乎、小红书、B 站、抖音、视频号、微博、头条等多平台发布包。
  当用户提到一源多用、内容分发、多平台改编、repurpose、把文章发小红书、把长文做成短视频脚本、
  同步发公众号和掘金、内容矩阵、从站点文章生成自媒体素材时使用此 skill。
  即使用户只说「这篇文档怎么发各平台」也应使用。
---

# 一源多用编排（Content Repurpose）

将 **L0 权威原文**（站点 Markdown 或用户素材）拆成多平台发布包，遵循账号矩阵方案 A：

- **主号 AI持续运维**：公众号、掘金、知乎、B 站、视频号、微博、头条
- **副号 一只羊驼驼**：小红书、抖音（引流主号 + xiaolinstar.cn）

---

## Origin 与 Output 划分

| 类型 | 定义 | 路径 | Git | VitePress 站点 |
|------|------|------|-----|----------------|
| **Origin 原文** | 权威完整版，SEO 与内链基准 | `docs/**/*.md` | ✅ 提交 | ✅ 公开收录 |
| **Output 加工** | 各平台适配版（有差异才存） | `content/dist/{slug}/` | ✅ 提交文本 | ❌ **不上站** |

**关系**：`1 Origin → 1 slug 目录 → N 个平台文件 + meta.yaml`

```
docs/ai/theory/harness-engineering.md     ← Origin（读者看的完整版）
content/dist/harness-engineering/
  ├── meta.yaml                           ← 溯源 origin 路径、发布状态
  ├── wechat.md                           ← 摘要去链、摘要、引流句
  ├── xiaohongshu.md                      ← 短文案 + 组图规划
  └── douyin.md                           ← 60s 口播稿
```

**何时写入 Output**：

| 情况 | 处理 |
|------|------|
| 与 Origin 仅有排版差异（如掘金同步全文） | `meta.yaml` 标注 `juejin.sync: origin`，**不**重复存全文 |
| 有删节、改标题、去内链、改语气 | 写入对应 `{platform}.md` |
| 仅存在于外部平台（口播稿、组图规划） | 写入对应 `{platform}.md` |
| 信息图 png | `content/dist/{slug}/assets/`（小文件可提交；mp4 不提交） |

**禁止**：在 `docs/` 下新建加工文（历史 `docs/**/wechat/` 逐步迁移至 `content/dist/`）。

详见 [content/dist/README.md](../../../../content/dist/README.md)。

---

## 启动前：读取共享配置

**必须**先读取（路径相对于本 skill 所在 `creator-suite/` 目录）：

1. [../shared/brand-voice.md](../shared/brand-voice.md) — 语气、禁区、人格
2. [../shared/platform-specs.md](../shared/platform-specs.md) — 各平台规格、转换矩阵、账号矩阵

未读共享配置前不要生成平台文案。

---

## Step 1：确认输入

向用户确认（可从对话推断，缺失时再问）：

| 项 | 说明 |
|----|------|
| **源材料** | 文件路径（如 `docs/ai/theory/harness-engineering.md`）或用户粘贴的全文 |
| **目标平台** | 默认全量；用户可指定子集，如「只要小红书 + 抖音」 |
| **Slug** | 从文件名或用户指定；用于素材命名 `repurpose-{slug}` |
| **站点 URL** | 默认 `https://xiaolinstar.cn/` + 对应路径；未发布则标注「待发布」 |

**源材料不足时**：若只有大纲或口述，先提示用户补充个人案例 ≥3 条，再进入 Step 2。

---

## Step 2：源文分析

阅读源文，输出 **§0 源文分析摘要**（格式见 [references/output-template.md](references/output-template.md)）：

1. **核心结论**（1 句话）
2. **内容支柱**：Vibe Coding / 云原生 / 独立产品
3. **独立观点**：每条可单独成图 / 成段；数量决定小红书张数、抖音要点数
4. **个人真实细节**：从原文提取 ≥3 处，后续各平台必须保留
5. **踩坑 / 故事线**：供 B 站口播、抖音钩子
6. **代码 / 配置**：标记哪些平台保留完整块、哪些只留截图
7. **量化建议**（按 [platform-specs.md §5](../shared/platform-specs.md#5-一源多用转换矩阵)）：

| 源文字量 | 小红书 | B 站 | 抖音 |
|----------|--------|------|------|
| 800–1500 字 | 3–5 张 | 5–8 min | 1 条 |
| 1500–3000 字 | 5–8 张 | 8–12 min | 1–2 条 |
| 3000+ 字 | 8–12 张 | 12–15 min | 2–3 条 |

用户指定张数 / 时长时，以用户为准。

**暂停点**：展示 §0 摘要，等用户确认观点拆分无误后再生成各平台文案。

---

## Step 3：按平台生成素材

遵循 [platform-specs.md §5 转换矩阵](../shared/platform-specs.md#5-一源多用转换矩阵)：

| 源内容 | 公众号 | 掘金 | 小红书 | B 站 | 抖音 |
|--------|--------|------|--------|------|------|
| 核心结论 | 摘要 + 首段 | 摘要 | 封面文案 | 30s 钩子 | 3s 钩子 |
| 分论点 | 小标题 | 目录 | 每图 1 观点 | 章节时间戳 | 3 要点 |
| 踩坑经历 | 探索段 | 可保留 | 省略 | 口播故事 | 痛点 10s |
| 代码 / 配置 | 精简 | 完整 | 1 张截图 | 录屏提示 | 结果画面 |
| 总结 | 结尾感悟 | 文末 | 末图 | 结尾 30s | 结尾 5s |

### 3.1 主号长文（公众号 / 掘金 / 知乎）

- 语气：[brand-voice.md](../shared/brand-voice.md)
- **公众号**：调用 **[wechat-publisher](../wechat-publisher/SKILL.md)** → 生成 `content/dist/{slug}/wechat.md`（可再 Polish）
- 掘金：问题型标题；标签 3–5；`sync: origin` 时不重复存全文
- 知乎：标注「专栏同步」或「推荐回答方向」

### 3.2 副号图文（小红书）

- 账号 **一只羊驼驼**；标题 ≤20 字；正文 100–300 字
- 输出 **组图规划表**（每行 = 1 张图 + 1 观点 + 画面描述）
- 用户要求生图时 → 调用 **`notion-infographic-v2`** skill，按规划逐张生成
- 提醒：Skill 默认 16:9，发小红书前裁 **3:4**（1080×1440）

### 3.3 主号视频（B 站）

- 账号 **AI持续运维**；8–15 分钟（按源文长度调整）
- 输出：标题、30s 钩子、分镜表、简介模板、标签 5–10
- 简介须含站点链接与章节时间戳占位

### 3.4 副号短视频（抖音）

- 账号 **一只羊驼驼**；60–90 秒；前 3 秒钩子
- 输出：口播稿（带时间轴）、发布文案、话题 3–5
- 引流：**一只羊驼驼** → @AI持续运维 + 站点
- **不要**直接裁 B 站长视频；单独写「一个结论」脚本

### 3.5 扩展平台（用户要求时）

- **视频号 / 微博 / 头条**：主号 **AI持续运维**，规格见 platform-specs §3.8–3.10
- 视频号优先 B 站 3–5 分钟精华版；微博 140 字预告 + 链接

---

## Step 4：组装输出

按 [references/output-template.md](references/output-template.md) 结构生成内容。

**落盘路径（默认）**：`content/dist/{slug}/`

| 文件 | 内容 |
|------|------|
| `meta.yaml` | origin 路径、pillar、各平台 `status: draft/published` |
| `wechat.md` / `juejin.md` / … | 有差异的平台加工文 |
| `assets/` | 该平台专用图（可选） |

**输出方式**：

- **预览**：单次回复内输出完整 Markdown
- **落盘**：写入 `content/dist/{slug}/`（用户确认 §0 后执行）
- 同时更新 `meta.yaml` 的 `updated` 字段

末尾附 **§8 发布排期**、**§9 Checklist**。

---

## Step 5：子 Skill 协作

| 场景 | 调用 |
|------|------|
| **公众号** | **`wechat-publisher`**（Generate → 可选 Polish） |
| 小红书信息图 | `notion-infographic-v2` |
| Markdown 排版修复 | `markdown-formatter` |
| 公众号封面图 | `nano-banana-2` |

本 skill **负责编排与文案**；生图 / 深度写稿交给上表子 skill，不在此重复其规则。

---

## 硬性约束

1. **禁止**各平台全文照搬；每平台角度须不同
2. **必须**保留原文 ≥3 处个人真实细节
3. **必须**副号内容含引流：主号 **AI持续运维** + `xiaolinstar.cn`
4. **禁止** brand-voice 禁用词（赋能、颠覆、综上所述、99% 的人不知道等）
5. **必须**中文排版：中英文空格、全角标点、中文双引号 `""`
6. 站点文章未发布时，链接用相对路径并标注「待上线」

---

## 快速指令示例

```
用 content-repurpose，源文件 docs/ai/theory/harness-engineering.md，
生成公众号摘要、小红书 6 张图规划、抖音 60 秒脚本。
```

```
把这篇长文分发到全平台，只要文字包，暂不生成图片。
```

```
源文 2500 字，目标：掘金 + 小红书 + B 站，slug harness-engineering。
```

---

## 故障处理

| 情况 | 处理 |
|------|------|
| 源文无个人案例 | 暂停，请用户口述 3 条真实经历 |
| 源文过短（<500 字） | 仅生成小红书 3 张 + 抖音 1 条 + 微博预告 |
| 用户只要 1 个平台 | 仍执行 Step 2 分析，只输出对应 § |
| 观点过多（>12） | 合并相近观点，小红书硬上限 12 张 |

---

## 附加资源

- 输出结构：[references/output-template.md](references/output-template.md)
- 品牌语气：[../shared/brand-voice.md](../shared/brand-voice.md)
- 平台规格：[../shared/platform-specs.md](../shared/platform-specs.md)
