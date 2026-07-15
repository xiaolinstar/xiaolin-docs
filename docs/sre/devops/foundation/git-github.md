---
title: 03 ｜ Git 与 GitHub：版本管理与服务器构建
description: 用 Git 把代码变成「带历史的快照」，用 GitHub 当云端中转，从此告别盲传 dist——部署动作搬上服务器，构建就在生产环境完成。
date: 2026-07-10
updated: 2026-07-15
category: SRE 运维
tags:
  - DevOps
  - Git
  - GitHub
---

上一篇的最后，我们聊到手工备份解决不了版本管理——它更像一份「错题本」：抄了但没看，看了又找不到，找到也用不上。这一篇要顺着这条线继续走：**怎么把那次没补上的能力补完。**

上一篇末尾留下了三个手工备份的断点，先用一段把它们讲清楚——后文所有讨论都建立在这三点之上：

- **会被跳过。** 上线前你想起要备份，但心里想「这次只改了一行 CSS，问题不大」，于是直接覆盖。等到真的出问题——没有备份可回。
- **没有上下文。** 假设这次备份了，目录名是 `dist-20260713`。事后想排查「那天到底改了什么」，目录本身不会告诉你——只有日期，没有线索。
- **回退要重做一遍部署动作。** 真要回退，你得登录服务器、找到备份目录、`mv` 回去、再重启 Nginx——回退本身就是另一轮容易出错的手工操作。

这三个断点叠在一起，手动备份就只剩下「形式上在做版本管理」，真正的版本管理它给不了。这一篇要做两件事：

1. **版本管理**：每次代码变更都有记录，部署天然可追溯、可回退。
2. **服务器构建**：构建动作搬到生产环境，不再 `scp` 一堆文件，本地只推源码。

## 从「传文件」到「传代码」

<!-- TODO(图)：把下方 scp / git pull 两段 text 代码块合并为左右对比信息图 `img-git-github/diagram-scp-vs-git.png`。
     视觉规范：左蓝（#1890ff，旧范式 本地构建 + scp）/ 右橙（#fa8c16，新范式 服务器 pull + build），与 [站点视觉语言](../../planning/visual-language.md) 一致。
     生图命令（CLI 未安装，需先 `curl -fsSL cli.inference.sh | sh`）：
       belt app run google/gemini-3-1-flash-image-preview --input '{ "prompt": "...", "aspect_ratio": "16:9" }'
     上传：cp 到 docs/public/images/img-git-github/ 后 pnpm run media:upload；Markdown 用 https://media.xiaolin.fun/docs/img-git-github/diagram-scp-vs-git.png。 -->

上一篇的部署动作是：

```text
本地：构建 → scp dist → 服务器：覆盖站点目录 → 公网验证
```

这套动作有两个先天缺陷：

- **传的是产物，不是意图。** 一次部署看上去就是「一堆文件被覆盖」，你很难从「服务器上现在的文件」反推「这次改了哪段代码」。
- **构建在本地，环境差异没人兜底。** 本地 Mac 上的 Node / pnpm 版本、依赖锁文件里的间接依赖，都可能跟服务器不一致——尤其是改了一行依赖，本地 `pnpm install` 顺利，服务器跑就崩。

<!-- TODO(图)：把下方 text 代码块替换为信息图 `img-git-github/diagram-deploy-pipeline.png`（横向链：本地 push → GitHub → 服务器 pull+install+build+cp → 公网）。生成工具 infsh / MCP 待接入。 -->

把它们一起改：构建动作上服务器，服务器拿到的是源码。这样：

```text
本地：git push 源码
服务器：git pull → pnpm install → pnpm run docs:build → cp dist → 公网验证
```

「传什么」从**一堆产物文件**变成**一次明确的代码变更**。这是本系列第一次范式转换：**部署动作的对象从「二进制产物」升级为「带历史的源码」**——任何一次部署都能精确对应到一次 commit。

实现这一转换的关键，是用上 **Git**——一个版本管理功能极强的工具。Git 不只是「改文件前先备份」，它把每一次改动都变成可命名、可回看、可对比的快照。后面两节会先讲 Git 最小能力，再回到部署流程。

## 版本管理：给代码拍快照

上一节那三个断点——被跳过 / 没上下文 / 回退重做——本质都是同一件事：**没有「这次和上次」的对照基线。** 版本管理补的就是这个基线：每一次你觉得「可以了」的状态都打一个快照（commit），以后任何时候都能回到任意一张。

### Git 最小用法

日常 80% 只用这几条，按出现顺序记即可：

```bash
# 1. 看改了啥
git status
git diff

# 2. 确认要记录哪些
git add .

# 3. 拍快照
git commit -m "feat: 完成首页布局"

# 4. 看历史
git log --oneline

# 5. 推到云端（下一篇会用）
git push
```

| 命令 | 作用 | 时机 |
| --- | --- | --- |
| `status` / `diff` | 看当前改动 | commit 之前 |
| `add` | 选要记录的改动 | commit 之前 |
| `commit` | 拍一张快照 | 一个清晰的小节点 |
| `log` | 看快照列表 | 出问题想回看时 |
| `push` | 把快照送到云端 | 本地节点稳了之后 |

> 提交说明尽量说清「做了什么」。`feat:`、`fix:` 这类前缀不是必须，但比一律写 `update` 好读得多；团队规范可参考 [Conventional Commits](https://www.conventionalcommits.org/)。

**最小工作流**：`status / diff → add → commit → log`。分支、合并、变基等，留到多人协作时再学。

## GitHub：把快照送到云端

本地硬盘是快照的「主存」——但硬盘坏了，历史一起没了。GitHub 把本地仓库同步到云端，相当于**带历史的备份**，也是后面服务器 `git pull` 的源头。

首次关联与推送：

```bash
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

之后三条核心命令：

| 命令 | 方向 | 作用 |
| --- | --- | --- |
| `git push` | 本地 → GitHub | 把本地新 commit 送到云端 |
| `git pull` | GitHub → 本地 / 服务器 | 把云端新 commit 拉下来 |
| `git clone` | GitHub → 任意机器 | 首次把整个仓库（含历史）复制过来 |

> 仓库里不要提交密码、Token、私钥。用 `.gitignore` 忽略 `.env` 等敏感文件；万一推上去了，应立刻轮换密钥，而不是只删文件再推一次。

## 服务器构建：把部署搬上生产环境

这是本篇落地的一节。流程分两步：**第一次拉仓库，之后每次 pull + build。**

### 第一次：服务器克隆仓库

与上一篇保持一致，使用普通用户（如 `ubuntu`），需要权限时再 `sudo`：

```bash
ssh ubuntu@你的公网IP
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www
cd /var/www
git clone https://github.com/你的用户名/你的仓库名.git my-site
```

私有仓库需要配置部署用的 SSH 密钥或访问令牌；首次建议先用公开仓库把流程跑通。

### 以后每次更新

**本地（开发闭环内）：**

```bash
git add .
git commit -m "fix: 调整首页文案"
git push
```

**服务器（生产发布）：**

```bash
cd /var/www/my-site
git pull
pnpm install   # 依赖有变化时执行；没有变化可跳过
pnpm run docs:build
sudo cp -r docs/.vitepress/dist/* /var/www/html/
```

> 对 VitePress 这类需要构建的站点：Git 同步的是**源码**，不是 `dist`。`git pull` 之后仍要在服务器上构建，再把产物拷到 Nginx 目录。

### 跟 scp 相比，到底赢在哪

| 维度 | scp | git pull + server build |
| --- | --- | --- |
| 部署记录 | 几乎没有 | 每次 commit 天然对应 |
| 回退 | 靠记忆或手工备份目录 | `git log` 找到 commit，处理即可 |
| 部署传的是 | 一堆文件 | 一次明确的代码变更 |
| 多人同时改 | 谁后传谁覆盖 | 先在 Git 里合并，冲突可见 |
| 构建环境 | 本地（与生产不一致风险） | 服务器（与生产一致） |

对运维来说，最大收益不是「少敲一条命令」，而是**每一次上线都能对应到一次可追溯的变更**。出了问题，先看最近几次 commit，比回忆「上次 scp 传了啥」可靠。

### 回退怎么理解

初学阶段先建立两个层次：

1. **看清楚**：`git log --oneline` 找到「上一个正常」的 commit。
2. **再动手**：本地用新 commit 修好再 `push`，服务器再 `pull` + 构建，通常比在服务器上强行 `checkout` 旧提交更安全。

在服务器上直接把工作区拨回旧 commit 能救急，但容易和「本地又推了新提交」打架。基础篇先做到「每次上线都对应一次清晰的 commit」；强制拨历史留给后文和团队规范。

## 协同开发（点到为止）

多人改同一项目时，Git 的价值会放大：两个人改了同一文件的同一处，`git pull` 可能出现冲突（Conflict），需要手动决定保留哪一边。

分支策略、Code Review、Pull Request 等超出本系列基础篇范围。<!-- TODO(图)：下方工作流串 text 代码块改造成单线流程图 `img-git-github/diagram-workflow.png`。
     视觉规范：蓝色调（这是开发闭环内部），横向 6 节点，箭头明确。
     生图/上传路径同上。 -->

个人开发者先把下面这条链路用熟：

```text
status / diff → add → commit → push →（服务器）pull → build → 发布
```

## 小结

这一篇做了一次范式转换：**部署的对象从「产物」升级为「带历史的源码」，部署动作从「本地 scp」升级为「服务器 pull + build」。** 版本管理把上一节的三个手工备份断点一次性补完：每次 commit 都是带上下文的快照，回退只需定位 commit，过程不再依赖手工。

但这一步仍是「手动的 $f'$」——`git pull`、`pnpm install`、`pnpm run docs:build`、`cp`、浏览器验证，每一步都还要你登录服务器逐条敲。下一步进入[第 04 篇](./server-side-deploy.md)：当站点从纯静态走向带运行时的服务端应用，依赖与环境差异会进一步放大；解决这个问题的工具，是容器化与流水线。

## 思考

1. `git commit -m "update"` 这样的说明有什么问题？好的提交说明至少应包含什么信息？
2. 如果有人直接在服务器上改了已跟踪文件（没走 Git），再执行 `git pull` 可能发生什么？
3. GitHub 仓库若误含密码或 API Key，只删文件再推一次够不够？正确做法是什么？
4. 把构建从本地搬到服务器，赢的不只是「环境一致」，还赢在哪一点？

## 参考

1. [Git 官方文档](https://git-scm.com/doc)
2. [GitHub 官方文档](https://docs.github.com)
3. [Conventional Commits](https://www.conventionalcommits.org/)
4. [GitHub Hello World](https://docs.github.com/en/get-started/start-your-journey/hello-world)
