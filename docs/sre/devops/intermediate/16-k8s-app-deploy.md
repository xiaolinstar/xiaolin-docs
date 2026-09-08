---
title: 16 ｜ K8s 应用部署
description: 14 篇已经在 K3s 上搭好了集群，但应用怎么声明式部署上去？本文给出从 deployment / service 到 ingress 的最小 K8s 应用部署链路，让中级篇"使用 K8s 部署应用"这一目标真正落地。
date: 2026-09-08
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - K8s
  - Kubernetes
  - K3s
---

## 前言

承接 [14 ｜ 轻量 K3s 集群](k3s.md) 的产出——预生产已经有了一个 K8s 集群——下一步面对的是：

*   我的应用镜像怎么变成集群里跑起来的 Pod？
*   Service / Ingress 怎么连起来？
*   K8s 的"声明式"具体怎么落到 YAML 上？

15 篇讲了 CD 流水线，但 CD 的最终落点是 K8s——本篇给出**最朴素的应用部署 YAML 集合**，先把链路跑通，再谈优化。

## 一、从镜像到 Pod：Deployment 最小声明

一个应用从镜像到运行，最少需要哪些字段？replicas、selector、template、container image——本节给出可直接复制的最小 deployment YAML。

## 二、Service 与 ClusterIP：集群内访问

Pod IP 不固定，Service 给出稳定入口。本节区分 ClusterIP / NodePort / LoadBalancer 三种类型在 K3s 上的实际暴露方式。

## 三、Ingress：对外暴露的最小配置

K3s 自带 Traefik，本节给出一个最小 ingress YAML，让应用可通过域名访问——而不是 IP+端口。

## 四、滚动更新与回滚

应用升级怎么不中断？`kubectl rollout undo` 是哪一层的"撤销"？本节演示 deployment 的滚动更新机制与回滚命令。

## 五、与 CD 流水线（15 篇）的衔接点

镜像 push 后，CD 怎么知道要更新哪一组 deployment？给出最朴素的 `kubectl set image` / `kubectl apply` 方案，以及未来的 GitOps 衔接（高级篇 17 衔接点）。
