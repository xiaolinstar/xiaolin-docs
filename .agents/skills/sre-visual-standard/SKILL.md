---
name: sre-visual-standard
description: "根据站点视觉语言与媒体规范，为 DevOps / SRE 系列文章生成或绘制插图（Mermaid 流程图、静态手绘线稿图）。"
---

# SRE 专题文章画图视觉与媒体规范技能

本技能专门用于指导和规范「DevOps / SRE」系列文章中插图的设计、生成、存储与上传工作流，确保插图风格与站点视觉语言完全一致。

---

## 核心决策：何时用图

| 场景 | 优先方案 | 说明 |
| :--- | :--- | :--- |
| 角色 / 环境 / 节奏对照（本地 ×N、生产 ×1） | **静态信息图** | 一眼能读；Mermaid 盒子叠色往往不够 |
| **线性步骤、决策分支（≤ 6 节点）** | **Mermaid 流程图** | 直接在 Markdown 中用代码块绘制，严禁生成静态图，以降低维护改图成本 |
| 命令输出、配置片段 | **代码块** | 不要做成截图式信息图 |

---

## 语义配色标准

静态信息图与 Mermaid 流程图的配色必须严格遵循以下语义色系：

| 语义 | 推荐色值 | 适用场景 |
| :--- | :--- | :--- |
| **开发 / 本地闭环** | **蓝** `#1890ff` 系 | 可重复、可失败、可回滚的一侧 |
| **发布 / 生产路径** | **橙** `#fa8c16` 系 | 验收后通常一次、跨机器的一侧 |
| **中性环境 / 说明** | **灰** `#8c8c8c` 系 | 标签、箭头辅助、次要标注 |
| **强调 / 次数标记** | **黑字 + 色块角标** | 如 `×N`、`×1` |

*注意：所有插图背景必须为浅色，线稿清晰。严格禁止使用彩色渐变、大面积阴影或 3D 效果。*

---

## 角色与环境图标（统一 ID）

绘图与文案描述中需保持以下元素画法要点的一致性：

- `actor.dev`：简笔开发者（在笔记本前或持键盘）。
- `env.local`：笔记本或本机窗口.
- `env.server`：云或机架小图标。
- `env.public`：地球或浏览器窗口。

---

## 静态信息图生成规范 (Prompt 模板)

当需要生成静态信息图时，生图工具（如 `generate_image`）的 Prompt 应统一组装如下：

```text
Notion style minimalist line art infographic, hand-drawn marker stroke texture. 16:9 aspect ratio.
[具体的内容描述，如：
Left side (blue accent #1890ff): 'Old Paradigm: Local Build + SCP' with simple PC icon.
Right side (orange accent #fa8c16): 'New Paradigm: Server Pull + Build' with cloud server icon.]
Clean white background with lots of negative space. No gradients, no 3D effects, no shadows.
```

---

## 媒体保存与上传工作流

1. **本地保存**：将新图放入项目 `docs/public/images/img-{slug}/` 目录中。
   - 文件名必须是小写 ASCII + 数字 + 连字符，如 `diagram-scp-vs-git.png`，禁止中文、空格或下划线。
2. **上传 COS**：在项目根目录运行以下命令将本地目录同步到腾讯云 COS 中：
   ```bash
   pnpm run media:upload
   ```
3. **CDN 引用**：在 Markdown 中直接以以下绝对 URL 形式引用图片：
   `https://media.xiaolin.fun/docs/img-{slug}/{image-name}`

---

## 图 + Prompt 落位规范

当 mermaid 流程图后续可能升级为静态信息图时，**在文章中嵌入 `<details>` 块含 Prompt**：

- 块首用简要 `<summary>`（如「📐 静态信息图 Prompt（可选升级）」）
- 块内含完整 Prompt（模板见上文「静态信息图生成规范」）
- 末尾给预期产物路径 + CDN 引用

这样后续 Codex / Antigravity 生成静态图时，Prompt 在文档中自带——**不依赖外部维护表**。
