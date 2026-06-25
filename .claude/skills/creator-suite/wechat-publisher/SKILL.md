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

启动前读取：[../shared/brand-voice.md](../shared/brand-voice.md)、[../shared/platform-specs.md](../shared/platform-specs.md) §3.2  
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
4. 写入 `content/dist/{slug}/wechat.md`，更新 `meta.yaml`

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
