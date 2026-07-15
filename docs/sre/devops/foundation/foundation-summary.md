---
title: 09 ｜ 基础篇总结：从手动部署到声明式流水线
description: DevOps 基础篇收尾——回顾 8 篇演进、梳理范式跃迁、给出能力清单与选型建议，标注掌握本篇内容足以应对的中小型项目场景。
date: 2026-07-15
updated: 2026-07-15
category: SRE 运维
tags:
  - DevOps
  - 总结
  - 范式演进
---

到这里，DevOps 基础篇 8 篇全部走完。这一篇不引入新内容，**只做收尾**——回顾主线、给出能力清单、标注掌握本篇内容能解决什么、不能解决什么。

## 一、演进全景

```
01 Nginx 静态资源代理        静态文件的基础设施前置
       ↓
02 生产环境入门              7×24 + 公网 IP，scp 第一次手动部署
       ↓
03 Git 与 GitHub             版本管理，git push 源码 / 服务器 pull + build
       ↓
04 服务端应用部署             进程持续存活（系统化）、三类运维痛点
       ↓
05 容器 Docker               服务器只跑进程，不再装包
       ↓
06 流水线基础                 Jenkinsfile / 运维左移 / IaC 入门
       ↓
07 GitHub Actions            托管式流水线 + 两个实战
       ↓
08 多服务容器编排             docker-compose，多容器一起管理
```

## 二、四次范式跃迁

把每一篇对应回 02 节的范式 $f(x) = c$：

| 节点 | 动作变化 | $X$ 扩容 | $Y$ 扩容 | 范式性质 |
| --- | --- | --- | --- | --- |
| 02 → 03 | `scp dist` → `git pull` + 本地构建 | 加入「带历史的源码」 | 不变 | 部署对象升级 |
| 03 → 04 | 增加「进程生命周期」动作链 | 加入「带运行时进程」 | $Y$ 拆成 $Y_{\text{infra}} \cap Y_{\text{app}}$ | 显式化隐含项 |
| 04 → 05 | 「构建动作」从服务器剥离 | 加入「带运行时的镜像」 | 不变 | 服务器回归本职 |
| 05 → 06 | 「手动 ssh」 → 「声明式 Jenkinsfile」 | 加入「流水线代码」 | 不变 | 运维动作代码化 |
| 06 → 07 | Groovy DSL → YAML，云端执行 | 加入「托管式 Runner」 | 不变 | 工具栈升级 |
| 05 → 08 | `docker run` ×1 → `docker compose up` ×N | 加入「多服务拓扑」 | 不变 | 多容器扩展 |

**主线规律**：每一篇都在 $X$ 扩容、$Y$ 拆层或动作代码化——**$f$ 一直保持闭合**，输入变化时动作结构不变。

## 三、能力清单（掌握本篇你能做什么）

### 静态站点

- ✅ Nginx 反向代理 + 静态资源托管
- ✅ SSH + scp 手动部署
- ✅ `git push` → 服务器 `git pull` + build
- ✅ VitePress 等静态站点构建产物落到 Nginx 目录
- ✅ GitHub Actions + Pages 全自动部署

### 后端应用

- ✅ Spring Boot / Flask 单服务部署（手动 + 流水线）
- ✅ JVM / Gunicorn 启动参数 + systemd 保活
- ✅ 环境变量 / 配置文件管理（DB 连接串等）
- ✅ Docker 镜像化部署（服务器只装 Docker）
- ✅ Jenkinsfile / GitHub Actions 流水线自动触发

### 多服务项目

- ✅ Docker Compose 编排 Nginx + 应用 + DB + 缓存
- ✅ 一份 `docker-compose.yml` 描述全部服务的期望状态
- ✅ `depends_on` 处理启动顺序
- ✅ 卷挂载持久化数据 / 共享配置

### 流水线与协作

- ✅ Jenkinsfile / GitHub Actions YAML 声明式编写
- ✅ webhook 触发自动构建
- ✅ 凭据管理（Credentials Store / Secrets）
- ✅ 失败通知（Slack / Email）
- ✅ Pipeline 运行历史可追溯

## 四、能应对什么，不能应对什么

### ✅ 足以应对

| 场景 | 推荐方案 |
| --- | --- |
| 个人博客 / 文档站 | GitHub Actions + Pages（07） |
| 个人 / 小团队 Web 应用（Spring Boot / Flask） | Docker + GitHub Actions（05 + 07） |
| 中小型全栈项目（前端 + 后端 + DB） | Docker Compose + Jenkinsfile（08 + 06） |
| 国内云服务器部署（受网络限制） | 自托管 Jenkins + 阿里云镜像加速（06 + 05） |
| 多环境（dev / staging / prod） | Docker Compose 多文件 / Actions matrix（08 + 07） |

### ❌ 还差得远

| 场景 | 缺失能力 |
| --- | --- |
| 集群化（数十个服务节点） | Kubernetes / K3s（基础篇之外） |
| 灰度发布 / 蓝绿部署 | Service Mesh / Argo Rollouts |
| 自动扩缩容 | K8s HPA / Cluster Autoscaler |
| 多区域容灾 | K8s Federation / Cross-Region Replication |
| 完整可观测性（metrics / traces / logs 联动） | Prometheus + Grafana + Tempo + Loki 全套 |
| IaC 完整版（服务器、网络、数据库都代码化） | Terraform / Pulumi |
| 安全合规（镜像扫描 / 准入控制） | Trivy / OPA / Falco |

**这些是基础篇之后的进阶内容**——你什么时候需要解决「集群」「弹性」「跨区域」，再继续向上走。**多数个人 / 中小项目，本篇已足够。**

## 五、回到开发者的「最低必要能力」

如果你只想**用最少的时间让项目上生产**，下面这条路径覆盖 90% 场景：

```
01 看一眼 Nginx 配置
05 学会 docker run
07 复制 GitHub Actions Pages 模板
```

如果是**全栈项目**：

```
01 Nginx 静态代理
02 手动部署跑通一遍
03 git push 源码
05 docker run 单容器
07 GitHub Actions 自动构建 + 部署
08 docker-compose 起多服务
```

如果**有复杂后端**：

```
01-04（手动部署 + 后端栈）
05 容器化
06 Jenkinsfile 流水线
07（可选 Actions）
08 docker-compose 多服务
```

## 六、给读者的建议

1. **不要一上来就用最复杂的方案**——K8s / Argo CD / Terraform 是进阶工具，先把 01-08 走通。
2. **每篇都动手做一遍**——「跑通一次」>「读十遍」。基础篇的核心是 muscle memory。
3. **遇到问题先看 04 三类运维痛点**——服务器脏 / 资源争抢 / 网络不对等是常见根因。
4. **保持版本管理习惯**——任何运维脚本（systemd unit / nginx conf / Jenkinsfile）都该在 Git 仓库里。
5. **理解「声明式」思想**——Jenkinsfile、docker-compose.yml、IaC 都是同一思想的不同体现。

## 七、下一篇预告

基础篇之后，**实战篇**会把这些工具组合到真实项目里——从 0 到部署一套完整的多服务应用（含前端 + 后端 + DB + 监控）。届时你将看到 01-08 的所有知识如何在一个项目里**组合协作**。

## 参考

- 本系列全部 8 篇的链接：见侧栏「SRE 运维 / DevOps / 基础篇」
- 渐进式 DevOps 总纲：[00 ｜ 渐进式运维导读](../cicd/progressive-devops-intro.md)