---
title: 22 ｜ GitOps 发布实践
description: 用 Argo CD 拉取环境清单，验证同步、配置漂移修复与 Git 回退。
date: 2026-04-09
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - GitOps
---

## 从发布命令到期望状态

中级篇由操作人执行 `kubectl apply`。本课让集群内的 Argo CD 持续读取配置仓库，由 Git 中审核后的清单表达期望状态。前置条件是第 18 篇的 Kustomize 文件、环境 Secret，以及第 21 篇已经通过验证的镜像。

OpenGitOps 的四项原则是声明式、版本化且不可变、自动拉取、持续调和。将 YAML 存 Git 后由 CI 经 SSH 执行一次 Compose，是版本化的 Push CD；如果缺少自动拉取和持续调和，不能仅凭“配置在 Git”就称为完整 GitOps。

## 明确三类权限

| 身份 | 所需能力 | 本课程边界 |
| --- | --- | --- |
| 应用 CI | 构建、测试、推送镜像 | 不持有集群管理凭据 |
| 配置修改者 | 创建配置 PR | 生产分支必须评审，镜像验证后才允许合并 |
| Argo CD | 读取配置仓库、调和授权目标 | 集群管理员限制可部署仓库、namespace 与资源类型 |

Git 历史记录期望状态的变更，不等于完整运行审计；仍要保留控制器操作记录、集群审计和部署结果。Secret 沿用第 17 篇的预置方式，不提交明文。

## 准备配置仓库与控制器

将第 18 篇 `k8s` 目录放进练习配置仓库，确认 `prod` overlay 已替换为真实 digest。仓库不得包含账号密码。私有仓库给 Argo CD 配只读凭据，不借用 CI 写权限。

按 [Argo CD Getting Started](https://argo-cd.readthedocs.io/en/stable/getting_started/)安装控制器。下载团队选定发布版本的安装清单、审核后执行；不要把浮动 `stable` URL 当作长期版本锁。安装后确认 CRD 和控制器就绪，再应用下一段 Application。

```bash
kubectl -n argocd get deployments
kubectl get crd applications.argoproj.io
kubectl -n argocd rollout status deployment/argocd-server --timeout=180s
```

这里使用独立实验集群和默认 project 简化学习；生产必须建立受限 AppProject，并限制 Argo CD 本身的集群权限。

## 创建 Application

保存 `argocd-application.yaml`，替换 `repoURL` 为真实配置仓库 URL：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: delivery-demo-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/OWNER/delivery-config.git
    targetRevision: main
    path: k8s/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: prod
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
```

```bash
kubectl apply -f argocd-application.yaml
kubectl -n argocd get application delivery-demo-prod -w
```

看到 `Synced` 和 `Healthy` 后，再检查实际首页与 digest。自动同步不是自动判定业务正确。`prune: false` 用于首次实验避免自动删除资源；生产是否开启 prune，需明确资源归属、删除审批与恢复策略。

`main` 持续跟踪新配置，合并 PR 就可能触发部署。只有在 **合并之前** 完成审批和制品验证，才能把它当作发布准入；合并后的 GitHub Environment 审批无法阻止已经发生的调和。

## 漂移与回退实验

在专用实验环境手动将副本改为 1：

```bash
kubectl -n prod scale deployment delivery-demo --replicas=1
kubectl -n prod get deployment delivery-demo -w
```

等待调和后，应恢复为 Git 声明的 2。检查 Application 状态和事件，不把“控制器在运行”当作漂移实验通过。

升级时通过 PR 修改 prod overlay 的 digest，验证后合并。回退时建立反向 PR，恢复上一已验证的 digest，再检查 Argo CD 同步和首页。不要只执行 `kubectl rollout undo`，否则 selfHeal 会再次恢复 Git 中的新版本。

## 最小验收与故障边界

- 配置 PR、镜像验证记录、合并 commit、集群实际 digest 可关联。
- 手动漂移被修复；Git 回退后旧版恢复。
- 无效清单应显示同步错误；错误镜像可能已同步但不 Healthy，两者需分别检查。
- 数据库、外部文件和凭据不会因 Git 回退自动恢复。
- 紧急手动修复时，先按应急流程暂停相应自动同步，再补齐 Git 状态并恢复调和，不能长期让两个来源竞争。

参考：[OpenGitOps](https://opengitops.dev/)、[Argo CD 自动同步](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)。
