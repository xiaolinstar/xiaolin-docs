---
title: 17 ｜ 配置与密钥分离（ConfigMap / Secret）
description: 10 篇讲了进程级环境变量。但 K8s 上配置怎么管理？数据库密码怎么安全下发？本文给出 ConfigMap 与 Secret 的最小实践，作为 10 篇的 K8s 原生延伸。
date: 2026-09-08
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - K8s
  - 配置管理
  - Secret
---

## 前言

承接 [10 ｜ 环境变量配置管理](environment.md) 的方法论——配置应该从代码中分离——再到 [16 篇](16-k8s-app-deploy.md) 的 K8s 应用部署，配置的具体落地形式被推到 K8s 层面：

*   不同 namespace / 不同环境（dev / staging / prod）的配置怎么区分？
*   数据库密码这种敏感数据能不能直接写进镜像环境变量？
*   配置文件能不能像代码一样被版本管理？

本篇给出 ConfigMap 与 Secret 的最小使用方式，并衔接 GitOps（高级篇）。

## 一、ConfigMap：从环境变量到 K8s 配置资源

K8s 原生的配置资源。本节给出 ConfigMap 的两种创建方式（YAML / kubectl from file-literal），以及在 deployment 里通过 env / envFrom 引用的最小用法。

## 二、Secret：敏感数据不下发到镜像

数据库密码、API Key 这类数据不应该出现在镜像、Git、YAML 明文中。本节给出 Secret 的 Opaque 类型最小用法，以及为什么它**不是**真正的安全（base64 ≠ 加密）。

## 三、配置与环境的解耦模式

一个 deployment 怎么在不同 namespace（dev / staging / prod）下用不同配置？本节给出"同一份 deployment YAML + 不同 ConfigMap / Secret"的解耦模式，避免每环境一个 deployment 副本。

## 四、与 GitOps 的衔接

ConfigMap / Secret 应该被 Git 管理吗？本节给出"非敏感 ConfigMap 入 Git、Secret 用 sealed-secrets / external-secrets"的两种衔接策略，与高级篇 GitOps（17）形成链条。

## 五、与 10 篇的对照

回顾 10 篇的进程级环境变量、K8s Pod 内的 `env`、ConfigMap `envFrom`、`valueFrom`——四层配置的位置关系图，作为中级篇"配置管理"主题的收束。
