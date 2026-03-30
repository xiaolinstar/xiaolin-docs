# Git Submodule：专治项目合并 “大乱炖”

我在微信公众号上已经实现了桌游“谁是卧底”发牌器，独立于此项目，又开发了桌游“阿瓦隆”。现在我想将这两个桌游发牌器同时在微信公众号中支持，该如何进行项目管理？

另一个场景，独立开发前后端项目 backend 和 frontend，想要将它们整合在一起实现**一键部署**，该如何做？

在大型项目中，是选择管理多个子模块，还是在多个子项目基础上抽象出父项目？从架构设计角度考虑，遵循**高内聚低耦合**的原则，后者显然是更好的选择，能够保证各项目独立开发、互不干扰，而父项目则负责协调各子项目的整合。

我引入了 `git submodule` 来管理子项目，完美实现“物理隔离，逻辑统一”。这是一个一般用户接触不到的 git 模块，但对于系统架构设计师而言，了解它的存在并在具体项目规划中应用，将发挥重要作用。

## 虚拟案例：美团“本地生活”的进化之路

为了说明这个问题，我们模拟一个“美团版”的场景。

早期的美团，团购 (tuangou) 和 外卖 (waimai) 是两套人马，独立开发和运营。随着业务版图扩张，公司成立了 local-life (本地生活) 团队，目标是打造一个统一门户，汇聚成为顶流App，占据应用商店排行榜。

核心诉求：

- 统一入口：用户登录一个 App，就能切换团购和外卖。
- 统一鉴权：别让用户在外卖里登录一次，进团购还得再登一次。
- 独立性：外卖团队今天想发版，不能因为团购团队的代码没写完就被卡住。

破局方案：成立新的父项目 local-life。它不生产业务代码，它只是业务的“搬运工”。通过 git submodule 将 tuangou 和 waimai 引入，变成自己的子文件夹。

## Git Submodule 实战指令

> 更多命令字典，推荐菜鸟教程：https://www.runoob.com/git/git-submodule.html

先快速查看`git submodule`的指令手册`git submodule --help`

```
git submodule [--quiet] [--cached]
git submodule [--quiet] add [<options>] [--] <repository> [<path>]
git submodule [--quiet] status [--cached] [--recursive] [--] [<path>...]
git submodule [--quiet] init [--] [<path>...]
git submodule [--quiet] deinit [-f|--force] (--all|[--] <path>...)
git submodule [--quiet] update [<options>] [--] [<path>...]
git submodule [--quiet] set-branch [<options>] [--] <path>
git submodule [--quiet] set-url [--] <path> <newurl>
git submodule [--quiet] summary [<options>] [--] [<path>...]
git submodule [--quiet] foreach [--recursive] <command>
git submodule [--quiet] sync [--recursive] [--] [<path>...]
git submodule [--quiet] absorbgitdirs [--] [<path>...]
```

与复杂的`git`指令一样，起步阶段只需要关注这几条“瑞士军刀”命令：

**添加子模块**

`git submodule add https://github.com/meituan/tuangou.git`

这会在根目录生成一个 .gitmodules 文件，这个文件相当于父项目的“户口本”，记录了子模块是谁、在哪。

**一键拉取**

克隆整个父项目，子模块默认是空的，可以使用`--recursive`递归拉取子项目

```bash
git clone --recursive https://github.com/meituan/meituan.git`
```

如果在克隆父项目时，没有指定`--recursive`，可以使用指令

```
git submodule update --init --recursive
```

**同步更新**

当子项目团队更新了代码，父项目想引用最新的版本：

`git submodule update --remote`

当然，父项目中也可以提交对子代码的更新，在 JetBrains 或 VSCode 等 IDE 中的 git 插件模块，默认允许管理所有的 git 仓库。

*在父项目中直接修改子模块代码，是不被推荐的，这不利于父子项目治理。*

## 团队治理

项目多了，管理不能乱。在父子项目架构下，职责划分要像切菜一样清晰：

### 父项目团队（物业公司）

不关心外卖里卖的是炸鸡还是汉堡，他们负责：

- 稳定性与运营，确保 App 平稳运行。
- 公共资源：统一的鉴权逻辑、统一的 UI 组件库。
- 流程约束：制定子项目入驻的规范（比如接口文档怎么写）。

### 子项目团队（业主/商户）

业务专家，负责：

- 快速迭代：今天加个优惠券，明天改个排版，只要在子仓库折腾就行，不影响别人。
- 质量负责：自己负责的业务模块，出了 Bug 自己修。

### 治理手段

版本锚定：父项目始终记录子项目的一个“特定版本（Commit ID）”，只有经过测试的子项目版本，才会被父项目“转正”更新。

## 总结

Submodule 最大的优势在于解耦，它允许各团队保留独立的 Git 权限和不同的开发节奏。如果你也面临多团队协作、统一平台构建的难题，不妨试试 Git Submodule。它是目前运维架构中，性价比极高的“降熵”工具。

## 参考

1. 菜鸟教程 git submodule，https://www.runoob.com/git/git-submodule.html
