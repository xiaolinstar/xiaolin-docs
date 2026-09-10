---
title: 18 ｜ 轻量 K3s 集群
description: 建立隔离的 K3s 练习环境，验证节点、网络和默认入口。
date: 2026-03-28
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - K3s
  - Kubernetes
  - Linux
---

## 什么时候需要集群

[上一课](cd-pipeline.md)已经完成单机发布。只有需要学习调度、声明式应用管理或贴近生产 Kubernetes 环境时，才进入本课；单机 Compose 仍可作为小项目的合理选择。

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

K3s 默认安装 Traefik，其 LoadBalancer 通过 ServiceLB 使用节点的 80/443 端口。因此本系列不再创建第二个占用 80 的 Nginx LoadBalancer，而在[下一课](16-k8s-app-deploy.md)使用 **ClusterIP Service + Ingress** 共享入口。

ServiceLB 并不意味着自动购买云负载均衡器，也不保证分配新的公网 IP。应检查 Service 状态、节点地址与云防火墙后再测试访问。

## 最小验收与下一步

保存节点状态、系统 Pod 状态、实际版本和入口 Service 信息。检查 80/443 是否已有占用，能解释每个非 Running Pod 的原因，再继续应用部署。

思考：如果唯一节点关闭，两个应用副本能否保持可用？副本数量和节点容错是不同问题，后续滚动更新实验也以节点正常为前提。

参考：[K3s 要求](https://docs.k3s.io/installation/requirements)、[网络服务](https://docs.k3s.io/networking/networking-services)、[私有镜像配置](https://docs.k3s.io/installation/private-registry)。
