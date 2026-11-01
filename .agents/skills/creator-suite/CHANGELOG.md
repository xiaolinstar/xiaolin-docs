# creator-suite 变更日志

语义化版本：**MAJOR** = 架构级改动；**MINOR** = 新平台 skill / 账号矩阵调整；**PATCH** = 文案规范、模板微调。

当前版本见 [`VERSION`](./VERSION)。

## [1.0.3] - 2026-11-01

### 公众号第一批轻量格式验收完成（PATCH）

- 新增 `wechat-publisher/references/format-collection.md`，集中维护格式参数、用户验收依据与适用范围；具体文章正文继续保存在 `content/dist/`，与 Skill 规则分离。
- 第一批完成正文、段落、加粗、单层无序列表、有序步骤列表、二三级标题、短代码块、行内代码、短引用块及实际技术符号的用户验收。
- 固化标题样式：15px 标题文字；二级标题搭配 20px 蓝色序号、居中及低饱和横线；三级标题深蓝加粗、左对齐。
- 短代码块采用 13px 等宽字、行高 1.6、浅灰底和自适应折行；由 highlight.js 按语言解析，通过行内样式输出深蓝关键字、棕红字符串及灰绿注释。已接入 Bash 与 Groovy，保留源码缩进和原始换行。
- 行内代码采用 14px 等宽字与浅灰底；短引用块采用 15px、#666 文字及灰蓝左线。
- 简单技术表达优先采用普通文本与 Unicode 上下标，已验收范围包括任务/节点编号、依赖箭头、希腊字母、简单幂和百分比；不外推复杂公式兼容性。
- 列表内复合格式延至后续批次；图片、复杂公式与流程图不属于本批。格式验收完成不代表文章已经发布，也不外推未使用语言、字符或具体操作环节。

## [1.0.2] - 2026-11-01

### 公众号文字段落与轻排版（PATCH）

- 新增 06 篇 `wechat-light.md` 候选正文及 `render-light.mjs`、`wechat-light.html`，分离标题、摘要、原文链接与正文复制区域。
- 正文采用 15px、行高 1.8、段后距 15px，小标题 18px，代码 13px；减少重复段落、加粗与装饰符号。
- 固化系列文章尾部：下篇预告、具体问题、原文入口；取消默认关注口号，增加后台原文链接验证要求。
- 新增验收清单。本版本仅完成本地文字与格式准备，不含正文图片处理；浏览器复制、微信保存重开、手机预览和实际发布尚未验证。

## [1.0.1] - 2026-07-08

### 迁移（PATCH）

- **真源迁至 `.agents/skills/creator-suite/`**（Agent Skills 标准目录，Codex / Antigravity 原生读取）。
- `.claude/skills/creator-suite` 改为符号链接，兼容 Claude Code / Cursor。
- 路径引用统一为 `.agents/skills/creator-suite/`。

## [1.0.0] - 2026-06-24

### 架构（MAJOR）

- 确立 **Origin / Output** 分层：`docs/` 为权威原文（VitePress 公开），`content/dist/{slug}/` 为分发加工（Git 提交、不上站）。
- 账号矩阵方案 A：主号 **AI持续运维**、副号 **一只羊驼驼**。
- 新增 `content-repurpose` 编排 skill；共享层 `shared/brand-voice.md`、`shared/platform-specs.md`。
- 历史公众号加工文自 `docs/sre/devops/wechat/` 迁移至 `content/dist/exception-{06,07,08}/`。
- VitePress `srcExclude: ['**/wechat/**']`（迁移后该路径可逐步清理）。

### 约定

- 一篇 Origin 对应一个 `{slug}` 目录 + `meta.yaml` 溯源。
- 大架构变更时：递增 **MAJOR**，同步更新本文件与 `VERSION`，并在 `content/dist/README.md` 历史说明中补一行。
