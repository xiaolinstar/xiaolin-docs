# 你好，Jenkins

> Jenkins是流行的开源的CI/CD服务器，以插件的方式实现扩展。Jenkins持续集成、持续部署能力，将开发者从繁琐的部署过程中解放出来。本文介绍了基于Docker运行Jenkins容器实现CI/CD最佳实践。
>
> 本文不对软件开发、发布流程与规范作详细探索，主要目标在于使用Jenkins实现开发者提交代码到GitHub，发布流程自动完成。

## 概述

此文档由介绍Jenkins简介开始，通过部署一个VitePress项目最佳实践，让读者感受并体验Jenkins的强大功能，并可以将Jenkins的CI/CD有效迁移到自己的项目中。
阅读此文档，你将收获：

1. 对Jenkins和CI/CD有一个更具体的认识
2. 学习基于docker构建的Jenkins最佳实践
3. 部署基于VitePress的个人网站

本文适用于具备一定计算机基础和编程能力的软件开发工程师（前端&后端）、运维工程师、软件架构师以及项目管理，阅读本文章之前，需具备以下前置能力：

- Linux基础
- Docker容器
- Git：分布式开源版本管理工具
- GitHub（Gitee或Gitlab）：代码托管平台
- Web开发基础：了解nodejs和npm

## Jenkins简介

介绍Jenkins之前，首先对持续集成和持续部署进行简单介绍。

[持续集成，CI（Continuous Integration）](https://www.redhat.com/zh/topics/devops/what-is-ci-cd)：一种软件开发实践，旨在频繁地将开发人员的代码变更集成到共享的代码库中，并通过自动化的构建、测试和验证过程，确保软件的质量和稳定性。

[持续部署或持续部署，CD（Continuous Delivery | Continuous Deployment）](https://codilime.com/blog/what-is-ci-cd/)：CD由持续交付和持续部署两个阶段组成，持续交付将通过集成阶段的代码进行封装和制品，输出待发布版本和文档到仓库；持续部署从版本仓库中取出发布版本部署到开发、测试、预发布或生产环境。

从软件代码开发到部署，需要经历单元测试、集成测试、代码合并、质量审查、构建、部署等过程，该过程繁琐且需要频繁执行。CI/CD旨在将该过程流程化、自动化，有效缩短软件迭代周期，Jenkins是一款实现CI/CD的开源软件。

Jenkins由Java开发，支持多种构建风格，包括自由风格、流水线、多分支流水线，依靠强大且功能齐全的插件，整个各领域工具，使用可视化Web界面快速搭建CI/CD流水线，实现一次配置、重复执行。本文中的对软件发布的详细规范未做探讨，简单搭建一个「草台班子」

## 快速启动Jenkins实例

docker的可移植性和资源隔离给开发工作带来了极大的便利。在个人电脑上进行开发实践，可以接近0成本移植到生产环境，无需繁琐的依赖安装。资源隔离保证我们宿主机环境的「干净整洁」，随用随删。

### 前置要求

为了进一步提高项目可移植性，本项目使用`docker-compose`构建容器配置。环境依赖：

- 操作系统：amd64 & Ubuntu22.04
- Docker：25.04
- Jenkins容器：jenkins/jenkins:lts-jdk17（长期支持版本）

### 快速启动

> 实践项目已发布在[GitHub](https://github.com/xiaolinstar/docker-jenkins)和[Gitee](https://gitee.com/xingxiaolin/docker-jerkins)仓库中。

* [ ]  待完成

## VitePress初体验

VitePress简介。

本地快速体验VitePress项目。

### 前置要求

在本地开发环境安装`nodejs`和`npm`，参考VitePress官网创建项目。

- 操作系统：amd64 & Ubuntu22.04
- Docker：25.04
- node：22.6.0（推荐lts版本20 22）

### 创建本地项目

使用npm或pnpm创建VitePress项目

### 容器化

创建Dockerfile将项目打包为镜像，方便容器化部署。

## 基于Jenkins的CI/CD最佳实践

详细过程

## 参考

1. 持续集成，https://www.redhat.com/zh/topics/devops/what-is-ci-cd
2. 持续交付和持续部署，https://codilime.com/blog/what-is-ci-cd/
3.
