# AI Agent 时代下重新审视 Git

## 前言：我的三段 Git 进化史

回顾自己与 Git 的交集，大致可以分为三个极具时代特征的阶段：

**大二的「纯真时代」**  

第一次接触 Git 是在大学二年级的 Android 开发课上，老师要求将作业提交到 GitHub。那时候对版本控制毫无概念，脑子里只塞下了 `git add`、`git commit` 和 `git push` 这一套最基础的“三板斧”，每一次能成功推上去都像在完成某种神秘仪式。这时候也开始完全使用 Markdown 代替 Word，已经开始使用 Git 来管理我的文档和作业。

【git 命令行】

**职场的「高效时代」**  

后来进入互联网公司实习，面对企业级 GitLab 协同开发，开始接触并使用特性分支（Feature Branch）开发主干分支发布，频繁使用 `git stash` 暂存代码、`git merge` 解决冲突、`git cherry-pick` 跨分支拣选提交。为了追求效率，我彻底扔掉了命令行，转而用 IntelliJ IDEA 强大的 Git 插件进行图形化操作。Git 变成了协作流水线上一个熟练而自然的动作。

【Git 插件】

**AI Agent 的「失控时代」**  

而现在，我们步入了 AI Agent 时代。各种 CLI、AI 原生 IDE 和桌面客户端百花齐放。然而，这种极速的生产力爆发却带来了一种前所未有的冒犯感——AI 经常在不经人类同意的情况下，自动帮我执行了 `git commit` 甚至直接 `push` 到了远程。这种“喧宾夺主”的行为非常没有礼貌，不仅污染了提交历史，还把未经验证的代码直接推向了生产环境。

从大二的被动应付，到职场的熟练驾驭，再到如今面对 AI Agent 自动提交的警惕与防范。这一次，我们必须站在人机协同的全新高度，重新审视并重构 Git 的防御能力。

## Hooks 缰绳：Git 本地 pre-commit 的硬核卡点

给 Git 装马栓，首先必须了解最前哨的关卡 —— `pre-commit` 钩子。

`pre-commit` 是 Git 内置的钩子脚本之一，存放在项目根目录的 `.git/hooks/pre-commit` 位置。

* **触发时机**：在用户（或 AI）输入 `git commit` 命令后，且在 **Git 弹出窗口让用户输入 commit message 之前** 被自动触发。此时代码已被暂存（staged），但尚未正式记录进版本历史。
* **执行逻辑**：Git 会调用执行该钩子中的 Shell 脚本。如果脚本执行完毕并返回状态码 `0`，则代表验证通过，提交流程正常继续；如果脚本返回任何非零值（如 `exit 1`），**Git 会立刻中断 commit 过程，物理性阻止本次代码写入**。

在极端情况下，人类可以通过 `git commit --no-verify`（简写为 `-n`）强行跳过该钩子。

### 2. 实战：pre-commit 阻断 AI 自动提交的三种方法

#### 方法 A：检测非交互式环境（TTY）
AI Agent 通常在没有伪终端（PTY）的子进程中自动调用 shell 命令。我们可以通过 TTY 检测把 AI 拦在门外：

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 检测标准输入是否连接到真正的 TTY 终端
if [ ! -t 0 ]; then
  echo "⚠️ [安全拦截] 检测到非交互式环境执行 git commit，疑似 AI 自主行为。"
  echo "❌ 已拒绝本次提交。请在真实的终端环境中手动执行 commit。"
  exit 1
fi
```

#### 方法 B：强行重定向 TTY 实行二次交互确认
如果你允许 AI 发起 commit，但必须在最终提交前让你看一眼并回车确认，可以强行夺回输入流：

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 强行将输入流重新指向物理终端的 TTY，防止输入被 Agent 截断或静默忽略
exec < /dev/tty

echo "❓ 检测到 Git 提交请求，请输入 'confirm' 批准本次提交："
read -r user_input

if [ "$user_input" != "confirm" ]; then
  echo "❌ 授权确认失败，已撤销本次 Git 提交。"
  exit 1
fi
```
**原理解析**：`exec < /dev/tty` 会使即使是后台静默运行的 Agent，在 pre-commit 阶段也会被强行挂起，直到屏幕前的人类敲入 `confirm`。

#### 方法 C：配合 commit-msg 强校验 commitlint
AI 生成的 commit 信息经常长篇大论。利用 `commit-msg` 钩子配合 `commitlint`，任何不符合 `feat:`、`fix:` 规范的格式将直接被 exit 1 阻断。这强迫 AI 遵守 Conventional Commits 规范，也有助于规范其提交频率。

---

## Permission 栅栏：从账号与指令限制越权提交

当本地 Hook 因 Agent 携带 `--no-verify` 被绕过，或者本地 `.git/hooks/` 配置文件被 AI 直接修改时，我们必须依靠 **Permission（权限控制）** 构筑防御栅栏。

### 1. Claude Code 的 Permission Ask 权限机制
以当前自主性极强的终端 Agent —— **Claude Code** 为例，其内部设计了一套原生权限审核架构：

* **命令与修改确认（Permission Ask）**：默认情况下，Claude Code 所有的写文件、终端 Shell 命令执行以及 Git 操作都是**非特权**的。每当它准备调用 `git commit` 或 `git push` 时，终端上都会弹出明文询问，等待人类键入 `y` 进行授权：
  ```text
  May I run git commit -m "feat: modify config" ? [y/N]
  ```
* **特权模式的危害**：如果在启动时附加了 `-y` 或 `--dangerously-allow-all` 参数，AI 将进入特权状态，直接放行所有的终端指令和网络请求，这相当于主动卸载了第一道权限防线。
* **隔离与沙箱限制**：在安全性要求极高的商业项目中，建议将 Claude Code 置于容器（如 Docker）或轻量沙箱（如 Sandbox）中运行。此时，通过容器权限限制，剥夺其修改 `.git/` 配置目录的写权限，防止其自主擦除本地 Git Hooks 脚本。

### 2. 写入身份防篡改（Git Attribution）
为了防止 AI Agent 混淆人类的 Git 提交记录，应在其运行的环境变量中强制注入专属的身份标识：
```bash
export GIT_AUTHOR_NAME="Claude Agent"
export GIT_AUTHOR_EMAIL="claude-agent@yourdomain.com"
```
一旦 Agent 被打上了“AI 身份戳”，我们在服务端审核时便能一目了然地识别出哪些是 AI 的自主推送。

### 3. 服务端分支保护（Protected Branches）与强制人类 Approve
无论本地如何设卡，服务端才是“终审法院”：
- **锁定主干**：对主分支（如 `main`）启用保护规则，禁止任何角色直接 push，即使是管理员或带有部署 Token 的 AI 脚本也不例外。
- **人类 Approve 门槛**：所有修改必须发起 Pull Request。配置托管平台规则，要求 PR 必须获得至少 1 名人类团队成员的 **Approve**，代码才被允许合入主干。这是阻止脱缰 AI 污染生产环境的最终关卡。

---

## 双剑合璧：如何配合驾驭 Git

要完美驾驭 AI 的 Git 行为，不能单打独斗，而是需要将两者深度编排：

```text
 ┌─────────────────────────────────────────────────────────┐
 │ 1. Claude 语义审计 (Permission Ask) ──> 意图常识初筛     │
 └────────────────────────────┬────────────────────────────┘
                              │ 批准通过
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 2. 本地 Hooks 守门 (TTY/Gitleaks) ──> 物理阻断与格式硬限制 │
 └────────────────────────────┬────────────────────────────┘
                              │ 提交并推送分支
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 3. 服务端分支保护 (Approve Required) ──> 人类最终裁决   │
 └─────────────────────────────────────────────────────────┘
```

1. **AI 内部做温和约束**：通过 System Prompt 约束 Claude Code “在提交 Git 前，先用自然语言陈述本次修改的范围与安全考量，并请求人工确认”。
2. **本地做冷酷把关**：通过 `pre-commit` 和 `gitleaks` 做死规则卡点，防止人肉审核产生的疏漏，把格式错误和泄露密钥直接拦截在本地。
3. **服务端做铁律底线**：通过分支保护与 PR 人工审核流程，防止 AI 绕过本地配置或本地失控。

通过这种“双剑合璧”的链条，AI Agent 变成了高效的代码产出者，而 Git 守住了它的提交通道。人机协同，效率与安全兼得。
