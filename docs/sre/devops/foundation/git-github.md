---
title: 03 ｜ Git 与 GitHub：版本管理与云端仓库
description: 理解版本管理的核心价值，通过 Git 给代码拍快照，借助 GitHub 实现云端备份与 git pull 部署，替代 scp 的手动上传方式。
date: 2026-07-10
updated: 2026-07-10
category: SRE 运维
tags:
  - DevOps
  - Git
  - GitHub
---

上一篇文章，我们用 scp 把本地文件上传到服务器，完成了第一次手动部署。但 scp 有一个致命问题：**覆盖了就没了**。

这篇文章要解决的问题是：**如何让每一次代码变更都有记录、可追溯、可回退？**

## 为什么需要版本管理

用 scp 部署的流程是这样的：

```text
改代码 → 构建 → scp 覆盖服务器文件 → 发现有问题 → 然后呢？
```

「然后呢」就是版本管理要解决的问题。没有版本管理，你不知道：

- 这次部署比上次改了什么
- 上一个能正常工作的版本是什么
- 怎么回退到上一个版本

版本管理的本质很简单：**给代码拍快照**。每次你觉得「这个状态可以了」，就拍一张快照（commit）。以后任何时候，都能回看这些快照，知道每次改了什么，也能回到任意一张快照。

一个实际的例子：你改了 3 行 CSS，上线后发现布局乱了。有版本管理，一条命令回退；没有版本管理，你还得手动回忆改了哪 3 行。

## Git 基础

Git 是目前最主流的版本管理工具。三个命令就能工作：

### 初始化仓库

```bash
git init
```

在项目目录下执行，告诉 Git「这个目录要开始管理版本了」。

### 暂存变更

```bash
git add .
```

把当前目录下所有变更加入暂存区。`add` 的意思是「这些改动我确认要记录」。

### 提交快照

```bash
git commit -m "feat: 完成首页布局"
```

拍一张快照。`-m` 后面是提交说明，描述这次改了什么。

这三个命令构成了 Git 的最小工作流：

```text
改代码 → git add → git commit → 继续改 → git add → git commit → ...
```

每次 commit 就是一个快照点，串起来就是项目的完整历史。

### 查看历史

```bash
git log --oneline
```

输出类似：

```text
a3f2b1c feat: 完成首页布局
e7d4a9f fix: 修复导航栏样式
b2c1d3e init: 初始化项目
```

每行是一个快照，最前面是 commit ID（哈希值），后面是提交说明。从下往上读，就是项目从创建到现在的演变过程。

### 查看变更

```bash
git diff
```

查看当前代码和上一次 commit 之间的差异。提交前先 `diff` 一下，确认改了什么，是好习惯。

> Git 的能力远不止这些（分支、合并、变基等），但对个人开发者来说，`add → commit → log` 就是日常的 80%。分支和合并主要用于多人协作，后续需要时再学。

## GitHub：云端代码仓库

Git 仓库默认存在本地硬盘上。本地硬盘坏了，代码就没了。

GitHub 是一个代码托管平台，你可以把本地 Git 仓库推送到 GitHub，相当于做了一次**云端备份**。

注册 GitHub 账号后，创建一个仓库（Repository），然后把本地仓库关联上去：

```bash
# 关联远程仓库
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送到 GitHub
git push -u origin main
```

推送完成后，你的代码就在 GitHub 上了。打开 `https://github.com/你的用户名/你的仓库名`，能看到所有文件和提交历史。

### push、pull、clone

三个核心命令，负责本地和云端的同步：

| 命令 | 方向 | 作用 |
| --- | --- | --- |
| `git push` | 本地 → GitHub | 把本地的新 commit 推送到云端 |
| `git pull` | GitHub → 本地 | 把云端的新 commit 拉到本地 |
| `git clone` | GitHub → 任意机器 | 把整个仓库复制到本地（首次） |

对于个人开发者，最直接的体验是：

- **换电脑**：`git clone` 一下，代码全回来了
- **本地硬盘坏了**：GitHub 上还有，`git clone` 重建
- **改坏了想回退**：`git log` 看历史，`git checkout` 回到任意版本

这就是「云端代码仓库」的价值——代码不只存在一台机器上。

## 用 Git 替代 scp 部署

上一篇的部署流程是：

```text
本地 build → scp dist/* 到服务器 → 完成
```

现在改用 Git：

**第一次部署**，在服务器上克隆仓库：

```bash
ssh root@你的公网IP
cd /var/www
git clone https://github.com/你的用户名/你的仓库名.git my-site
```

**以后每次更新**，在服务器上拉取最新代码：

```bash
cd /var/www/my-site
git pull
```

如果项目需要构建（比如 VitePress），再加一步：

```bash
git pull
pnpm run docs:build
sudo cp -r docs/.vitepress/dist/* /var/www/html/
```

对比 scp，git pull 部署的好处：

| | scp | git pull |
| --- | --- | --- |
| 历史记录 | 没有 | 每次 commit 都有记录 |
| 回退 | 不可能 | `git checkout` 回到任意版本 |
| 部署记录 | 知道传了什么文件 | 知道每次部署改了什么代码 |
| 多人协作 | 谁覆盖谁 | 自动合并，冲突有提示 |

对于运维来说，**部署记录天然可追溯**是最大的收益。出了问题，`git log` 一看就知道最近部署了什么，能快速定位是哪次变更引入的。

## 协同开发

当多人同时修改同一个项目时，Git 的价值会进一步放大。

最典型的场景：两个人都改了同一个文件的同一行代码，`git pull` 时会产生冲突（Conflict）。Git 会标记出冲突的位置，由开发者手动决定保留哪个版本。

协同开发涉及分支策略、代码审查、Pull Request 等话题，这些超出了本系列的基础篇范围。对个人开发者来说，先把 `add → commit → push → pull` 用熟，等团队协作时再深入学习。

## 小结

版本管理的核心是「给代码拍快照」，Git 是工具，GitHub 是云端备份。

用 `git pull` 替代 `scp` 部署，最大的收益是**每一次变更都有记录**。对运维来说，出了问题能快速定位是哪次部署引入的，比回忆「我上次 scp 传了什么」靠谱得多。

下一步，我们引入流水线的概念，让 `build → 部署` 这个过程自动化。

## 思考

1. `git commit -m "update"` 这样的提交说明有什么问题？好的提交说明应该包含什么？
2. 如果服务器上的代码被人误改了（没走 git），`git pull` 会发生什么？
3. GitHub 的仓库默认是公开的，如果你的代码包含密码或密钥，怎么办？

## 参考

1. [Git 官方文档](https://git-scm.com/doc)
2. [GitHub 官方文档](https://docs.github.com)
3. [Git 提交规范 Conventional Commits](https://www.conventionalcommits.org/)
4. [GitHub Hello World](https://docs.github.com/en/get-started/start-your-journey/hello-world)
