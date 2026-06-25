# 分发内容（Dist）

本目录存放 **由站点原文加工** 的多平台发布素材，与 `docs/` 中的权威原文（Origin）分离。

## Origin vs Output

| 类型 | 路径 | Git | 站点展示 |
|------|------|-----|----------|
| **Origin 原文** | `docs/**/*.md` | ✅ 提交 | ✅ 公开收录 |
| **Output 加工** | `content/dist/{slug}/` | ✅ 提交（文本） | ❌ 不公开 |

## 目录结构

```
content/dist/{slug}/
├── meta.yaml              # 溯源：origin 路径、平台、发布状态
├── wechat.md              # 公众号（AI持续运维）
├── juejin.md              # 掘金
├── zhihu.md               # 知乎（可选）
├── xiaohongshu.md         # 小红书文案 + 组图规划
├── bilibili.md            # B 站脚本
├── douyin.md              # 抖音口播稿
├── weibo.md               # 微博预告（可选）
└── assets/                # 该平台专用图（信息图等，可选）
    └── xiaohongshu-01.png
```

## meta.yaml 示例

```yaml
slug: harness-engineering
origin: docs/ai/theory/harness-engineering.md
origin_url: https://xiaolinstar.cn/ai/theory/harness-engineering.html
created: 2026-06-24
updated: 2026-06-24
pillar: Vibe Coding
platforms:
  wechat:
    account: AI持续运维
    status: draft  # draft | scheduled | published
    published_at:
  xiaohongshu:
    account: 一只羊驼驼
    status: draft
```

## 原则

1. **一篇 Origin 对应一个 `{slug}` 目录**，加工文不覆盖原文。
2. **有差异才落盘**；与原文相同的掘金同步可在 `meta.yaml` 标注 `sync: origin`，不必重复存全文。
3. **视频 mp4 等大文件** 默认不提交 Git；脚本与 meta 提交即可。
4. 生成流程见 `.claude/skills/creator-suite/content-repurpose/SKILL.md`。

## 历史说明

公众号加工文原位于 `docs/sre/devops/wechat/`（2026-06-25 前）。已迁移至本目录：

| Slug | Origin | Output |
|------|--------|--------|
| `exception-06` | `docs/sre/devops/exception-06.md` | `wechat.md` |
| `exception-07` | `docs/sre/devops/exception-07.md` | `wechat.md` |
| `exception-08` | `docs/sre/devops/exception-08.md` | `wechat.md` |
| `harness-engineering` | `docs/ai/theory/harness-engineering.md` | `wechat.md`、`xiaohongshu.md`、`bilibili.md`、`douyin.md`、`repurpose.md`（试跑） |

转换脚本：`docs/sre/devops/convert_for_wechat.py`（输出至 `content/dist/{slug}/`）。
