---
title: 23 ｜ 交付边界与灰度
description: 区分持续交付、持续部署与功能发布，用蓝绿切换验证放量和回退。
date: 2026-03-28
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

## 部署成功以后，用户是否已经看到

持续交付强调软件保持可发布状态；持续部署把通过流水线的变更自动部署到生产。功能发布（Release）讨论用户何时能使用功能，可通过功能开关与部署解耦。不要把 Release 改称为持续交付的“现代定义”。

灰度是逐步扩大验证范围的策略；蓝绿是保留两套运行版本并切换入口的方式。两套环境存在，并不自动意味着完成按比例流量灰度。

## 本课实验范围

在 K3s 创建专用 `gray-lab` namespace，准备第 12 篇的 v1、v2 digest。为避免与 GitOps selfHeal 竞争，本实验不在上一课由 Argo CD 管理的 prod 内操作。

先复制第 16 篇 Deployment，生成两份：名称分别改为 `delivery-blue`、`delivery-green`，selector 和 Pod label 分别使用 `app: delivery-blue`、`app: delivery-green`，镜像分别固定为 v1、v2。保存到 `/tmp/gray-lab/blue.yaml` 和 `green.yaml`。Pod 的 readiness 与资源限制保留，创建前检查占位符已替换。

```bash
kubectl create namespace gray-lab
kubectl -n gray-lab apply -f /tmp/gray-lab/blue.yaml -f /tmp/gray-lab/green.yaml
kubectl -n gray-lab rollout status deployment/delivery-blue --timeout=120s
kubectl -n gray-lab rollout status deployment/delivery-green --timeout=120s
```

私有镜像需为该 namespace 配置 `ghcr-read`。本实验使用第 16 篇未加入配置依赖的模板；若沿用第 17 篇版本，还要预置对应 ConfigMap 和 Secret。

## 切换前先检查候选版本

在一个终端将 green 临时映射到本机端口：

```bash
kubectl -n gray-lab port-forward deployment/delivery-green 18081:80
```

另一个终端访问：

```bash
curl --fail http://127.0.0.1:18081/healthz
curl --fail http://127.0.0.1:18081/
```

应分别返回 `ok` 和 v2 页面。候选版本不健康时不切换正式入口。

## 蓝绿入口与显式回退

保存 `/tmp/gray-lab/service.yaml`：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: delivery-entry
spec:
  selector:
    app: delivery-blue
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl -n gray-lab apply -f /tmp/gray-lab/service.yaml
kubectl -n gray-lab patch service delivery-entry --type merge \
  -p '{"spec":{"selector":{"app":"delivery-green"}}}'
kubectl -n gray-lab get endpointslices -l kubernetes.io/service-name=delivery-entry
```

从集群内临时诊断 Pod 连续请求 `http://delivery-entry.gray-lab.svc.cluster.local/`，确认版本已切换。例如使用已获准的 Nginx Alpine 镜像运行 `wget`。不要用已有的 `port-forward service/...` 判断 Service 后端切换，它会选定一个 Pod，不能代表持续的 Service 路由。

发现业务问题时执行：

```bash
kubectl -n gray-lab patch service delivery-entry --type merge \
  -p '{"spec":{"selector":{"app":"delivery-blue"}}}'
```

可在已配置镜像读取权限的诊断 Pod 中发起集群内请求。以下用第 12 篇构建的镜像，私有镜像通过 overrides 指定同 namespace 的 `ghcr-read`；公共镜像可省略该字段：

```bash
kubectl -n gray-lab run request-check --rm -i --restart=Never \
  --image="$(cat image.txt)" \
  --overrides='{"spec":{"imagePullSecrets":[{"name":"ghcr-read"}]}}' \
  --command -- sh -c 'for i in 1 2 3 4 5; do wget -q -O - http://delivery-entry.gray-lab.svc.cluster.local/ || exit 1; sleep 1; done'
```

再次检查请求返回 v1。Service 更新存在传播和连接存续时间，已有长连接不保证立即迁移。此实验是整组切换，没有实现 10% 权重路由。

## 从蓝绿到按比例放量

生产金丝雀需要具备权重路由能力的入口或渐进发布控制器。可选 Argo Rollouts 配合受支持的流量路由器，但必须按所选控制器配置，不能假设普通 Deployment 和 Service 原生提供准确权重。

示例放量策略：先限定内部测试用户，通过后按 10%、50%、100% 扩大。每阶段观察 5 分钟且至少获得 200 次有效请求；错误率增加超过 1 个百分点或 p95 延迟高于基线 20% 时暂停并回退。以上是实验阈值，真实值需结合业务 SLO、流量规模和噪声校准；无流量或指标缺失不能当作通过。

## 最小验收

保留切换前后版本、EndpointSlice、失败暂停和回退证据。确认旧版仍兼容当前数据库，再决定是否回退应用。正式 GitOps 环境中应通过配置变更管理入口，不能照搬本课的手工 patch。

参考：[持续交付](https://martinfowler.com/bliki/ContinuousDelivery.html)、[Argo Rollouts](https://argo-rollouts.readthedocs.io/en/stable/)。
