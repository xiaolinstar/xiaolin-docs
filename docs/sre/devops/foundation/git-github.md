---
title: 03 ｜ Git 与 GitHub：版本管理与云端仓库
description: Git 给代码拍带上下文的快照，GitHub 把这些快照同步到云端。作为开发者必须熟悉的两个工具，它们是后续一切部署、流水线与协作的基础。
date: 2026-07-10
updated: 2026-07-24
category: SRE 运维
tags:
  - DevOps
  - Git
  - GitHub
---

上一篇（02 生产环境）用 scp 把构建产物传到云服务器，完成了一次手动部署。但随之而来的问题是：**服务器上这次部署对应的是哪一份代码？** 如果本地和服务器来回改，版本很快会对不上；出了问题想回退，也找不到明确的回退点。

这个问题的解法是**版本管理**。本篇介绍两个开发者必须熟悉的工具/网站：

- **Git**：本地版本管理工具，给每一次变更拍快照。
- **GitHub**：云端代码托管平台，把快照同步到远端，便于备份与协作。

对运维人员来说，不必成为 Git 专家，但需要理解：后续所有部署、流水线、GitOps 都建立在「代码有版本」这个前提之上。

## 为什么需要版本管理

手动部署时常见的「备份」做法是：把旧目录重命名为 `dist-20260713`，再上传新目录。这种做法有三个断点：

- **会被跳过。** 改动小时心想「问题不大」，直接覆盖，等出事没有备份可回。
- **没有上下文。** `dist-20260713` 只告诉你日期，不会告诉你是谁改了什么、为什么改。
- **回退要重做一遍部署动作。** 找到备份目录、mv 回去、重启服务——回退本身就是另一轮手工操作。

版本管理一次性补完这三个断点：

- 每次你觉得「可以了」的状态都打了一个**快照（commit）**。
- 快照附带了**修改人、时间、说明**，事后排查有上下文。
- 回退时只需要定位到某个快照，不需要手动复制目录。

## Git：给代码拍快照

Git 是本地版本管理工具。它把每一次改动都变成可命名、可回看、可对比的快照。

### 最小用法

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

# 5. 推到云端（下一篇会用到）
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

### 为什么快照比备份目录更可靠

备份目录只有「旧」和「新」两个状态，而 commit 历史是一条链：

```
A → B → C → D
```

每个节点都知道自己从哪里来，也能随时回到任意节点。想回退到 B，不需要手动 mv 目录，只需要告诉 Git「我要回到 B」即可。

## GitHub：把快照送到云端

本地硬盘是快照的「主存」——但硬盘坏了，历史一起没了。GitHub 把本地仓库同步到云端，相当于**带历史的备份**。

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

## 从运维视角看：Git 在部署链路中的位置

04 篇讨论「构建动作放在服务器还是本地」时，有一个隐含前提：**服务器上的代码必须和某次明确的提交对应**。否则构建再规范，也说不清楚这次部署到底包含了哪些变更。

Git 在这里承担两个角色：

1. **版本锚点**：任何一次部署都能精确对应到一次 commit。
2. **传输媒介**：通过 `git push` / `git pull` / `git clone` 把源码在不同机器间同步。

对于个人开发者或小团队，GitHub 仓库可以直接作为部署的代码源；对于企业环境，生产服务器通常不会直接访问 GitHub，而是通过内部 Git 仓库、CI 流水线或私有镜像间接获取代码。无论哪种形态，**版本管理这层都是绕不开的**。

## 协同开发（点到为止）

多人改同一项目时，Git 的价值会放大：两个人改了同一文件的同一处，`git pull` 可能出现冲突（Conflict），需要手动决定保留哪一边。

分支策略、Code Review、Pull Request 等超出本系列基础篇范围。

个人开发者先把下面这条链路用熟：

```mermaid
graph LR
    A[status / diff] --> B[add]
    B --> C[commit]
    C --> D[push]
    D -.-> E[pull]
    E --> F[build]
    F --> G[发布]
    style A fill:#1890ff,stroke:#1890ff,color:#fff
    style B fill:#1890ff,stroke:#1890ff,color:#fff
    style C fill:#1890ff,stroke:#1890ff,color:#fff
    style D fill:#1890ff,stroke:#1890ff,color:#fff
    style E fill:#fa8c16,stroke:#fa8c16,color:#fff
    style F fill:#fa8c16,stroke:#fa8c16,color:#fff
    style G fill:#fa8c16,stroke:#fa8c16,color:#fff
```

## 小结

Git 和 GitHub 是开发者必须熟悉的两个工具：Git 负责在本地给代码拍快照，GitHub 负责把快照同步到云端。它们解决的核心问题是**版本可追溯**——每次变更都有上下文，任何一次部署都能对应到某次明确的提交。

对运维人员而言，理解 Git 的最小工作流就够了；真正的工程化发布，还需要流水线、容器化等后续工具。下一篇进入 [第 05 篇 · 容器 Docker](./docker-basics.md)：当运行环境本身也需要被版本化、可迁移时，容器化登场。

## 思考

1. `git commit -m "update"` 这样的说明有什么问题？好的提交说明至少应包含什么信息？
2. 如果有人直接在服务器上改了已跟踪文件（没走 Git），再执行 `git pull` 可能发生什么？
3. GitHub 仓库若误含密码或 API Key，只删文件再推一次够不够？正确做法是什么？
4. 为什么「版本管理」比「手动备份目录」更适合作为部署的前置能力？

## 参考

1. [Git 官方文档](https://git-scm.com/doc)
2. [GitHub 官方文档](https://docs.github.com)
3. [Conventional Commits](https://www.conventionalcommits.org/)
4. [GitHub Hello World](https://docs.github.com/en/get-started/start-your-journey/hello-world)
