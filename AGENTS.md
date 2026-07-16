---
description: 项目通用规则
globs:
alwaysApply: true
---

# 项目通用规则

- 始终使用中文回复用户，但技术专有名词可保留英文（如 API、Python、DTO等）。
- 使用项目既有风格，不引入新风格，包括代码、文档或交互，默认延用项目中已有的格式、缩进、命名习惯。
- 尽可能少地输出内容，仅提供高信息密度回复，禁止无效寒暄、过度铺垫，只输出对当前任务有直接帮助的信息。
- 遵守[《中文文案排版指北》](https://www.bookstack.cn/read/chinese-copywriting-guidelines/README.md)标准排版格式
- 中文与英文之间加空格，中文与数字之间加空格；全角标点与其他字符之间不加空格。全中文语境下必须使用全角标点。
- **文档索引维护规则**：任何在 `docs/` 目录下新增的文章或文档，必须默认同步更新 `docs/.vitepress/config.mts` 中的 `nav` 和 `sidebar`，将其添加到对应的标签索引链接中。

## Agent Skills

- **Skill 真源**：`.agents/skills/`（Codex、Antigravity、OpenCode 原生读取）
- **Claude / Cursor 兼容**：`.claude/skills/` 全部为符号链接 → `.agents/skills/`（单一真源）
- **索引**：见 [`.agents/README.md`](./.agents/README.md)

## 内容创作

Origin 在 `docs/`，分发稿在 `content/dist/{slug}/`（不上站）。写文 / 分发前读取：

| 任务 | Skill |
|------|-------|
| 多平台改编 | `.agents/skills/creator-suite/content-repurpose/SKILL.md` |
| 公众号 | `.agents/skills/creator-suite/wechat-publisher/SKILL.md` |
| 语气与禁区 | `.agents/skills/creator-suite/shared/brand-voice.md` |
| 平台规格 | `.agents/skills/creator-suite/shared/platform-specs.md` |
| 系列文章插图/画图 | `.agents/skills/sre-visual-standard/SKILL.md`（优先于 `notion-infographic-v2`） |

细则（文档命名、直角引号、加粗兼容）见 [`.agents/rules/core.md`](./.agents/rules/core.md)。

## Git 提交规则

- **禁止自动提交 git**：除非用户明确要求提交，否则不要执行 git commit、git add 等操作。
- 如果需要提交，先询问用户是否确认提交，提供变更摘要供用户确认。
