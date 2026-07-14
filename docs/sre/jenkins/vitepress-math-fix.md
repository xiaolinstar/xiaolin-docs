---
title: VitePress 数学公式乱码与放大：从 MathJax 切到 KaTeX
description: 记录本站 Markdown 数学公式显示异常的排查过程，以及最终采用 KaTeX 单一渲染器的修复方案。
date: 2026-07-14
updated: 2026-07-14
category: SRE 运维
tags:
  - VitePress
  - KaTeX
  - MathJax
---


> 现象：站点 Markdown 中的 `$...$` / `$$...$$` 公式出现乱码、叠字或整体偏大，甚至「修 CSS 后公式直接不显示」。  
> 结论：VitePress 官方 `markdown.math: true`（MathJax / `markdown-it-mathjax3`）在本站场景不稳；**文档站应只用 KaTeX，且不要与 MathJax 并用。**

## 现象

典型页面：[`/easy-office/markdown`](/easy-office/markdown)、[`/sre/practice/monitoring-health`](/sre/practice/monitoring-health)。

- 公式旁多出斜体 / 原生 MathML 字符，看起来像乱码
- 行内公式相对中文正文明显偏大
- 尝试用 CSS「藏 assistive MathML、压 `ex` 尺寸」后，公式可能被裁没、完全不显示

## 根因

本站原先配置：

```ts
markdown: {
  math: true // → 自动加载 markdown-it-mathjax3
}
```

`markdown-it-mathjax3` 会同时输出：

1. **SVG**（可见公式）
2. **`mjx-assistive-mml`（无障碍 MathML）**

在 Vue / VitePress SSR 与中文字体环境下，常见两类问题：

| 问题 | 机制 |
|------|------|
| 乱码 / 叠字 | Assistive MathML 依赖的 `clip` 裁切失效，MathML 与 SVG 叠显 |
| 偏大 | SVG 宽高用 `ex` 单位，相对周围字体的 x-height；中文字体度量偏大，公式被放大 |

补充说明：

- **不是**「两套 Markdown 公式引擎冲突」。正文原先只有 MathJax。
- Mermaid 依赖树里虽有 KaTeX，只服务流程图内公式，**不处理**正文 `$...$`。
- 用 CSS 强行 `line-height: 0` + `overflow-y: hidden` 隐藏 assistive 层，容易把 SVG 一并裁掉。

## 业界做法

| 方案 | 适用 | 备注 |
|------|------|------|
| **KaTeX** | 博客 / 文档站（推荐） | 快、小、HTML+CSS，样式稳定 |
| MathJax（`math: true`） | 学术、超复杂 LaTeX | 重；在 VitePress 上易踩 assistive MathML 坑 |
| 双开 | 禁止 | `$` 会被两套解析器抢 |

VitePress 官方只内建了 MathJax 开关；文档站主流实践是自行接入 KaTeX 插件，并 **关闭** `math: true`。

## 最终方案

### 1. 依赖

```bash
pnpm add -D katex @vscode/markdown-it-katex
# 不再依赖正文渲染路径上的 markdown-it-mathjax3
```

### 2. 配置（`docs/.vitepress/config.mts`）

```ts
import markdownItKatexModule from '@vscode/markdown-it-katex'

const markdownItKatex =
  (markdownItKatexModule as unknown as { default?: typeof markdownItKatexModule }).default
  ?? markdownItKatexModule

// ...
markdown: {
  math: false, // 关键：禁止与 KaTeX 双开
  lineNumbers: true,
  config: (md) => {
    md.use(markdownItTaskListPlus)
    md.use(markdownItKatex)
  }
}
```

> `@vscode/markdown-it-katex` 为 CJS；在 ESM 配置里需兼容 `.default`。

### 3. 主题样式（`docs/.vitepress/theme/index.ts`）

```ts
import 'katex/dist/katex.min.css'
```

删除针对 `mjx-*` 的临时补丁 CSS，避免再次裁切公式。

### 4. 文稿语法（不变）

- 行内：`$E = mc^2$`
- 块级：

```md
$$
Availability = \frac{MTBF}{MTBF+MTTR}
$$
```

## 验收

```bash
pnpm docs:build
pnpm docs:dev
```

抽检：

- 构建 HTML 含 `class="katex"`，**不含** `mjx-container`
- CSS 打包含 `.katex` 与 `KaTeX_Main` 字体
- 打开上述示例页：行内 / 块级公式清晰、尺寸正常

## 经验沉淀

1. 文档站优先 KaTeX；不要为了「官方开关」硬上 MathJax。
2. `math: true` 与手动 KaTeX 插件 **不要同时开启**。
3. MathJax assistive MathML 问题优先换引擎，而不是堆脆弱 CSS。
4. lockfile 里若仍出现 `markdown-it-mathjax3`，多半是 VitePress 可选 peer，只要 `math: false` 且正文走 KaTeX，就不会双渲染。

## 参考

- [VitePress Markdown：数学方程](https://vitepress.dev/guide/markdown#math-equations)
- [KaTeX](https://katex.org/)
- [`@vscode/markdown-it-katex`](https://www.npmjs.com/package/@vscode/markdown-it-katex)
- 相关上游讨论：[markdown-it-mathjax3 #66](https://github.com/tani/markdown-it-mathjax3/issues/66)
