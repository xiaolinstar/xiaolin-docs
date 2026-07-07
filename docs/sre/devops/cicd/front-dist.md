---
title: Web 前端开发，基于 VitePress 快速搭建个人网站
description: Vite、VitePress 和 Vue3 均为 Vue 生态系统的重要组成部分，它们在前端开发中扮演不同角色并紧密协作。
date: 2025-08-27
updated: 2025-08-27
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---


> 本文介绍 Web 前端开发，基于 VitePress 搭建个人网站。

## 介绍

Vite、VitePress 和 Vue3 均为 Vue 生态系统的重要组成部分，它们在前端开发中扮演不同角色并紧密协作。

本文基于 VitePress 快速搭建静态网站，作为 Web 前端项目，是研究 CI/CD 的基础和起点。

简单来说，Vue3 是基础框架，Vite 是构建工具，VitePress 是基于前两者的静态站点解决方案，三者共同为 Vue 开发者提供了从应用开发到文档构建的完整工具链。

### Vite

Vite 是由 Vue.js 作者尤雨溪开发的前端构建工具，它利用浏览器原生 ES 模块支持，实现了极速的开发服务器启动和热模块更新(HMR)。与传统的 Webpack 等构建工具不同，Vite在开发阶段无需打包，直接提供源码，大幅提升开发效率。它支持多种前端框架，不仅限于 Vue。

### Vue3

Vue3 是 Vue.js 框架的第三个主要版本，带来了显著的性能改进和新特性，包括 Composition API、更好的TypeScript 支持、更高效的响应式系统等。

它是一个渐进式 JavaScript 框架，专注于构建用户界面，既可以用于简单的交互组件，也可以构建复杂的单页应用。

### VitePress

VitePress 是基于 Vite 和 Vue3 构建的静态站点生成器(SSG)，主要用于创建高性能的文档网站。它可以看作是 VuePress 的继任者，但使用 Vite 代替 Webpack 作为构建工具，提供了更快的构建速度和开发体验。

VitePress 将 Markdown 文件转换为静态 HTML 页面，并允许在 Markdown 中直接使用 Vue 组件，兼具内容编写的简洁性和交互性。

## 安装

> 参考地址：https://vitepress.dev/zh/guide/getting-started

安装步骤概述：

1. 前置准备：宿主机安装 Node.js npm 等开发环境
2. 安装向导：基于 VitePress 脚手架初始化项目
3. 热启动与构建：快速演示网页效果

### 前置准备

- Node.js 18及以上版本
- 命令行终端（Windows Powershell、MacOS终端）
- （可选的）开发集成环境（IDE）: VSCode、WebStorm

在项目文件夹中（推荐 VscodeProjects 或 WebstormProjects ）创建空项目文件夹`vitepress-docs`

```shell
mkdir vitepress-docs && cd vitepress-docs
```

默认使用 npm 安装 VitePress，也支持 pnpm yarn bun 工具。

```shell
# 安装 vitepress
npm add -D vitepress@next
```

### 安装向导

VitePress附带一个命令行设置向导，可以帮助你构建一个基本项目。安装后，通过运行以下命令启动向导

```shell
npx vitepress init
```

回答几个简单问题，初始化项目

```shell
┌  Welcome to VitePress!
│
◇  Where should VitePress initialize the config?
│  ./docs
│
◇  Where should VitePress look for your markdown files?
│  ./docs
│
◇  Site title:
│  My Awesome Project
│
◇  Site description:
│  A VitePress Site
│
◇  Theme:
│  Default Theme
│
◇  Use TypeScript for config and theme files?
│  Yes
│
◇  Add VitePress npm scripts to package.json?
│  Yes
│
◇  Add a prefix for VitePress npm scripts?
│  Yes
│
◇  Prefix for VitePress npm scripts:
│  docs
│
└  Done! Now run npm run docs:dev and start writing.
```

安装后项，目录结构下图所示（主要的源文件）：

```shell
.
├─ docs
│  ├─ .vitepress
│  │  └─ config.mts
│  ├─ api-examples.md
│  ├─ markdown-examples.md
│  └─ index.md
└─ package.json
```

### 运行启动

查看 `package.json` 下启动脚本

```json
{
  "devDependencies": {
    "vitepress": "^1.3.4"
  },
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

项目目录下启动终端，执行

```shell
# vitepress docs:dev
npm run docs:dev
```

根据提示，在浏览器中打开：[http://localhost:5173/](http://localhost:5173/)

项目停止

```shell
# MacOS
Command+C
# Windows
Ctrl+C
```

容器打包，将在 `docs/.vitepress` 下生成 dist 包，该包用于在生产环境部署。

```shell
# vitepress docs:build
npm run docs:build
```

## 总结

本文使用 VitePress 快速搭建静态资源网站，使用开发环境热启动，构建静态资源包。

后期此项目作为 Web 前端项目示例，研究 DevOps、CI/CD 相关技术的基础。

## 参考

1. VitePress，由 Vite 和 Vue 驱动的静态站点生成器，https://vitepress.dev/zh/
