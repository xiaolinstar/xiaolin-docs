---
title: 17 ｜ 配置与密钥分离
description: 验证 ConfigMap、Secret 的注入方式和更新边界，避免密钥进入镜像与 Git。
date: 2026-09-08
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - K8s
  - 配置管理
  - Secret
---

## 同一镜像使用不同配置

承接[进程配置](environment.md)和[应用部署](16-k8s-app-deploy.md)。本课给 `delivery-demo` 注入实验配置，观察 Kubernetes 的传播行为。Nginx 不会因为增加一个 `APP_ENV` 变量就改变网页；应用必须主动读取配置，平台注入与业务生效是两件事。

## 创建非敏感配置

保存 `k8s/base/configmap.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: delivery-config
data:
  APP_ENV: dev
  LOG_LEVEL: info
```

在 `k8s/base/deployment.yaml` 的 `web` 容器内加入：

```yaml
envFrom:
  - configMapRef:
      name: delivery-config
env:
  - name: DEMO_TOKEN
    valueFrom:
      secretKeyRef:
        name: delivery-secret
        key: token
```

`envFrom` 用于一组非敏感变量，`valueFrom` 显式选择单个 Secret 字段。不要把整个 Secret 的内容打印到日志。下面只读取 `APP_ENV` 验证注入，不读取 token。

## 创建实验 Secret

在运行 kubectl 的 Bash 终端读取临时实验 token，通过文件传给 kubectl，避免把值写入命令历史。不要使用生产密钥做本实验。

```bash
umask 077
secret_file=$(mktemp)
read -r -s -p '输入实验 token: ' DEMO_TOKEN
printf '\n'
printf '%s' "$DEMO_TOKEN" > "$secret_file"
unset DEMO_TOKEN
kubectl -n demo create secret generic delivery-secret \
  --from-file=token="$secret_file" --dry-run=client -o yaml | kubectl -n demo apply -f -
rm -f "$secret_file"
```

Secret 的 base64 编码不等于加密。还需要限制读取权限、保护 etcd 和备份，并按实际集群启用静态加密。不要将明文或仅 base64 编码的 Secret YAML 提交 Git。

将上一课 `/tmp/delivery-manifests/deployment.yaml` 同步加入上述 env 配置，保留真实 digest，然后应用：

```bash
kubectl -n demo apply -f k8s/base/configmap.yaml
kubectl -n demo apply -f /tmp/delivery-manifests/deployment.yaml
kubectl -n demo rollout status deployment/delivery-demo --timeout=120s
kubectl -n demo exec deployment/delivery-demo -- printenv APP_ENV
```

预期输出为 `dev`。若 Pod 处于 `CreateContainerConfigError`，检查同一 namespace 内的资源名和 key 是否存在。

## 更新配置何时生效

```bash
kubectl -n demo patch configmap delivery-config --type merge -p '{"data":{"APP_ENV":"staging"}}'
kubectl -n demo exec deployment/delivery-demo -- printenv APP_ENV
kubectl -n demo rollout restart deployment/delivery-demo
kubectl -n demo rollout status deployment/delivery-demo --timeout=120s
kubectl -n demo exec deployment/delivery-demo -- printenv APP_ENV
```

重启前旧进程仍为 `dev`，重启后新 Pod 才读取 `staging`。同样，Secret 作为环境变量注入时，轮换资源不会自动替换既有进程变量。

| 使用方式 | 更新行为 | 应用需要做什么 |
| --- | --- | --- |
| 环境变量 | 已启动容器不自动更新 | 滚动重建 Pod |
| 普通 volume 挂载 | 文件通常最终更新，有传播延迟 | 支持重新读取或热加载 |
| `subPath` 挂载 | 不自动接收更新 | 重建 Pod |

轮换真实凭据时，需要先确认服务端接受新凭据，再更新消费者，验证后撤销旧凭据。允许新旧凭据短暂并存的方案可减少切换风险；具体能力取决于凭据提供方。

## GitOps 中怎样保存配置

ConfigMap 可进入配置仓库。Secret 本课由运维预置；高级篇沿用该边界，不在 GitOps 仓库存明文。

若进一步自动化，Sealed Secrets 需要安装控制器并管理加密密钥；External Secrets 需要外部密钥服务、控制器及访问授权。选择其中一种并验证恢复流程后再接入，不把工具名称本身当作已完成的安全方案。

## 最小验收

能解释环境变量为何没有立即改变；删除实验 Secret 时能定位配置错误；轮换后完成 Pod 健康检查；Git diff 和日志中没有 token。将 `APP_ENV` 恢复为 dev，再进入[多环境发布](18-env-separation.md)。

参考：[ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/)、[Secret 良好实践](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)。
