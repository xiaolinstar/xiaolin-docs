---
title: 从零实现 CI/CD：起步
description: 为了简单期间，系列文章以开发、构建和部署 VitePress 静态站点为例，后期根据差异性补充 SpringBoot 服务端项目。
date: 2026-03-06
updated: 2026-03-06
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---


为了简单期间，系列文章以开发、构建和部署 VitePress 静态站点为例，后期根据差异性补充 SpringBoot 服务端项目。

## 阶段一：服务能 Run

新手开发起步，能让服务跑起来，是一个重要的里程碑。

1. 在个人电脑上使用 IDE 如 VsCode、WebStorm 开发、调试。
2. 本地开发环境，查看开发效果 `npm run dev`
3. 把项目源代码使用 `scp` 工具远程复制到云服务器上（具备公网 IP）
4. 安装依赖 `npm install`
5. 以后台方式运行 `nohup npm run dev &`

此方法使用 `nodejs` 作为服务器，支持热启动，一般用于开发环境，直接作为生产环境的 Web 服务器效率较低。

## 阶段二：Nginx 静态资源代理

Web 静态资源项目使用 Nginx 部署是最佳实践。

1. 在个人电脑上使用 IDE 如 VsCode、WebStorm 开发、调试。
2. 本地开发环境，查看开发效果 `npm run dev`
3. 项目构建 `npm run build`，生成分发包 *dist*
4. 把 *dist* 包使用 `scp` 工具 复制到云服务器上（具备公网 IP）
5. 使用 Nginx 对 *dist* 包做静态资源代理，并启动 Nginx 服务

## 阶段三：版本管理与代码托管

为了方便代码版本管理、多人协作、代码共享等，引入了 git 工具和托管平台 GitHub 或 Gitee。

1. 在个人电脑上使用 IDE 如 VsCode、WebStorm 开发、调试。
2. 本地开发环境，查看开发效果 `npm run dev`
3. 在 git 仓库中提交变更，并推送到 GitHub
4. 登录云服务器，使用 `git clone` 克隆仓库、使用 `git pull` 获取最新提交。
5. 安装依赖 `npm install`
6. 项目构建 `npm run build`，生成分发包 *dist*
7. 使用 Nginx 对 *dist* 包做静态资源代理，并启动 Nginx 服务

## 总结

作为一名起步的开发者，阶段三实现了**最小可行**、且完全手动的交付闭环，绝大多数中小团队止步于此。

下一篇文章，引入 Docker（Podman） 实现服务容器化，**一次构建，到处运行**，有效解决服务可移植性问题。

## 参考

1. Docker 官方文档，[https://docs.docker.com/](https://docs.docker.com/)
2. Podman 官方文档，[https://podman.io/docs/](https://podman.io/docs/)
3. Nginx 静态资源服务器，[https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)
4. 静态资源服务器，[https://tsejx.github.io/devops-guidebook/server/nginx/static-resource-server/](https://tsejx.github.io/devops-guidebook/server/nginx/static-resource-server/)
5. git 版本控制，[https://git-scm.com/](https://git-scm.com/)
6. GitHub 代码托管，[https://github.com/](https://github.com/)
7. Gitee 国产化 git 代码托管仓库，免科学上网，[https://gitee.com/](https://gitee.com/)