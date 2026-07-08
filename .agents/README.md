# Agent 配置（Agent Skills 标准）

本目录为**跨 Agent 真源**，遵循 Agent Skills 约定（`SKILL.md` + `references/`）。

## 目录

| 路径 | 用途 | 读取方 |
|------|------|--------|
| `skills/` | 可复用 Skill（含 `SKILL.md`） | Codex、Antigravity、OpenCode、TRAE 等 |
| `rules/` | 项目级写作与交互规范 | 各 Agent 经 `AGENTS.md` 引用 |

## Skill 加载路径

| Agent | 项目 Skill 路径 | 说明 |
|-------|----------------|------|
| **Codex** | `.agents/skills/` | 原生扫描 |
| **Antigravity** | `.agents/skills/` | 原生扫描（见 [Google Codelab](https://codelabs.developers.google.com/autonomous-ai-developer-pipelines-antigravity)） |
| **OpenCode** | `.agents/skills/` | `@skill-name` 引用 |
| **Claude Code** | `.claude/skills/` | 符号链接 → `.agents/skills/` |
| **Cursor** | `.claude/skills/` | 符号链接 → `.agents/skills/` |

**原则**：新建或迁移项目 Skill 一律写入 `.agents/skills/`；`.claude/skills/` **全部为符号链接**，不维护双份真源。

验证（应全部输出 `OK`）：

```bash
for d in .claude/skills/*; do [ -L "$d" ] && echo "OK $(basename "$d")" || echo "FAIL $(basename "$d")"; done
```

## 本项目 Skill 索引

| Skill | 路径 | 场景 |
|-------|------|------|
| `content-repurpose` | `skills/creator-suite/content-repurpose/` | 一源多用、多平台分发 |
| `wechat-publisher` | `skills/creator-suite/wechat-publisher/` | 公众号生成 / 润色 |
| `markdown-formatter` | `skills/markdown-formatter/` | Markdown 排版修复 |
| `notion-infographic-v2` | `skills/notion-infographic-v2/` | 信息图生成 |

共享配置：`skills/creator-suite/shared/brand-voice.md`、`platform-specs.md`

外部安装 Skill 登记见根目录 [`skills-lock.json`](../skills-lock.json)。
