---
title: 21 ｜ 多环境隔离与制品晋级
description: 用 Kustomize 组织 dev、staging、prod，并让同一镜像 digest 逐步晋级。
date: 2026-09-08
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - K8s
  - 环境分离
  - 多环境发布
---

## 环境隔离与发布顺序

本课沿用上一课的 `k8s/base`，使用 kubectl 内置 Kustomize。练习采用单集群三个 namespace；生产是否独立集群，要根据故障影响范围、权限与合规需求选择。namespace 提供资源作用域，不等于完整网络或节点隔离。

“多个 Deployment”和“多个 namespace”也不是二选一：本例每个 namespace 内各有一个 Deployment，由同一个 base 生成。

## 建立目录与 overlay

在 `k8s/base/kustomization.yaml` 写入：

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml
  - configmap.yaml
```

用以下脚本生成环境目录，并将 CI 输出的相同 digest 写入每个 overlay。首次初始化可以相同；后续晋级时逐环境修改、验证，不一次更新生产。

```bash
export IMAGE_REF="$(cat image.txt)"
python3 - <<'CODE'
import os, pathlib, re
ref = os.environ['IMAGE_REF']
assert re.fullmatch(r'ghcr.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}', ref)
name, digest = ref.split('@')
for env in ('dev', 'staging', 'prod'):
    p = pathlib.Path('k8s/overlays') / env
    p.mkdir(parents=True, exist_ok=True)
    (p / 'kustomization.yaml').write_text(f"""apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: {env}
resources:
  - ../../base
images:
  - name: ghcr.io/replace-me/delivery-demo
    newName: {name}
    newTag: ""
    digest: {digest}
patches:
  - target:
      kind: ConfigMap
      name: delivery-config
    patch: |-
      - op: replace
        path: /data/APP_ENV
        value: {env}
  - target:
      kind: Ingress
      name: delivery-demo
    patch: |-
      - op: replace
        path: /spec/rules/0/host
        value: {env}.demo.local
""")
CODE
kubectl kustomize k8s/overlays/dev
```

检查渲染结果：namespace、域名、APP_ENV 应对应环境，镜像必须是 digest 引用。base 的容器名、selector 保持一致，避免复制三套 YAML 后各自漂移。

## 预置环境与权限

```bash
for env in dev staging prod; do
  kubectl create namespace "$env" --dry-run=client -o yaml | kubectl apply -f -
done
```

按第 20 篇方式为每个 namespace 创建各自的 `delivery-secret`，私有镜像还需 `ghcr-read`。不要跨环境复用生产凭据。

生产发布身份的最小 Role 示例（由管理员安装，并按工作流实际资源收敛）：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: delivery-deployer
  namespace: prod
rules:
  - apiGroups: [apps]
    resources: [deployments]
    verbs: [get, list, watch, create, update, patch]
  - apiGroups: [""]
    resources: [services, configmaps]
    verbs: [get, list, watch, create, update, patch]
  - apiGroups: [networking.k8s.io]
    resources: [ingresses]
    verbs: [get, list, watch, create, update, patch]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: delivery-deployer
  namespace: prod
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: delivery-deployer
  namespace: prod
subjects:
  - kind: ServiceAccount
    name: delivery-deployer
    namespace: prod
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: delivery-deployer
```

该身份不直接读取 Secret，但能修改 Pod 模板的身份仍可能间接使用该 namespace 的凭据，因此不能把这个 Role 当作不可信租户隔离。还应限制运行身份、镜像来源和 Pod 权限。生产还需独立的 NetworkPolicy、ResourceQuota 和 LimitRange；未配置 NetworkPolicy 时，不能宣称跨 namespace 网络已隔离。

## 先验证再晋级

```bash
kubectl apply -k k8s/overlays/dev
kubectl -n dev rollout status deployment/delivery-demo --timeout=120s
curl --fail -H 'Host: dev.demo.local' http://127.0.0.1/healthz
curl --fail -H 'Host: dev.demo.local' http://127.0.0.1/environment
```

两个端点应分别返回 `ok` 和 `dev`，证明配置已改变应用行为。dev 通过后再执行 staging 的相同命令，环境端点应返回 `staging`。prod 由受保护的发布流程执行，不能因为目录已经生成就自动发布。检查实际版本：

```bash
for env in dev staging prod; do
  kubectl -n "$env" get deployment delivery-demo \
    -o jsonpath='{.metadata.namespace}{" "}{.spec.template.spec.containers[0].image}{"\n"}'
done
```

晋级完成时三个 digest 应相同。环境标签便于检索，但不能替代 digest 比较；生产阶段不重新构建镜像。各环境允许保留不同的配置与资源规格。

## 最小验收与边界

用集群管理员身份检查 `kubectl auth can-i get secrets --as=system:serviceaccount:prod:delivery-deployer -n prod`，预期为 `no`；核对三个 Host 不串环境。每次发布保留目标环境和 digest 的记录。

环境分离处理配置、权限和故障范围；[灰度发布](../advanced/what-is-cd.md)处理同一环境内哪些请求使用新版本，两者不能互相替代。下一课给每个环境配独立数据库并验证迁移顺序。

参考：[Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)、[namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)。
