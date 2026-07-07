---
title: 从零实现 CI/CD：容器化
description: 容器化部署（如 Docker、Kubernetes）已成为现代软件交付的“默认选项”，其必要性并非单纯技术升级，而是对业务效率、成本、稳定性的系统性重构。
date: 2026-03-06
updated: 2026-03-06
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---


容器化部署（如 Docker、Kubernetes）已成为现代软件交付的“默认选项”，其必要性并非单纯技术升级，而是对**业务效率、成本、稳定性**的系统性重构。

对于初级开发者和中小软件企业，有效解决了 IT 服务的可移植性问题，这也是现代化 DevOps 的基础。


## 阶段四：容器化部署

将项目构建成容器镜像，推送到 DockerHub、ghcr、阿里云 ACR 等镜像仓库；接着，在生产服务器上拉取镜像并运行容器实例。

在生产环境云服务上，除了安装 Docker 服务外不需要安装任何环境。

---

将源代码构建 build 为容器镜像必要包含2个步骤：

- **构建**：将源代码构建为分发包 *dist*
- **容器化**：基于 `Dockerfile` 自定义容器镜像

有 2 种实现方案：

| 方案           | 概述                                        | 构建产物        | 典型场景                 |
| ------------ | ----------------------------------------- | ----------- | -------------------- |
| **多阶段构建**    | 一个 `Dockerfile` 里完成「编译 → 打包 → 精简镜像」     | 最终只保留运行时镜像  | 中小团队、CI 简单、需快速迭代    |
| **构建与容器化分离** | 本地/CI 先产出静态资源包/二进制包，`Dockerfile` 只做最后一层拷贝 | 镜像里只有运行时二进制 | 大型团队、合规审计、多语言栈、镜像仓安全 |


## 多阶段构建 multistage builds

> 容器镜像配置文件为 `Dockerfile`；
> 打包指令为 `docker build` 或 `docker buildx build`

基于源代码，构建静态资源包 *dist*，然后基于 *dist* 制作 Nginx 容器镜像，2个动作在同一个 `Dockerfile` 中实现。

1. 在个人电脑上使用 IDE 如 VsCode、WebStorm 开发、调试
2. 本地开发环境，查看开发效果 `npm run dev`
3. 制作 `Dockerfile`
    1. 向容器中复制项目源代码，使用 `nodejs` 容器构建分发包 *dist*
    2. 将 *dist* 复制到 Nginx 容器中
4. 基于 `Dockerfile`，执行 `docker build` 生成容器镜像
5. 将生成的镜像推送到 DockerHub 等镜像仓库
6. 在云服务器上（具备公网 IP）拉取镜像并运行容器实例，如 `docker run -d -p 80:80 nginx`

考虑到 DockerHub、ghcr 需要**科学上网**才能访问，也可以在生产环境中完成容器化动作，这需要在服务上安装开发环境工具 Node.js、Maven 等。

1. 在个人电脑上使用 IDE 如 VsCode、WebStorm 开发、调试
2. 本地开发环境，查看开发效果 `npm run dev`
3. 制作 `Dockerfile`
    1. 向容器中复制源码，使用 `nodejs` 容器构建分发包 *dist*
    2. 将 *dist* 复制到 Nginx 容器中
4. 在 git 仓库中提交变更，并推送到 GitHub
5. 登录云服务器，`git clone` 克隆仓库或 `git pull` 获取最新提交
6. 基于 `Dockerfile`，执行 `docker build` 生成容器镜像
7. 运行容器实例，如 `docker run -d -p 80:80 nginx`


`Dockerfile` 示例：

```Dockerfile
# 阶段一：使用 node 构建

FROM node:22-alpine3.20 AS build-stage

# 复制项目源文件到工作目录
COPY . .

# 构建 Vue 项目
RUN npm run build

# 阶段二：Nginx 静态资源代理

FROM nginx:alpine

COPY volumes/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build-stage /dist /usr/share/nginx/html

# 启动Nginx服务
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```


## 构建与容器化分离

对于相对简单轻量的前端项目，使用多阶段构建是一个最普遍的做法。但对于合规性要求更高的大型团队，构建与容器化分离越来越普遍。

让 CPU/缓存密集、工具链笨重的构建跑在高配内网节点，只产出不可变制品；让网络/安全敏感、工具极简的容器化跑在轻量或 Serverless 环境，只负责把制品打成镜像并推送。

这样既避免重复编译、泄露密钥，又能按需横向扩展、满足多云合规与最小权限要求。

构建在本地环境运行，在容器化过程中仅面向目标文件 *dist*

1. 在个人电脑上使用 IDE 如 VsCode、WebStorm 开发、调试
2. 本地开发环境，查看开发效果 `npm run dev`
3. 项目构建 `npm run build`，生成分发包 *dist*
4. 制作 `Dockerfile`，将 *dist* 复制到 Nginx 容器中
5. 基于 `Dockerfile`，执行 `docker build` 生成容器镜像
6. 将生成的镜像推送到 DockerHub 等镜像仓库
7. 在云服务器上（具备公网 IP）拉取镜像并运行容器实例，如 `docker run -d -p 80:80 nginx`

同样地，不使用镜像仓库：

1. 在个人电脑上使用 IDE 如 VsCode、WebStorm 开发、调试
2. 本地开发环境，查看开发效果 `npm run dev`
3. 制作 `Dockerfile`，将 *dist* 复制到 Nginx 容器中
4. 在 git 仓库中提交变更，并推送到 GitHub
5. 登录云服务器，`git clone` 克隆仓库或 `git pull` 获取最新提交
6. 依次执行 `npm install`、`npm run build`，生成分发包 *dist*
7. 基于 `Dockerfile`，执行 `docker build` 生成容器镜像
8. 运行容器实例，如 `docker run -d -p 80:80 nginx`

`Dockerfile` 示例：

```Dockerfile
FROM nginx:alpine
COPY /dist /usr/share/nginx/html
COPY volumes/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

此方法需要保证构建环境与生产环境的 CPU 架构一致（arm64、amd64），以避免构建的产物在容器化环境中无法正常使用。

## 总结

本文介绍容器化部署 Vue 前端项目的2种 `Dockerfile` 实践方案：多阶段构建、构建与容器化分离。

引入了2个 CI/CD 相关概念：
- 构建：将源代码自动编译、打包、生成可部署制品，如 exe、jar、dist 等
- 容器化：将构建产物与其运行环境（依赖、配置、运行时）封装为一个轻量级、可移植的容器镜像