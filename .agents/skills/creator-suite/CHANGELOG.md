# creator-suite 变更日志

语义化版本：**MAJOR** = 架构级改动；**MINOR** = 新平台 skill / 账号矩阵调整；**PATCH** = 文案规范、模板微调。

当前版本见 [`VERSION`](./VERSION)。

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
