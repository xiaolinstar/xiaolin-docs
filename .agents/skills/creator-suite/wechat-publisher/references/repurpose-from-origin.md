# 从 Origin 生成公众号稿

**前提**：Origin 在 `docs/`；输出在 `content/dist/{slug}/wechat.md`。分 **Generate** 与 **Polish** 两阶段。

---

## Phase 1：Generate（从 Origin 直接生成）

### 1.1 读取输入

| 项 | 来源 |
|----|------|
| Origin 正文 | `docs/{path}.md`（跳过 YAML frontmatter） |
| Slug | 文件名去 `.md`，或用户指定 |
| 站点 URL | `https://xiaolinstar.cn/` + 对应 html 路径 |
| 语气 | [brand-voice.md](../../shared/brand-voice.md) |

### 1.2 正文转换规则

按顺序处理 Origin 正文：

**① 站内链接**（公众号无法点击相对 md 链接）

| Origin | 公众号 |
|--------|--------|
| `[06篇](exception-06.md)` | `06篇《异常文件结构》` |
| `[四项核心原则](exception-00.md)` | `《四项核心原则》` |
| `[Harness 入门](../ai/theory/harness-engineering.md)` | `《驾驭工程入门》`（用链接文字或目标文 title） |

规则：保留可读引用，去掉 `(…md)`；能补全书名号则补全。

**② 图片**

保留 `![alt](path)`，紧跟一行提醒（若 path 非 http）：

```markdown
<!-- ⚠️ 公众号发布：CDN 图片需手动下载/上传至微信后台（微信不支持外链图床） -->
```

**③ 删除或移出正文的部分**

- YAML frontmatter（不进入正文区）
- Origin 末尾「文章概述」块 → 改写入「发布元数据 · 摘要」参考，不重复粘贴进正文

**④ 保留**

- 各级标题、引用块、加粗、代码块（公众号支持有限，长代码可注明「见站点原文」）
- 「特别说明：笔者与 AI 协作…」块
- ≥3 处个人细节（比喻、踩坑、第一人称），**润色时不得删**

**⑤ 文末追加（Generate / Polish 默认）**

遵循 SKILL.md「尾部设计」。以下为占位模板，生成时按文章内容填写，具体成稿写入 `content/dist/{slug}/`：

```markdown
{已确定的下一篇主题与读者收益；没有下一篇时省略}

{一个与本文相关、读者能结合自身情况回答的问题}

{站点实际提供的补充材料说明；入口已确认后，引导阅读原文}
```

- 预告与问题随文章内容改写；没有确定的下一篇时省略预告。
- 将实际站点 URL 写入 `origin_url`，供填写后台原文链接字段；考虑站点路由规则，不能仅凭文件名猜测 URL。
- 最后一句仅在后台已配置原文入口且确认显示名称后使用。尚未验证时标为发布待办，不能标记发布就绪；无入口时改为站点地址说明。
- 默认不再追加固定关注口号，也不在正文附长 URL。普通正文样式即可。

### 1.3 发布元数据

**标题备选 ×3**（brand-voice §6.2，个人化、低套路）：

- 故事 / 经验 / 观点 / 案例型各可一

**摘要 80–120 字**：

- 第一人称
- 含核心结论 + 个人体验
- 可独立作公众号「摘要」字段

### 1.4 落盘

```
content/dist/{slug}/
├── meta.yaml      # 更新 platforms.wechat
├── wechat.md      # 纯正文与 frontmatter，结构见 SKILL.md
├── wechat.html    # 唯一正式 HTML
└── wechat-review.json # 静态检查与人工认可记录
```

`meta.yaml` 示例：

```yaml
slug: delivery-start
origin: docs/sre/devops/foundation/01-delivery-start.md
title: DevOps 基础 01 ｜ Nginx 静态资源代理
series_ref: devops-basics          # 指向 content/series.yaml
pillar: 云原生
platforms:
  wechat:
    account: AI持续运维
    status: draft  # 完成后台验收且用户确认可发后设为 ready
    output: wechat.md
    title_selected: DevOps 基础 01 ｜ Nginx 静态资源代理
    origin_sync: generated   # generated | polished
```

**`series_ref`**：系列文章的 `meta.yaml` 必须包含此字段，引用 `content/series.yaml` 的系列 id。命名格式由 `brand-voice §5.4` 规定。

### 1.5 异常系列快捷路径

Origin 在 `docs/sre/devops/exception-*.md` 且含大量 `exception-XX.md` 链接时：

```bash
cd docs/sre/devops && python3 convert_for_wechat.py {filename}
```

再执行 1.3 补标题/摘要/引流，并按 brand-voice 做轻量 Polish。

---

## Phase 2：Polish（二次润色优化）

用户说「润色」「优化」「压缩」「改标题」时，**在已有 `wechat.md` 上改**，不重新从 Origin 覆盖正文，除非用户明确要求「重新生成」。

### 2.1 润色原则

| 可做 | 不可做 |
|------|--------|
| 压缩冗余、改口语、优化过渡 | 删掉个人案例 / 比喻 |
| 调整标题备选、重写摘要 | 改成 AI 腔与营销词（如：综上所述、赋能、拥抱、抓手、闭环、降本增效） |
| 优化预告、问题和原文入口说明 | 丢失原文 URL 或虚构下篇主题 |
| 段落改为 3–5 行 | 引入套路爆款标题 |

### 2.2 润色记录

更新 frontmatter 中的润色记录；发布状态写入 `meta.yaml` 的 `platforms.wechat.status`，审核结果另存 `wechat-review.json`，见 [审核流程](review-workflow.md)：

```yaml
mode: repurpose+polish
polish:
  - "2026-06-25: 压缩结对编程痛点段，保留野马比喻"
```

### 2.3 发布 checklist（Polish 后核对）

- [ ] 摘要 80–120 字
- [ ] 标题已人工选定 1 个
- [ ] 图片上传提醒已处理
- [ ] 原文链接已配置并验证，文末引导与实际入口一致
- [ ] 后台预览排版正常
- [ ] `meta.yaml` status 更新

---

## 与 Origin  diff 策略

| Origin 变化 | 动作 |
|-------------|------|
| 小改（错别字、链接） | 仅 Polish 受影响段落 |
| 大改（增删章节） | 用户确认后 Re-generate，再 Polish |
| 已 published | 重新 Generate 前备份旧 wechat.md 或升 version |

---

## 工具协作

| 工具 | 用途 |
|------|------|
| `convert_for_wechat.py` | exception 系列链接批量转换 |
| `markdown-formatter` | 加粗与中文标点兼容 |
| `nano-banana-2` | 封面 900×383 |
| `content-repurpose` | 全平台编排时调用本 skill |
