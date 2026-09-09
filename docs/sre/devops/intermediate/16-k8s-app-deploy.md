---
title: 16 ｜ K8s 应用部署
description: 将 delivery-demo 部署到 K3s，完成入口访问、探针、滚动更新和回退实验。
date: 2026-09-08
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - K8s
  - Kubernetes
  - K3s
---

## 把镜像放进集群

前置条件：[K3s](k3s.md)节点 Ready、Traefik 就绪，且已取得第 12 篇的 `image.txt`。本课先用占位镜像生成配置，再用脚本替换为自己的 digest；不要直接 apply 占位值。

在练习仓库创建 `k8s/base`。后续课程沿用这些文件，并在第 18 篇通过 Kustomize 组织环境。

## Deployment 与 Service

保存 `k8s/base/deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: delivery-demo
spec:
  replicas: 2
  revisionHistoryLimit: 3
  progressDeadlineSeconds: 120
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: delivery-demo
  template:
    metadata:
      labels:
        app: delivery-demo
    spec:
      containers:
        - name: web
          image: ghcr.io/replace-me/delivery-demo:replace-me
          ports:
            - containerPort: 80
          readinessProbe:
            httpGet:
              path: /healthz
              port: 80
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /healthz
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 250m
              memory: 128Mi
```

readiness 决定是否接收 Service 流量，liveness 失败可能触发重启。真实应用的 liveness 不宜直接依赖外部数据库，否则数据库波动可能造成重启风暴。滚动更新需要额外一个 Pod 的容量，不能仅配置副本数就承诺零中断。

保存 `k8s/base/service.yaml`：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: delivery-demo
spec:
  selector:
    app: delivery-demo
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

Service 用 label 找 Pod。selector 拼错时，Service 仍存在，但没有可用后端。

## 通过 Ingress 访问

保存 `k8s/base/ingress.yaml`：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: delivery-demo
spec:
  ingressClassName: traefik
  rules:
    - host: demo.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: delivery-demo
                port:
                  number: 80
```

在练习终端执行。临时渲染目录避免覆盖 Git 中的占位模板：

```bash
kubectl create namespace demo
mkdir -p /tmp/delivery-manifests
cp k8s/base/*.yaml /tmp/delivery-manifests/
export IMAGE_REF="$(cat image.txt)"
python3 - <<'CODE'
import os, pathlib, re
ref = os.environ['IMAGE_REF']
assert re.fullmatch(r'ghcr.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}', ref)
p = pathlib.Path('/tmp/delivery-manifests/deployment.yaml')
p.write_text(p.read_text().replace('ghcr.io/replace-me/delivery-demo:replace-me', ref))
CODE
kubectl -n demo apply -f /tmp/delivery-manifests/
kubectl -n demo rollout status deployment/delivery-demo --timeout=120s
curl --fail -H 'Host: demo.local' http://127.0.0.1/healthz
curl --fail -H 'Host: demo.local' http://127.0.0.1/
```

curl 在 K3s 节点运行；外部访问改为可达的节点 IP，并放通对应来源的 80 端口。这里是 HTTP 实验，生产入口需配置域名和 TLS。

私有镜像需要在 `demo` namespace 预先创建 `kubernetes.io/dockerconfigjson` 类型的 `ghcr-read` Secret，然后在 Deployment 的 `spec.template.spec` 下添加：

```yaml
imagePullSecrets:
  - name: ghcr-read
```

可在临时 `DOCKER_CONFIG` 目录用只读账号登录，再通过 `kubectl -n demo create secret generic ghcr-read --from-file=.dockerconfigjson=配置文件路径 --type=kubernetes.io/dockerconfigjson` 导入。勿输出或提交认证文件；后续每个 namespace 都需配置自己的凭据。

## 更新与回退

用第 12 篇构建 v2，保存其引用为 `image-v2.txt`。记录旧版后更新：

```bash
kubectl -n demo get deployment delivery-demo -o jsonpath='{.spec.template.spec.containers[0].image}' > old-image.txt
kubectl -n demo set image deployment/delivery-demo web="$(cat image-v2.txt)"
kubectl -n demo rollout status deployment/delivery-demo --timeout=120s
curl --fail -H 'Host: demo.local' http://127.0.0.1/
```

在实验环境故意指定不存在的标签，观察事件；确认旧副本仍提供服务，再执行：

```bash
kubectl -n demo rollout undo deployment/delivery-demo
kubectl -n demo rollout status deployment/delivery-demo --timeout=120s
```

`rollout undo` 恢复 Deployment 的历史 Pod 模板，不恢复数据库、外部配置或文件。进入 GitOps 后，应在 Git 回退期望状态，避免控制器把手工回退再次覆盖。

## 最小验收与排查

- 两个 Pod Ready，首页显示期望版本，健康端点返回 `ok`。
- 查看 `kubectl -n demo get endpointslices`，确认 Service 有后端地址。
- 镜像错误时查看 `kubectl -n demo describe pod POD名称`；运行错误查看 `kubectl -n demo logs deployment/delivery-demo`。
- 入口 404 检查 Host 和 Ingress class；503 检查 selector 和 readiness。
- 失败版本未就绪时不能宣告发布成功，恢复后再次检查实际镜像。

参考：[Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)、[探针](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)。
