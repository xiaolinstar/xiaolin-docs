---
title: 01 ｜ Nginx 静态资源代理
description: 从本地 index.html 开始理解 Nginx 静态资源代理，再用 VitePress 完成文档站点的安装、调试、构建与本地发布闭环。
date: 2026-03-06
updated: 2026-07-08
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

编程入门的 Hello World，是在控制台打印一行文字。

运维入门的 Hello World，可以从用 Nginx 代理一个静态网页开始。

本文的核心问题是：

> 如何用 Nginx 把本地静态文件发布成一个可访问的网站？

这篇文章只关注静态资源代理：HTML、CSS、JS、图片等文件已经存在于本地目录中，Nginx 负责把它们返回给浏览器。

## Nginx 是什么

Nginx 是一个常用 Web 服务器。

在静态网站场景中，可以先把它理解成 3 件事：

- 接收浏览器发来的 HTTP 请求。
- 到配置指定的目录中查找文件。
- 把找到的 HTML、CSS、JS、图片等静态资源返回给浏览器。

例如浏览器访问：

```text
http://localhost:8080
```

Nginx 可以返回本地目录中的：

```text
index.html
```

Nginx 还可以做反向代理、负载均衡、HTTPS、限流等事情，但这些不是本文重点。当前只需要掌握：**Nginx 可以把某个文件或某个文件夹代理成一个网站。**

## 配置文件在哪里

Nginx 最关键的是配置文件。

常见结构如下：

```text
nginx/
  nginx.conf
  conf.d/
    default.conf
```

其中：

- `nginx.conf`：主配置文件，负责加载基础配置和子配置。
- `conf.d/default.conf`：站点配置文件，通常在这里写监听端口、网站目录、首页文件等配置。

很多 Linux 发行版安装 Nginx 后，也会采用类似结构：

```text
/etc/nginx/nginx.conf
/etc/nginx/conf.d/default.conf
```

本地练习时，不必直接修改系统目录，可以在项目里准备一套独立的 Nginx 配置，便于理解和删除。

## 代理一个 index.html

先准备目录：

```text
nginx-demo/
  nginx.conf
  conf.d/
    default.conf
  html/
    index.html
  logs/
```

`html/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Nginx 静态资源代理</title>
</head>
<body>
    <h1>你好，Nginx</h1>
    <p>这是一个由 Nginx 代理的静态网页。</p>
</body>
</html>
```

`nginx.conf` 只保留最小结构：

```nginx
worker_processes 1;

error_log logs/error.log;
pid logs/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include conf.d/*.conf;
}
```

`conf.d/default.conf` 写站点配置：

```nginx
server {
    listen 8080;
    server_name localhost;

    root html;
    index index.html;
}
```

启动 Nginx：

```bash
nginx -p "$PWD/nginx-demo" -c nginx.conf
```

浏览器访问：

```text
http://localhost:8080
```

看到「你好，Nginx」，说明本地 `index.html` 已经被 Nginx 代理成功。

停止 Nginx：

```bash
nginx -p "$PWD/nginx-demo" -c nginx.conf -s stop
```

## 代理一个文件夹

真实静态网站通常不是只有一个 `index.html`，还会有样式、脚本、图片。

例如：

```text
html/
  index.html
  style.css
  main.js
  logo.png
```

只要 `default.conf` 中的 `root` 指向 `html` 目录，Nginx 就会从这个目录里读取文件：

```nginx
server {
    listen 8080;
    server_name localhost;

    root html;
    index index.html;
}
```

访问关系可以简单理解为：

| 浏览器访问 | Nginx 返回 |
| --- | --- |
| `http://localhost:8080/` | `html/index.html` |
| `http://localhost:8080/style.css` | `html/style.css` |
| `http://localhost:8080/main.js` | `html/main.js` |
| `http://localhost:8080/logo.png` | `html/logo.png` |

这就是 Nginx 代理静态资源最核心的工作方式。

## 引入 VitePress

手写 `index.html` 适合理解原理，但真实文档站点通常不会手写每一个页面。

VitePress 是一个静态站点生成器。它的工作方式是：

```text
Markdown 文档 + 站点配置
  ↓
VitePress 构建
  ↓
dist 静态资源目录
  ↓
Nginx 代理访问
```

也就是说，VitePress 负责把文档项目构建成静态文件，Nginx 负责把这些静态文件返回给浏览器。

## 安装 VitePress

创建项目目录：

```bash
mkdir vitepress-demo
cd vitepress-demo
pnpm init
pnpm add -D vitepress
```

创建文档首页：

```text
docs/
  index.md
```

`docs/index.md`：

```markdown
# 我的文档站点

这是一个使用 VitePress 构建的静态文档站点。
```

在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

## 本地调试

开发时启动 VitePress 本地服务：

```bash
pnpm docs:dev
```

浏览器访问终端提示的本地地址，通常是：

```text
http://localhost:5173
```

此时适合写文章、改导航、调样式。修改 Markdown 后，页面会自动刷新。

但 `docs:dev` 是开发服务，不是最终发布形态。真正交给 Nginx 代理之前，需要先构建。

## 构建 dist

执行构建：

```bash
pnpm docs:build
```

构建成功后，会生成：

```text
docs/.vitepress/dist/
```

这个目录就是 VitePress 的静态站点产物，里面包含：

- `index.html`
- CSS 文件
- JS 文件
- 图片和字体等静态资源

从 Nginx 的视角看，`dist` 和前面的 `html` 目录一样，都是一个可以代理的静态资源目录。

## 用 Nginx 代理 VitePress

将 `nginx-demo/conf.d/default.conf` 改成代理 VitePress 的 `dist` 目录：

```nginx
server {
    listen 8080;
    server_name localhost;

    root ../vitepress-demo/docs/.vitepress/dist;
    index index.html;
}
```

重新加载 Nginx：

```bash
nginx -p "$PWD/nginx-demo" -c nginx.conf -s reload
```

浏览器访问：

```text
http://localhost:8080
```

此时看到的页面，就不是手写的 `index.html`，而是 VitePress 构建后的文档站点。

到这里，一个本地闭环已经完成：

```text
编写 Markdown
  ↓
pnpm docs:dev 本地调试
  ↓
pnpm docs:build 构建 dist
  ↓
Nginx 代理 dist
  ↓
浏览器访问 http://localhost:8080
```

## 发布检查

每次重新发布前，至少检查 4 件事：

- `pnpm docs:build` 是否成功。
- `docs/.vitepress/dist/index.html` 是否存在。
- `default.conf` 中的 `root` 是否指向 `dist` 目录。
- `http://localhost:8080` 是否能打开最新页面。

如果只修改了 Markdown，但没有重新执行 `pnpm docs:build`，Nginx 仍然会代理旧的 `dist`，浏览器看不到最新内容。

## 小结

Nginx 静态资源代理的核心很简单：

> 指定一个目录，让浏览器可以通过 HTTP 访问这个目录中的静态文件。

单个 `index.html` 用来理解 Nginx 的最小工作方式；VitePress 用来生成真实文档站点；`dist` 目录则是交给 Nginx 代理的最终静态资源。

## 思考题

1. `nginx.conf` 和 `conf.d/default.conf` 分别适合放什么配置？
2. 为什么 `pnpm docs:dev` 能本地预览，但发布时仍然需要 `pnpm docs:build`？
3. 如果浏览器打开的页面不是最新内容，应该优先检查哪几个环节？

## 参考

1. Nginx 静态资源服务器，[https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)
2. VitePress 部署指南，[https://vitepress.dev/guide/deploy](https://vitepress.dev/guide/deploy)
