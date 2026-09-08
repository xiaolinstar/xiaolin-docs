---
title: 14 ｜ 轻量 K3s 集群
description: 本文面向DevOps工程师和云原生开发者，介绍如何选择和使用轻量级Kubernetes方案来搭建预生产环境。
date: 2026-03-28
updated: 2026-03-28
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - K3s
  - Kubernetes
  - Linux
---


本文面向DevOps工程师和云原生开发者，介绍如何选择和使用轻量级Kubernetes方案来搭建预生产环境。我们将重点介绍K3s这一优秀的轻量级Kubernetes发行版，并提供详细的安装部署指南。

* [ ]  K3s 安装后，80/443端口被占用

## 引言：为什么需要轻量级Kubernetes？

想象一下这样的场景：你正在开发一个微服务应用，需要在本地或云服务器上搭建一个与生产环境相似的测试环境。传统的Kubernetes集群需要3-5个节点，每个节点至少2GB内存，这对于个人开发或小型项目来说成本太高了。

**这就是轻量级Kubernetes的价值所在**：它们能够在单台机器上运行完整的Kubernetes功能，大大降低了资源消耗和学习成本。

### 传统Kubernetes vs 轻量级Kubernetes


| 对比维度       | 传统K8s                      | 轻量级K8s                    |
| -------------- | ---------------------------- | ---------------------------- |
| **资源需求**   | 3-5节点，每个2GB+内存        | 单节点，512MB内存            |
| **安装复杂度** | 复杂，需要专业运维知识       | 简单，一键安装               |
| **学习成本**   | 高，需要掌握网络、存储等概念 | 低，专注于应用部署           |
| **适用场景**   | 大型企业生产环境             | 开发测试、边缘计算、小型项目 |

## 预生产环境（Staging）的重要性

在软件交付流程中，预生产环境（Staging）扮演着承上启下的关键角色。它就像是正式演出前的彩排现场，能够：

1. **发现潜在问题**：在接近生产环境的情况下验证功能完整性
2. **性能摸底**：测试系统在高并发下的表现
3. **流程验证**：演练部署、回滚等运维操作
4. **用户验收**：让业务方提前体验新功能

使用Kubernetes搭建Staging环境的最大优势是**环境一致性**：开发、测试、生产环境使用相同的配置和部署方式，大大减少了"在我机器上能运行"的问题。

## 轻量级 Kubernetes 技术选型

市面上的轻量级Kubernetes方案众多，我们该如何选择？下面通过一个详细的对比表格来帮你决策。

### 技术方案对比

> GitHub Stars 数据截止到 2026-01-13


| 方案                          | GitHub Stars | 核心优势               | 简介                                                                               | 上手难度 |
| ----------------------------- | ------------ | ---------------------- | ---------------------------------------------------------------------------------- | -------- |
| **K3s**                       | ⭐31.9k+     | 生产就绪，资源消耗极低 | Lightweight Kubernetes                                                             | ⭐⭐     |
| **Minikube**                  | ⭐31.4k+     | 官方推荐，文档完善     | Run Kubernetes locally                                                             | ⭐⭐     |
| **Docker Desktop Kubernetes** | ❌           | 开箱即用，图形界面     |                                                                                    | ⭐       |
| **MicroK8s**                  | ⭐9.2k+      | 自动更新，高可用       | MicroK8s is a small, fast, single-package Kubernetes for datacenters and the edge. | ⭐⭐     |
| **Kind**                      | ⭐14.9k+     | 快速启动，容器化       | Kubernetes IN Docker - local clusters for testing Kubernetes                       | ⭐⭐⭐   |

### 选型建议：按场景选择

#### 🚀 **场景一：云服务器部署**

**推荐方案：K3s**

核心优势：

- 易于安装，维护成本低
- 社区活跃，文档丰富
- 专为资源受限环境设计，内存占用低
- 支持高可用模式，适合小型生产环境

#### 💻 **场景二：本地开发环境，**

**推荐方案：Docker Desktop K8s（Windows/macOS）或 Minikube（Linux）**

云原生中容器技术学习路线：Docker first，then Kubernetes

核心优势：

- 开箱即用，无需配置
- 图形化界面，操作直观

![Kubernetes in Docker Desktop](https://media.xiaolin.fun/docs/img-k3s/k8s-in-docker-desktop.png)

## 实战：在Ubuntu上部署K3s

下面我们通过一个完整的实战案例，演示如何在Ubuntu服务器上部署K3s。

### 环境准备

> 演示项目环境为：TencentCloud Lighthouse（腾讯云轻量应用服务器），Ubuntu 24.04 LTS，服务器配置为：1核2GB内存，50GB磁盘空间

在开始之前，请确保你的服务器满足以下要求：

- Ubuntu 18.04或更高版本
- 至少1GB可用内存
- 10GB磁盘空间

### 安装步骤

#### 第一步：一键安装K3s

```bash
# 使用国内镜像源加速安装
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -
```

这个命令会完成以下操作：

- 下载K3s二进制文件（约100MB）
- 安装并启动K3s服务
- 配置 kubectl 命令行工具
- 设置必要的系统服务

查看k3s服务状态和计算资源占用情况 `top`

![top-k3s-server](https://media.xiaolin.fun/docs/img-k3s/top-k3s-server.png)

#### 第二步：验证安装

安装完成后，通过以下命令验证K3s是否正常运行：

```bash
# 检查K3s服务状态: active（running）
systemctl status k3s

# 查看集群节点信息: Ready control-plane
kubectl get nodes

# 查看所有运行中的Pod
kubectl get pods -A
```

如果看到类似下面的输出，说明安装成功：

```
kube-system   coredns-7f496c8d7d-qrscc                  1/1     Running     0          2d2h
kube-system   helm-install-traefik-6g9wx                0/1     Completed   2          2d2h
kube-system   helm-install-traefik-crd-vcphz            0/1     Completed   0          2d2h
kube-system   local-path-provisioner-578895bd58-dlcsg   1/1     Running     0          2d2h
kube-system   metrics-server-7b9c9c4b9c-9dbn9           1/1     Running     0          2d2h
kube-system   svclb-nginx-service-2d94a781-s7pmn        0/1     Pending     0          28h
kube-system   svclb-traefik-066dab33-kcs4k              2/2     Running     0          2d1h
kube-system   traefik-6f5f87584-98dmx                   1/1     Running     0          2d1h
```

### 解决网络问题

K3s访问的镜像仓库默认为DockerHub，在云服务的网络环境下会遇到镜像拉取失败问题。可配置镜像加速器（换源）：

```bash
# 创建镜像加速配置
sudo mkdir -p /etc/rancher/k3s
sudo cat > /etc/rancher/k3s/registries.yaml << EOF
mirrors:
  docker.io:
    endpoint:
      - "https://registry.cn-hangzhou.aliyuncs.com/"
      - "https://mirror.ccs.tencentyun.com"
  quay.io:
    endpoint:
      - "https://quay.tencentcloudcr.com/"
  registry.k8s.io:
    endpoint:
      - "https://registry.aliyuncs.com/v2/google_containers"
  gcr.io:
    endpoint:
      - "https://gcr.m.daocloud.io/"
  k8s.gcr.io:
    endpoint:
      - "https://registry.aliyuncs.com/google_containers"
  ghcr.io:
    endpoint:
      - "https://ghcr.m.daocloud.io/"
EOF

# 重启K3s服务使配置生效
sudo systemctl restart k3s
```

如果K3s中仍然有镜像拉取失败，可以向我留言。

我在实操的过程中遇到问题：`rancher/mirrored-pause:3.6`镜像一直拉取失败，导致K3s服务状态异常。

## 实战案例：部署第一个应用

> 我已经在云服务上使用K3s部署了自己的微服务应用，包括Python Flask应用和Redis数据库，应用运行正常。

现在我们已经有了一个运行的K3s集群，让我们来部署一个简单的Nginx应用。

### 创建部署配置文件

首先创建Nginx的部署配置文件：

```yaml
# nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 2  # 运行2个副本
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```

### 创建服务暴露应用

为了让外部能够访问Nginx，我们需要创建一个Service：

```yaml
# nginx-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
    - protocol: TCP
      port: 80        # 服务端口
      targetPort: 80  # 容器端口
  type: LoadBalancer  # 使用负载均衡器类型
```

### 部署应用

现在执行部署命令：

```bash
# 部署Nginx应用
kubectl apply -f nginx-deployment.yaml
kubectl apply -f nginx-service.yaml

# 检查部署状态
kubectl get deployments
kubectl get pods
kubectl get services
```

### 访问应用

部署完成后，通过以下命令获取访问地址：

```bash
# 查看服务详情
kubectl get svc nginx-service

# 如果使用LoadBalancer类型，会分配外部IP
# 直接访问该IP的80端口即可
curl http://<EXTERNAL-IP>:80
```

## 进阶功能：安装Kubernetes Dashboard

如果你喜欢图形化界面，可以安装Kubernetes Dashboard，需使用helm包管理工具，本文不做详细介绍。

![Kubernetes Dashboard](https://media.xiaolin.fun/docs/img-k3s/kubernetes-dashboard.png)

## 总结

本文介绍了三个方面：

1. **轻量级Kubernetes的选型方法**：根据具体场景选择最合适的方案
2. **K3s的安装部署**：在Ubuntu上快速搭建Kubernetes环境
3. **应用部署实战**：使用K8s配置文件部署和管理应用

K3s作为一款优秀的轻量级Kubernetes发行版，特别适合中小型项目的预生产环境搭建。它的轻量级特性让我们能够在有限的资源下享受到Kubernetes带来的便利，同时保持了生产环境的兼容性。

**下一步建议**：

- 尝试部署你自己的微服务应用
- 学习使用helm进行应用包管理
- 基于K3s的CI/CD流水线实践

## 参考资料

1. K3s官方文档，https://docs.k3s.io/
2. Kubernetes官方文档，https://kubernetes.io/docs/
3. Rancher中国镜像站，https://rancher-mirror.rancher.cn/
4. K3s GitHub 仓库，https://github.com/k3s-io/k3s
5. MiniKube GitHub 仓库，https://github.com/kubernetes/minikube
6. MicroK8s GitHub 仓库，https://github.com/canonical/microk8s
7. Kind GitHub 仓库，https://github.com/kubernetes-sigs/kind