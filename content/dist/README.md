# 分发内容（Dist）

本目录存放 **由站点原文加工** 的多平台发布素材，与 `docs/` 中的权威原文（Origin）分离。

## 目录概览

```
content/
├── README.md            # 上级 README（content/ 级元数据说明）
├── series.yaml          # 系列清单（数据层；命名规则见 brand-voice §5.4）
└── dist/                # 分发改编（加工文，按 slug 分子目录）
    ├── README.md        # 本文件
    └── {slug}/
        ├── meta.yaml
        └── *.md
```

| 类型 | 路径 | 职责 | Git | 站点展示 |
|------|------|------|-----|----------|
| **Origin 原文** | `docs/**/*.md` | 权威原文、SEO、长期沉淀 | ✅ 提交 | ✅ 公开收录 |
| **系列清单** | `../series.yaml` | 系列元数据（id / 名称 / 序号区间 / 状态） | ✅ 提交 | ❌ 不公开（纯元数据） |
| **Output 加工** | `{slug}/` | 公众号 / 掘金 / 小红书 / B 站等分发稿 | ✅ 提交（文本） | ❌ 不公开 |

## dist 目录结构

```
content/dist/{slug}/
├── meta.yaml              # 溯源：origin 路径、系列引用、平台、发布状态
├── wechat.md              # 公众号（AI持续运维）
├── juejin.md              # 掘金
├── zhihu.md               # 知乎（可选）
├── xiaohongshu.md         # 小红书文案 + 组图规划
├── bilibili.md            # B 站脚本
├── douyin.md              # 抖音口播稿
├── weibo.md               # 微博预告（可选）
└── assets/                # 配图清单与平台专用图（见下「产品截图」）
    ├── README.md          # 截图 manifest：文件名、CDN、插入位置、状态
    └── …                  # 小图可选提交 Git；大图走 COS
```

## meta.yaml 示例

```yaml
slug: harness-engineering
origin: docs/ai/theory/harness-engineering.md
origin_url: https://xiaolinstar.cn/ai/theory/harness-engineering.html
title: 个人开发者视角的驾驭工程：从「结对编程」到「圈养」 AI
pillar: Vibe Coding
created: 2026-06-24
updated: 2026-06-27
platforms:
  wechat:
    account: AI持续运维
    status: draft
    published_at:
  xiaohongshu:
    account: 一只羊驼驼
    status: draft
```

## 系列引用（series_ref）

系列文章（如 DevOps 基础 01）的 `meta.yaml` 应通过 `series_ref` 字段指向 [`../series.yaml`](../series.yaml) 的系列 id：

```yaml
slug: delivery-start
title: DevOps 基础 01 ｜ Nginx 静态资源代理
series_ref: devops-basics    # 指向 content/series.yaml 的 id
```

系列命名格式（`{系列名} {序号} ｜ {主题}`）由 `brand-voice §5.4` 规定，系列名 / 序号区间在 `series.yaml` 定义。**规则与数据分离**：

- `brand-voice §5.4` → 命名格式（规则）
- `content/series.yaml` → 系列清单（数据）
- `meta.yaml` 的 `series_ref` → 关联两者

## 原则

1. **一篇 Origin 对应一个 `{slug}` 目录**，加工文不覆盖原文。
2. **有差异才落盘**；与原文相同的掘金同步可在 `meta.yaml` 标注 `sync: origin`，不必重复存全文。
3. **视频 mp4 等大文件** 默认不提交 Git；脚本与 meta 提交即可。
4. 生成流程见 `.agents/skills/creator-suite/content-repurpose/SKILL.md`。
5. **架构版本**：creator-suite 当前 **v1.0.0**（见 `.agents/skills/creator-suite/VERSION`）；大改动时递增 MAJOR 并更新 `CHANGELOG.md`。

## 历史说明

公众号加工文原位于 `docs/sre/devops/wechat/`（2026-06-25 前）。已迁移至本目录：

| Slug | Origin | Output |
|------|--------|--------|
| `exception-06` | `docs/sre/devops/exception-06.md` | `wechat.md`、`juejin.md` |
| `exception-07` | `docs/sre/devops/exception-07.md` | `wechat.md`、`juejin.md` |
| `exception-08` | `docs/sre/devops/exception-08.md` | `wechat.md`、`juejin.md` |
| `harness-engineering` | `docs/ai/theory/harness-engineering.md` | `wechat.md`、`juejin.md`、`zhihu.md`、`xiaohongshu.md`、`bilibili.md`、`douyin.md` |

转换脚本：`docs/sre/devops/convert_for_wechat.py`（exception 系列）→ 再经 **wechat-publisher** 补标题 / 摘要 / 引流。

## 公众号工作流

```
docs/ Origin
    → wechat-publisher（Generate）→ content/dist/{slug}/wechat.md
    → wechat-publisher（Polish，可选）
    → 公众号后台发布
```

Skill：`.agents/skills/creator-suite/wechat-publisher/SKILL.md`

## 产品截图与占位符

站点 Origin 可先发文，截图后补。约定如下：

1. **清单**：`content/dist/{slug}/assets/README.md` 列文件名、CDN 路径、Origin/公众号插入位置、`pending | done` 状态。
2. **本地母本**：`docs/public/images/img-{product}/{slug}/`（不进 Git，见 [media-standards](../../docs/sre/planning/media-standards.md)）。
3. **Origin 占位**：在 `docs/` 正文中用注释预留，补图时取消注释即可：

   ```markdown
   <!-- shot:miniapp-list -->
   <!-- ![说明文字](https://media.xiaolin.fun/docs/img-ai-todo/why-no-ai-chatbox/02-miniapp-list.png) -->
   ```

4. **公众号**：CDN 图需**下载后上传**微信后台，不能依赖外链。
5. **上传**：`pnpm run media:upload` → `pnpm run media:cdn-check` → 更新 Origin → 站点重新部署。

范例：`content/dist/why-no-ai-chatbox/assets/README.md`
