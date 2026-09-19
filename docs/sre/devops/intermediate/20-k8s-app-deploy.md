---
title: 20 ｜ K8s 应用部署
description: 先建立 K3s 练习环境，再将 delivery-demo 部署到 K3s，完成入口访问、探针、滚动更新和回退实验。
date: 2026-09-08
updated: 2026-09-19
category: SRE 运维
tags:
  - DevOps
  - K8s
  - Kubernetes
  - K3s
---

# 前置：建立 K3s 练习环境

## 什么时候需要集群

前面的课程已经完成单机 Compose 发布。只有需要学习调度、声明式应用管理或贴近生产 Kubernetes 环境时，才进入本课；单机 Compose 仍可作为小项目的合理选择。

本课使用独立的 Ubuntu 24.04 LTS 实验机，不在已有业务服务器直接安装。K3s server 的官方基础要求为 2 核 CPU、2 GB 内存，业务和高级课程的 Argo CD 还需额外容量。单节点适合练习，但不具备节点故障容错能力；轻量发行版也不消除网络、存储和权限知识的学习成本。

## 安装与版本记录

准备 sudo 权限、可用 DNS、足够磁盘和镜像仓库出口。按实际访问路径设置防火墙：API 6443 仅对管理来源开放，HTTP 80 仅在入口练习需要时开放，不把集群端口全部开放到公网。

```bash
curl -fL https://get.k3s.io -o /tmp/install-k3s.sh
less /tmp/install-k3s.sh
# 检查脚本后安装 stable 通道；团队实验应另行固定审核过的 INSTALL_K3S_VERSION。
sudo env INSTALL_K3S_CHANNEL=stable sh /tmp/install-k3s.sh
sudo k3s --version
sudo systemctl status k3s --no-pager
sudo k3s kubectl get nodes
sudo k3s kubectl get pods -A
```

记录安装日期与 `k3s --version`。使用 stable 通道会随时间变化，不能把一次实验结果视为所有版本都兼容。后续命令使用 `kubectl`，首次设置当前练习用户的客户端：

```bash
mkdir -p "$HOME/.kube"
sudo install -m 600 -o "$(id -u)" -g "$(id -g)" /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
export KUBECONFIG="$HOME/.kube/config"
kubectl get nodes
```

上述配置具有集群管理权限，只用于当前实验机，不上传 Git、不交给 CI。配置中地址为本机回环地址；远程访问还涉及证书与网络，不能只复制文件就假定可用。

## 安装成功的证据

节点应为 `Ready`；长期运行的系统 Pod 应就绪；安装 Job 的 `Completed` 属于正常终态，持续 `Pending` 或 `ImagePullBackOff` 不属于成功。

```bash
kubectl get events -A --sort-by=.metadata.creationTimestamp
kubectl -n kube-system get svc
kubectl -n kube-system get pods -o wide
sudo journalctl -u k3s -n 100 --no-pager
```

| 现象 | 下一步 |
| --- | --- |
| `Pending` | 对具体 Pod 执行 `kubectl describe`，检查资源、端口和调度事件 |
| `ImagePullBackOff` | 检查完整镜像名、网络和仓库认证 |
| `NotReady` | 查看 kubelet / K3s 日志、磁盘和网络插件状态 |
| `permission denied` | 检查 kubeconfig 所有者，不将配置改为全员可读 |

K3s 的镜像由 containerd 管理，宿主机 `docker login` 不会自动给它授权。仓库镜像配置必须采用实际可用的服务地址，不把普通镜像仓库直接当作通用镜像代理。需要写配置时使用 `sudo tee /etc/rancher/k3s/registries.yaml`，普通 shell 的 `sudo cat > 文件` 无法给重定向提权。

## 默认入口与端口冲突

K3s 默认安装 Traefik，其 LoadBalancer 通过 ServiceLB 使用节点的 80/443 端口。因此本系列不再创建第二个占用 80 的 Nginx LoadBalancer，而是在下面使用 **ClusterIP Service + Ingress** 共享入口。

ServiceLB 并不意味着自动购买云负载均衡器，也不保证分配新的公网 IP。应检查 Service 状态、节点地址与云防火墙后再测试访问。

---

# 把镜像放进集群

前置条件：本节前置的 K3s 节点 Ready、Traefik 就绪，且已取得 [18 篇 CI 流水线](18-ci-pipeline.md) 的 `image.txt`。本课先用占位镜像生成配置，再用脚本替换为自己的 digest；不要直接 apply 占位值。

在练习仓库创建 `k8s/base`。后续课程沿用这些文件，并在 [22 篇 多环境隔离与制品晋级](22-env-separation.md) 通过 Kustomize 组织环境。

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

用 18 篇构建 v2，保存其引用为 `image-v2.txt`。记录旧版后更新：

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

参考：[Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)、[探针](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)、[K3s 要求](https://docs.k3s.io/installation/requirements)。
