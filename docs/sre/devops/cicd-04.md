---
title: 从零实现 CI/CD：Pipeline 流水线工具
description: 在阶段五中，引入 Docker Compose，实现了容器编排，支持容器集群一键启动、一键停止。
date: 2026-03-06
updated: 2026-03-06
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

# 从零实现 CI/CD：Pipeline 流水线工具

## 前言

在阶段五中，引入 Docker Compose，实现了容器编排，支持容器集群一键启动、一键停止。

现在终于开始引入 Jenkins、GitHub Actions、Gitee Go 等流水线工具。

流水线工具，好比计算机组成架构中的服务总线，把开发、测试、部署等环境串联起来，把源代码仓库、构建工具、测试工具、部署工具等串联起来。

流水线是实现 CI/CD 与 DevOps 的基础，是实现自动化的关键技术。

## 流水线

持续集成（Continuous Integration）、持续交付（Continuous Delivery）目前已成为很多技术团队提升研发效能的必经之路。

通过建设部署流水线，打通从代码开发到功能交付的整个环节，以自动化的方式完成构建、测试、集成、发布等一系列行为，最终实现向用户持续高效地交付价值。

回看阶段一至阶段五的交付过程，以及开发实践经验，可以发现非常显著的特点：

- 阶段性明确：每个阶段的动作是明确的，比如代码提交、构建、测试、集成、部署等阶段。
- 顺序性：有向无环图，每个阶段的动作是有顺序的，比如先构建，再测试，最后部署。
- 重复性：每个阶段的动作都是重复性的，比如每次代码提交后，都需要进行构建、测试、集成、部署等动作。

集成和交付流程符合**流水线工作**方式，因此 IT 领域的流水线工具应运而生。

下面从开源/商业，独立部署/SaaS 服务，云原生等角度，介绍一些主流的流水线工具，或支持流水线的工具集。

## Jenkins

简而言之，Jenkins 是领先的开源自动化服务器。它基于 Java 构建，提供了2000多个插件，几乎可以支持任何自动化任务，这样一来，就能把时间花在机器无法完成的事情上。

使用 Jenkins 自动化开发工作流程，专注于最重要的工作。Jenkins通常用于：

* 构建项目
* 运行测试，及早发现 bug 和其他问题
* 静态代码分析
* 部署

使用 Jenkins 执行重复性任务，节省时间并优化开发流程。

---

开源/商业：开源

服务方式：独立工具，自行部署

云原生支持：无

使用方式：自定义 shell 指令、Jenkinsfile 命令式编排

流行度：🌟🌟🌟🌟🌟

活跃度/文档质量：🌟🌟🌟

优势：社区生态最广、插件最多、可自托管，几乎能对接一切工具与平台

2018年，从 Jenkins 社区独立孵化的 Jenkins X，是官方云原生发行版，完全基于 Tekton Pipelines + GitOps。

## Gitee Go

Gitee Go 是 Gitee 全新推出的一款 CI/CD 工具，提供持续集成、持续交付（部署）能力，帮助企业不断提升应用交付的质量和效率。

通过构建自动化、测试自动化、部署自动化、运维自动化，完成从代码提交到应用交付的自动化。

---

开源/商业：商业，提供免费功能

服务方式：Gitee 仓库配套工具，SaaS

云原生支持：无

使用方式：低代码可视化流程编排、声明式 YAML 配置编排

流行度：🌟

活跃度/文档质量：🌟

优势：无需科学上网，直接在 Gitee 仓库中配置即可，符合 GitOps 规范。

## GitHub Actions

实现从创意到产品的工作流程自动化。

GitHub Actions 让自动化所有软件工作流程变得轻而易举，现在还具备世界级的持续集成/持续交付（CI/CD）功能。直接从 GitHub 构建、测试和部署代码。让代码审查、分支管理和问题分类按照你想要的方式进行。

---

开源/商业：商业，免费使用

服务方式：GitHub 仓库配套工具，SaaS

云原生支持：无

使用方式：声明式 YAML 配置编排、**丰富的官方及第三方流水线模板**

流行度：🌟🌟🌟🌟🌟

活跃度/文档质量：🌟🌟🌟🌟🌟

优势：与 GitHub 原生一体，零运维、模板即开即用，丰富的流水线模板，提供静态站点托管服务 GitHub Pages。

## GitLab 极狐

软件开发全生命周期的 DevOps 能力，功能包括：源代码托管、CI/CD、效能管理、敏捷项目管理、DevSecOps、云原生。

---

开源/商业：商业

服务方式：SaaS、自主托管

云原生支持：良好

使用方式：声明式 YAML 配置编排、丰富的流水线模板

流行度：🌟🌟🌟🌟🌟

社区活跃度/文档质量：🌟🌟🌟🌟🌟

优势：最流行的一站式 DevOps 平台，单一平台即可包揽 DevOps 全生命周期，无需拼接工具链

## Tekton

Tekton 是构建 CI/CD 系统的云原生解决方案。它由提供构建模块的 Tekton Pipelines 以及支持组件（如 Tekton CLI 和 Tekton Catalog）组成，这些组件使 Tekton 成为一个完整的生态系统。Tekton 是 CD 基金会（Linux基金会的一个项目）的一部分。

---

开源/商业：开源

服务方式：自主托管

云原生支持：优秀

使用方式：声明式 YAML 配置编排、基础设施即代码 IaC、原生 Kubernetes 支持

流行度：🌟🌟🌟

社区活跃度/文档质量：🌟🌟🌟🌟

优势：完全遵循云原生流水线即代码理念，用 Kubernetes CRD 声明式定义 CI 任务，像管理 Pod 一样随仓库版本化、可移植、可组合地构建制品。

## Argo CD

Argo CD 是一款用于 Kubernetes 的声明式 GitOps **持续交付**工具。

应用程序的定义、配置和环境应该是声明式的，并进行版本控制。应用程序的部署和生命周期管理应该是自动化的、可审计的且易于理解。

---

开源/商业：开源

服务方式：自主托管

云原生支持：优秀

使用方式：声明式 YAML 配置编排、基础设施即代码 IaC、原生 Kubernetes 支持

流行度：🌟🌟🌟

社区活跃度/文档质量：🌟🌟🌟🌟

优势：完全遵循 GitOps 理念，用声明式 YAML 把交付流水线纳入版本仓库，让每一次代码提交都像管理源代码一样自动、可审计、可回滚地实现持续部署。

## 阿里云效 codeup

阿里云企业级一站式研发协同平台，数十万企业都在用。支持公共云、专有云和混合云多种部署形态，通过云原生新技术和研发新模式，助力创新创业和数字化转型企业快速实现研发敏捷和组织敏捷，打造“双敏”组织，实现多倍效能提升。

---

开源/商业：商业

服务方式：SaaS

云原生支持：良好

使用方式：声明式 YAML 配置编排、丰富的流水线模板

流行度：🌟🌟

社区活跃度/文档质量：🌟🌟🌟🌟

优势：一站式研发协同平台，可平替 GitLab，开通阿里云账户即可免费使用，背后依靠阿里云生态。

## 腾讯云 CNB

云原生构建（Cloud Native Build，CNB）提供代码托管、云原生构建、云原生开发、AI 代码助手和制品库等功能。基于 Docker 生态，对环境、缓存、插件进行抽象，通过声明式的语法，帮助开发者以更酷的方式构建软件。

---

开源/商业：商业

服务方式：SaaS，企业级自主托管

云原生支持：良好

使用方式：声明式 YAML 配置编排、基于 Docker 生态

流行度：🌟

社区活跃度/文档质量：🌟🌟

优势：开箱即用的 SaaS 方案，微信扫码即可注册使用，与 GitHub 生态功能类似但国内网络直连，提供代码托管服务，侧重于 CI。

## 总结

| 平台 / 技术        | 一句话定位                      | 部署形态       | 推荐场景            |
| -------------- |----------------------------| ---------- |-----------------|
| Jenkins        | 插件最多、自托管“瑞士军刀”             | 自托管        | 传统架构、需深度定制      |
| Gitee Go       | Gitee 官方 SaaS CI/CD，国内网络友好 | SaaS       | 国内网络生态          |
| GitHub Actions | GitHub 原生 CI/CD，模板即开即用     | SaaS       | 个人/开源项目首选       |
| 极狐 GitLab      | 一站式 DevOps，可选 SaaS/自管      | SaaS / 自托管 | 中小团队 All-in-One |
| Tekton         | K8s 原生流水线即代码               | 自托管        | K8s 深度用户        |
| Argo CD        | K8s 声明式 GitOps CD 工具       | 自托管        | 云原生 GitOps      |
| 阿里云效           | 阿里云一站式研发协同，注册即用            | SaaS       | 阿里云生态           |
| 腾讯云 CNB        | 腾讯云 DevOps SaaS，微信扫码即开     | SaaS       | 微信、腾讯云生态        |


Jenkins 作为入门产品可以学习，但界面复杂，使用体验较差，即便提供了 Blue Ocean UI 和 Jenkins X 分支。除非考虑兼容性以及团队技术栈基础，否则不推荐使用。

GitLab 和 阿里云效产品功能相似，一站式研发协同平台，推荐小型开发团队推荐使用，个人推荐阿里云效，注册即用。产品生态丰富的另一面是功能复杂，上手困难，侧重于**开发协同**，不推荐个人开发者（一人公司）使用。

GitHub Actions、Gitee Go 和 腾讯 CNB 产品功能相似，主要提供代码托管 + CI 服务，GitHub Actions 功能强大、生态完善但需要科学上网，后两者在产品完善上较差，如果支持科学上网，推荐使用 GitHub 生态。

Tekton、Argo CD 是云原生时代产品，设计之初就与 Kubernetes 产生关联，拥有良好的设计理念如 IaC，云原生支持优秀。然而，Kubernetes 本身技术门槛较高，且大多数中小企业用不到分布式容器编排，往往数个容器足够，有点“杀鸡用牛刀”的意味。推荐技术爱好者和中大型企业技术转型采用。

总的来说，个人开发者关注 GitHub Actions，中小型企业选择阿里云效或 GitLab，极客或中大型企业技术转型探索和尝试 Tekton、Argo CD。

## 延伸阅读

GitOps、基础设施即代码 IaC、Runner机制、云原生 CI 最佳实践、云原生 CD 最佳实践

## 参考

1. Jenkins，[https://www.jenkins.io/](https://www.jenkins.io/)
2. Gitee Go，[https://www.gitee.com/](https://www.gitee.com/)
3. GitHub Actions，[https://docs.github.com/en/actions](https://docs.github.com/en/actions)
4. 极狐 GitLab，[https://www.gitee.com/](https://www.gitee.com/)
5. Tekton，[https://tekton.dev/](https://tekton.dev/)
6. Argo CD，[https://argo-cd.readthedocs.io/en/stable/](https://argo-cd.readthedocs.io/en/stable/)
7. 阿里云效，[https://www.aliyun.com/product/effect](https://www.aliyun.com/product/effect)
8. 腾讯云 CNB，[https://cloud.tencent.com/product/cnb](https://cloud.tencent.com/product/cnb)