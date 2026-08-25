---
name: katex-math
description: "VitePress + markdown-it-katex 项目中数学公式的写作规范与反模式——决定 inline / block / aligned 环境选型、避开 \\ 反斜杠陷阱、unicode 与 LaTeX 公式的语义边界、构建期语法校验。适用于 SRE / DevOps 系列文章里的形式化锚点（$Y=\{v_i\}$、$J_k$、$v_{1a}$ 等）。"
---

# KaTeX 数学公式写作规范

本规范面向本项目（VitePress + markdown-it-katex）下，markdown 文档里的数学公式写法与排版决策。所有规则来自 **05 篇 docker-basics.md 实战踩坑**——含已修复的渲染错误、字号 / 密度问题、与 unicode 字符的边界。

---

## 一、核心决策：选哪种公式模式

| 模式 | 语法 | 字号 | 用途 |
| :--- | :--- | :--- | :--- |
| **inline** | `$...$` | 段落 × 0.9（偏小） | 段落内的简单引用，如「操作清单 `$Y$`」 |
| **block** | `$$...$$` | 段落 × 1.5+（独立行） | 独立成段的公式锚点，**形式化定义优先用** |
| **block aligned** | `$$\begin{aligned}...\end{aligned}$$` | 同 block | 多行对齐公式块 |
| **inline code** | `` `...` `` | 段落 × 1（等宽） | 命令名 / 文件名 / 概念名，**不是数学公式** |

### 决策 SOP

```
1. 形式化锚点（$Y=\{v_i\}$、$J_k$、$v_{1a}$ 这类符号体系）？
   └─ 是 → 必须用 $..$ 或 $$..$$，不要用 inline code
   └─ 否 → 进入 2

2. 跨段落独立成段的公式？
   └─ 是 → 用 $$...$$ block
   └─ 否 → 进入 3

3. 多个公式需要等号对齐？
   └─ 是 → 用 \begin{aligned}...\end{aligned} block
   └─ 否 → 单个 $$...$$ block

4. 命令 / 文件名 / 路径？
   └─ 用 inline code `..`
```

---

## 二、3 类基本写法（可直接复用）

### 1. inline 公式（段落内引用）

```markdown
发布流程是一份操作清单 $Y=\{v_1,\ldots,v_n\}$。
```

**字号**：默认段落 × 0.9；视觉密度高时**改用 inline code** 替换简单符号：

```markdown
发布流程是一份操作清单 `Y = {v_1, ..., v_n}`。
```

但**形式化锚点位置必须用 `$..$`**——这是文章数学严谨度的承载体，不能降级为 inline code。

### 2. block 公式（独立段）

````markdown
$$
Y = \{v_1,\; v_2,\; v_3,\; v_4\}
$$
````

**关键约束**：

- `$$...$$` 块独立成段，前后空行
- 多块 `$$...$$` 之间**必须空行**——否则 markdown 解析器把多个 `$$` 合并为同一公式块，行为不可预期
- 块内单行简单集合（如 `$Y=\{J_1, J_2, J_3, J_4\}$`）一行即可，不要强行 multi-line

### 3. aligned 环境（多行对齐）

````markdown
$$
\begin{aligned}
Y &= \{J_1,\; J_2,\; J_3,\; J_4\} \\
J_1 &= \{v_{1a},\; v_{1b},\; v_{1c}\} \\
J_2 &= \{v_{2a},\; v_{2b},\; v_{2c},\; v_{2d}\} \\
J_3 &= \{v_{3a},\; v_{3b}\} \\
J_4 &= \{v_{4a}\}
\end{aligned}
$$
````

**行终止符 `\\` 必杀技**：

- `\\` 在 markdown 文本里是 2 字符（反斜杠 + 反斜杠）
- KaTeX 在 `aligned` 环境里把它识别为**行终止符**
- **写入文件时必须用 Python 普通字符串 `'\\\\'`**——`\\` 在 Python 普通字符串里就是 1 个 `\`，写到文件是 2 字符 `\\`
- **不能用 raw string `r'\\\\'`**——raw string 把 `\\` 当字面，文件里是 4 字符 `\\\\`，KaTeX 解析失败报 `katex-error`
- 验证脚本：`grep -c 'katex-error' dist/*.html` 必须为 0

---

## 三、必避的反模式（基于 05 篇踩坑）

### ❌ 反模式 1：unicode 字符当数学下标

```markdown
拓扑序：J₁（DB）→ J₂（App）→ J₃（Nginx）
```

这是 unicode 字符 `U+2081 SUBSCRIPT ONE` 等。**它是字符级，不是数学公式**——没有 italic 数学体、没有下标基线规范、与正文同等字号但视觉混乱。

✅ 正确：

```markdown
拓扑序：$J_1$（DB）→ $J_2$（App）→ $J_3$（Nginx）
```

每个 `$J_k$` 走 KaTeX 渲染，下标变小、基线正确、与上下行 `$Y$` 等公式视觉一致。

### ❌ 反模式 2：inline code 替代 inline 公式（形式化锚点位置）

```markdown
发布流程是一份操作清单 `Y = {v_1, ..., v_n}`。
```

虽然视觉上不报错，但**形式化锚点降级为等宽字符**——失去数学语义。

✅ 正确：

```markdown
发布流程是一份操作清单 $Y=\{v_1,\ldots,v_n\}$。
```

`Y` 是**形式化锚点**（02 production-env 引入），必须用 `$Y$` 走 KaTeX 维持数学严谨度。

### ❌ 反模式 3：混合写法 `J_1\_{\text{DB}}`

```markdown
$J_1\_{\text{DB}} = \{v_{1a}, v_{1b}, v_{1c}\}$
```

KaTeX 把 `\_` 当字面下划线，把 `\text{DB}` 当 subscript 子片段——视觉上是 `J_1_DB` 字面下划线 + DB，**不是预期的下标嵌套**。

✅ 正确写法：

```markdown
$J_1^{\text{DB}} = \{v_{1a}, v_{1b}, v_{1c}\}$       % 上标 DB
$J_{1,DB} = \{v_{1a}, v_{1b}, v_{1c}\}$            % 下标 1,DB
```

或更简洁（去掉 DB 名字，列表里说明）：

```markdown
$J_1 = \{v_{1a}, v_{1b}, v_{1c}\}$    % DB 这个名字在列表里说明
```

### ❌ 反模式 4：aligned 块紧邻紧邻

```markdown
$$
Y = \{J_1,\; J_2,\; J_3,\; J_4\}
$$
$$
J_1 = \{v_{1a},\; v_{1b},\; v_{1c}\}
$$
```

两个块没空行——markdown 解析器可能识别为同一公式块（`$$...$$...$$...$$`），KaTeX 渲染异常。

✅ 正确（块间空行）：

````markdown
$$
Y = \{J_1,\; J_2,\; J_3,\; J_4\}
$$

$$
J_1 = \{v_{1a},\; v_{1b},\; v_{1c}\}
$$
````

**或者更推荐**：把多个公式合到一个 `\begin{aligned}...\end{aligned}` 块，**视觉对齐更好**（等号垂直对齐）：

````markdown
$$
\begin{aligned}
Y &= \{J_1,\; J_2,\; J_3,\; J_4\} \\
J_1 &= \{v_{1a},\; v_{1b},\; v_{1c}\} \\
J_2 &= \{v_{2a},\; v_{2b},\; v_{2c},\; v_{2d}\}
\end{aligned}
$$
````

### ❌ 反模式 5：在 markdown / shell heredoc 处理时把 `\\` 写成 `\\\\`

```python
# ❌ raw string：写到文件是 4 个反斜杠
with open(file, 'w') as f:
    f.write(r'\begin{aligned} \\')   # 文件里: \begin{aligned} \\\\

# ✅ 普通字符串：写到文件是 2 个反斜杠
with open(file, 'w') as f:
    f.write('\\begin{aligned} \\\\)   # 文件里: \begin{aligned} \\
```

注意：

| Python 写法 | 文件写入字符 | KaTeX 解析 |
| :--- | :--- | :--- |
| `'\\\\'` 普通字符串 | `\\`（2 字符）| ✅ 行终止符 |
| `r'\\\\'` raw string | `\\\\`（4 字符）| ❌ katex-error |
| `r'\\'` raw string | `\\`（2 字符）| ✅ 行终止符 |
| `'\\'` 普通字符串 | `\`（1 字符）| ❌ 字符不识别 |

---

## 四、视觉密度控制（避免视觉混乱）

05 篇实战发现的问题：**当 1 段里有 5+ 个 inline 公式时，KaTeX 默认 0.9em 字号 + 符号密集 → 读者视觉疲劳**。

### 控制策略

| 密度 | 策略 |
| :--- | :--- |
| 段落内 ≤ 2 个 inline 公式 | 全部用 `$..$` |
| 段落内 3-5 个 inline 公式 | 关键符号用 `$..$`，其余用 inline code `` `..` `` 简化 |
| 段落内 > 5 个 inline 公式 | 把整段改为 block 公式块 + 自然语言叙述，**用 block 公式承载形式化锚点 + 文字承载上下文** |

具体示例（05 篇「核心洞察」段修改前后）：

```markdown
<!-- ❌ 修改前：5 个 inline 公式，视觉混乱 -->
> **核心洞察**：映射 $g$ 让每个 $J'_k$ 内部 step 数从 3-4 折叠到 2——
> 「装环境 + 拷产物 + 写配置 + 起服务」被「pull 镜像 + run 容器」两动作取代。
> **$Y$ 的 job 集合不变，每个 job 内部 step 数大幅减少，job 之间拓扑序保持稳定**。

<!-- ✅ 修改后：3 个 inline code 简化 + 2 个关键 $..$ 保留 -->
> **核心洞察**：映射 `g` 让每个 `J'_k` 内部 step 数从 3-4 折叠到 2——「装环境 + 拷产物 + 写配置 + 起服务」
> 被「pull 镜像 + run 容器」两动作取代。**`Y` 的 job 集合不变**，每个 job 内部 step 数大幅减少，
> job 之间拓扑序保持稳定——这就是「容器化让运维精简」的形式化证据。
```

**判断原则**：

- 如果该 inline 公式是**形式化锚点**（其他段落会引用），用 `$..$`
- 如果该 inline 公式是**临时提及**（只在本段一次出现），可用 inline code `` `..` ``

---

## 五、与其他 skill 的协作

### 与 `sre-visual-standard` 的关系

**`sre-visual-standard`** 决策「text / mermaid / AIGC」三模式——这是图形可视化（流程图、状态机、信息图）。
**`katex-math`**（本 skill）决策「inline / block / aligned」三模式——这是数学公式排版。

两者**不重叠**，但常在同一篇文章里同时出现：

- **流程 / 状态机**：`sre-visual-standard` 决策 SOP 建议 mermaid，但若 mermaid 节点字号过小（VitePress 默认），可改为状态机表格（已在 05 篇 § 4 实体边界实操）
- **形式化锚点**：`katex-math` 决策——单一符号用 inline，集合用 block，多行用 aligned
- **信息图**：`sre-visual-standard` 决策 SOP 建议 AIGC（路线对比、范式跃迁），与公式无关

### 与 `.agents/rules/core.md` 的关系

- `core.md` 第 12 条：「中文全角标点 + 加粗兼容性」——本 skill 不涉及，但 inline code 与加粗结合时也要兼容
- `core.md` 第 13 条：「术语与知识库规范」——`{{term:xxx}}` shortcode 与数学公式不冲突，可独立使用

---

## 六、构建期校验清单

每次新增 / 修改含数学公式的 markdown 后，跑以下命令：

```bash
# 1. vitepress build（验证 KaTeX 解析成功）
pnpm docs:build

# 2. 检查 katex-error 计数（必须为 0）
grep -c 'katex-error' docs/.vitepress/dist/<目标文章>.html

# 3. 检查所有公式 annotation 是否被解析
python3 -c "
import re, pathlib
html = pathlib.Path('docs/.vitepress/dist/<目标文章>.html').read_text()
annotations = re.findall(r'<annotation encoding=\"application/x-tex\">(.*?)</annotation>', html)
print(f'共 {len(annotations)} 个公式，全部 annotation 解析成功 = KaTeX 渲染正常')
"

# 4. markdownlint（行宽干扰项忽略）
markdownlint -c <config>.json <目标文章>.md

# 5. 检查 aligned 环境 `\\` 行终止符
grep -nP '\\\\\\\\' <目标文章>.md   # 出现 4 个反斜杠 → raw string 写错
```

任何一项失败 → 修复后重新跑。

---

## 七、常见问题速查

| 现象 | 原因 | 修复 |
| :--- | :--- | :--- |
| `katex-error` 类出现在 HTML | LaTeX 语法不被 KaTeX 支持 | 检查 `$..$` `$$..$$` `\\\\` 是否合规 |
| 公式块横向溢出视口 | 4 个 job 单行平铺 + `\quad` 分隔 | 拆为 `\begin{aligned}` 多行垂直，或拆为多个独立 $$ 块 |
| `J_1\_{\text{DB}}` 渲染为字面 `J_1_DB` 下划线 | 错误混合写法 | 改为 `$J_1^{\text{DB}}$` 或 `$J_{1,DB}$` |
| `unicode` 字符 `J₁` 视觉混乱 | 用字符级下标替代公式 | 改为 `$J_1$` math mode |
| inline 公式视觉密度过高 | 段落内 inline 公式数 > 5 | 关键符号用 `$..$`，其余用 inline code `` `..` `` |
| aligned 块视觉对齐错乱 | `\\` 行终止符未正确写入（raw string 4 字符） | 用 Python 普通字符串 `'\\\\'` 写入 |
| `$$` 块紧邻不识别 | markdown 解析器合并为同一块 | 块间保留空行 |
| mermaid 节点文字过小 | VitePress + mermaid 默认字号小 | 改为状态机表格（参考 sre-visual-standard）|

---

## 参考

- `docs/sre/devops/foundation/docker-basics.md` — 实战样本（视角 1 合并后的 5 行 aligned 块 + 形式化锚点 + 23 个 inline 公式）
- `docs/sre/devops/foundation/production-env.md` — 形式化锚点源头（$Y=\{v_1,...,v_n\}$ 操作清单模型）
- `.agents/skills/sre-visual-standard/SKILL.md` — 图形可视化决策 SOP
- `.agents/rules/core.md` — 中文排版与术语库规范
- VitePress + markdown-it-katex 文档：<https://vitepress.dev/guide/markdown#math-equations>
- KaTeX 支持的 LaTeX 子集：<https://katex.org/docs/supported.html>
