---
title: 06 ｜ 流水线基础：从手动命令到 Jenkinsfile
description: 把 05 篇的手动操作（pull → build → deploy → healthcheck）流水线化——用 Jenkinsfile 把操作写进代码仓库，运维左移到开发。
date: 2026-07-15
updated: 2026-07-15
category: SRE 运维
tags:
  - DevOps
  - Jenkins
  - 流水线
  - Jenkinsfile
  - IaC
---

05 篇的服务器动作链还是手动的：

```bash
ssh ubuntu@server
cd /var/www/my-site
git pull
mvn package          # 或 pip install
sudo systemctl restart myapp
sleep 5 && curl -fsS http://localhost:8080/health
```

每一步都要登录服务器、复制粘贴命令；漏一步就出问题，**上线靠记忆**。

这一篇要做的事：**把 05 的操作链流水线化**——用一个声明式文件描述「要做哪些操作」，**每次 `git push` 自动执行**。带来的不只是「少敲几次命令」，而是**运维动作可版本管理、可 Code Review、可沉淀**——这就是「**运维左移**」（Shift Left）。

这一篇以 **Jenkins** 作为流水线引擎为代表。它不是唯一的工具，但**Jenkinsfile** 的语法清晰展示了「声明式流水线」的核心理念。

## 流水线是什么

**流水线**（Pipeline）是「一组操作按顺序串起来，按触发条件自动执行」。三个关键属性：

| 属性 | 说明 |
| --- | --- |
| **顺序** | 动作有先后（先拉代码、再构建、再部署） |
| **触发** | 谁来启动它——`git push` / 定时 / 手动 |
| **可声明** | 动作描述在文件里，不是每次手敲 |

把流水线对应回 02 篇确立的形式化锚点：**操作清单 $Y=\{v_1,v_2,\ldots,v_n\}$**——变更是 $x$（代码提交），约定结果是 $c$（部署成功）。

**流水线就是 $Y$ 的具体实现**——动作结构稳定，输入是 `$x$`（代码变更），输出是 `$c$`（部署成功）。手动的 $Y$ 是「人在脑子里记着步骤」，流水线化的 $Y$ 是「文件里写明步骤 + 引擎自动执行」。

Pipeline（首字母大写）特指具体工具：**Jenkins Pipeline / GitHub Actions / GitLab CI**。它们都遵循上面这三个属性，只是语法不同。

## Jenkinsfile：从手动命令到声明式代码

**Jenkinsfile** 是 Jenkins 流水线的声明文件——把 05 篇的「ssh 上去敲命令」写成一个文本文件，由 Jenkins 引擎读取并执行。

一个对应 05 篇 Spring Boot 部署的 Jenkinsfile：

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git 'https://github.com/your/your-app.git'
            }
        }

        stage('Build') {
            steps {
                sh 'mvn clean package -DskipTests'
            }
        }

        stage('Deploy') {
            steps {
                sh 'sudo systemctl restart myapp'
                sh 'sleep 5 && curl -fsS http://localhost:8080/health'
            }
        }
    }

    post {
        failure {
            echo '部署失败，请检查日志'
        }
        success {
            echo '部署成功'
        }
    }
}
```

### 三个核心结构

| 结构 | 作用 | 类比 |
| --- | --- | --- |
| **`stages`** | 一组有序的阶段（Checkout / Build / Deploy） | 流水线上的工位 |
| **`steps`** | 阶段内的具体动作（`sh 'mvn package'`） | 工位上的工人执行的一步操作 |
| **`agent`** | 在哪台机器执行（`any` / `docker` / 指定 label） | 流水线工厂 |

`post` 块定义流水线结束后的动作（成功 / 失败 / 不稳定），可以用来发通知、上传日志。

### Jenkinsfile 在哪

**Jenkinsfile 写在你的应用代码仓库根目录**——这是它跟传统「运维脚本放在跳板机」最大的区别。仓库结构大致：

```
your-app/
├── src/                  ← 应用代码
├── pom.xml
├── Jenkinsfile           ← 流水线声明（与代码同仓库）
└── README.md
```

这样**应用代码和部署它的流水线绑在一起**——任何一次代码变更都伴随一次 Jenkinsfile 的可能更新（如果你希望流水线也跟着改）。

## 运维左移（Shift Left）

「**运维左移**」是这个时代最重要的运维理念之一——指把运维动作从「上线那一刻」往左移（往开发阶段移）。

| 传统模式 | 左移之后 |
| --- | --- |
| 运维动作在跳板机上，运维脑子里 | 运维动作在 `Jenkinsfile`，跟代码一起 commit |
| 新人入职要「师傅带」才能上线 | 新人 clone 仓库，`git push` 就触发流水线 |
| 一次上线 = 一次手动操作 | 一次上线 = 一次代码 commit + 自动流水线 |
| 升级 / 回退靠文档和记忆 | 升级 / 回退靠 Git 历史 |
| 运维事故排查靠日志 + 经验 | 流水线运行记录可追溯 |

最关键的转变：**「上线步骤」从某个人脑子里的隐性知识，变成了仓库里显性、可版本管理的代码。** 这就是「**基础设施即代码**」（Infrastructure as Code，IaC）的入门形态。

Jenkinsfile 不是完整的 IaC（完整 IaC 包括 Terraform、Ansible、Kubernetes YAML 等），但**它的思想一致**：把基础设施 / 运维动作写进代码、用 Git 管理、用流水线执行。

## Jenkins 实战注意点

### 1. 触发：webhook + GitHub 集成

Jenkins 安装 **GitHub 插件**，在 GitHub 仓库设置 webhook → Jenkins 地址。每次 `git push`，GitHub 通知 Jenkins，Jenkins 自动拉代码、跑流水线。

### 2. 凭据管理：不要把密钥写在 Jenkinsfile 里

数据库密码、SSH 私钥、镜像仓库 token 这类**敏感信息**：

- ❌ 写在 `Jenkinsfile` 明文里（提交到 Git 会被看见）
- ✅ 存到 **Jenkins Credentials Store**，Jenkinsfile 里只引用 ID：

```groovy
steps {
    withCredentials([sshUserPrivateKey(credentialsId: 'my-deploy-key',
                                       keyFileVariable: 'SSH_KEY')]) {
        sh 'ssh -i $SSH_KEY ubuntu@server "systemctl restart myapp"'
    }
}
```

### 3. Agent 也要 Maven / JDK

Jenkins 的 agent 机器跑 `mvn package` 这一步，**它自己也得有 Maven / JDK**——这正是 03 篇「服务器变脏」的翻版，只不过现在「脏」的是 Jenkins agent，不是生产服务器。

后续篇章会用**容器化 agent**（`agent { docker { image 'maven:3.9' } }`）来解决——agent 启动时拉一个带 Maven 的镜像，pipeline 跑完即销毁。这正好把 05 学到的容器知识用到 Jenkins 上。

### 4. 流水线失败时日志去哪查

- Jenkins 控制台：每次流水线运行有完整 stdout / stderr 日志
- **保留策略**：默认保留 30 天；可调成「保留所有」+ 配置磁盘清理策略
- 通知：装 **Email / Slack / 企业微信插件**，失败时自动推

## 延伸阅读：主流流水线工具一览

Jenkins 不是唯一的流水线引擎。基础篇选 Jenkins 是因为它的「**声明式流水线**」语法最清晰——理解 Jenkinsfile 就理解了「流水线 = 声明式动作链」这件事；实际项目里可以根据团队情况选其他工具。

| 平台 / 技术 | 一句话定位 | 部署形态 | 推荐场景 |
| --- | --- | --- | --- |
| **Jenkins** | 插件最多、自托管「瑞士军刀」 | 自托管 | 传统架构、需深度定制 |
| **Gitee Go** | Gitee 官方 SaaS CI/CD，国内网络友好 | SaaS | 国内网络生态 |
| **GitHub Actions** | GitHub 原生 CI/CD，模板即开即用 | SaaS | 个人 / 开源项目首选 |
| **极狐 GitLab** | 一站式 DevOps，可选 SaaS / 自管 | SaaS / 自托管 | 中小团队 All-in-One |
| **Tekton** | K8s 原生流水线即代码 | 自托管 | K8s 深度用户 |
| **Argo CD** | K8s 声明式 GitOps CD 工具 | 自托管 | 云原生 GitOps |
| **阿里云效** | 阿里云一站式研发协同，注册即用 | SaaS | 阿里云生态 |
| **腾讯云 CNB** | 腾讯云 DevOps SaaS，微信扫码即开 | SaaS | 微信、腾讯云生态 |

### 选型速记

- **Jenkins** 作为入门产品可以学习，但界面复杂、体验较差；除非考虑兼容性 / 团队技术栈基础，否则新项目不推荐。
- **GitLab / 阿里云效**功能相似，是一站式研发协同平台。小型开发团队推荐使用；**个人 / 一人公司**不推荐——产品生态丰富=功能复杂、上手困难，侧重开发协同。
- **GitHub Actions / Gitee Go / 腾讯 CNB**主要提供代码托管 + CI 服务。GitHub Actions 功能强大但需要科学上网；后两者产品完善度较差但国内网络直连。
- **Tekton / Argo CD**是云原生时代产物，设计之初就与 Kubernetes 深度结合，**基础设施即代码（IaC）**理念贯彻良好。但 Kubernetes 本身门槛高，对中小企业往往是「杀鸡用牛刀」。

### 一句话选型

- 个人开发者：GitHub Actions
- 中小企业：阿里云效 / GitLab
- 云原生 / 大型企业：Tekton、Argo CD

### 更进一步：GitOps、IaC、Runner 机制

- **GitOps**：把部署描述（YAML / Manifest）放进 Git 仓库，集群代理（Argo CD / Flux）拉取并同步——一切变更都通过 PR 完成
- **基础设施即代码（IaC）**：Terraform / Pulumi 用声明式语言描述整套基础设施（服务器、网络、数据库）
- **Runner 机制**：流水线任务实际由 Runner 执行；Runner 可以是物理机、虚拟机、容器，甚至 K8s Pod——Jenkins 的 agent / GitHub Actions 的 runner 都是这一思想的具体实践

> 注：本节是流水线工具的全景概览。GitHub Actions 作为托管式流水线的代表，在下一篇 [07 GitHub Actions](./actions.md) 中展开实战。

## 范式完整结构：从线性到并行

02 篇确立了发布流程的形式化锚点（操作清单 $Y=\{v_1,v_2,\ldots,v_n\}$），06 篇的 Jenkinsfile 正是 $Y$ 的**具体实现**——把"人记着步骤"变成"文件写明步骤 + 引擎自动执行"。

02 篇的 $f$ 是最简线性 DAG（构建 → 上传 → 验证），但流水线引擎原生支持更复杂的拓扑。**DAG 的价值在于它能表达并行**——一旦流程变复杂，线性箭头就不够用了：

```
v₁（构建）
    ├── v₂（上传华东）──── v₄（验证华东）──┐
    └── v₃（上传华北）──── v₅（验证华北）──┤
                                           v₆（全量切流）
```

$v_2$ 与 $v_3$ 之间没有边，可以并行；$v_6$ 同时依赖 $v_4$ 和 $v_5$，必须等两者都完成。这种"局部并行、整体有序"的约束，DAG 能精确表达，单纯的"$\to$"写法做不到。对应到 Jenkinsfile，`parallel` 块正是这一结构的代码化：

```groovy
stage('Deploy') {
    parallel {
        stage('华东') { steps { sh './deploy.sh cn-east' } }
        stage('华北') { steps { sh './deploy.sh cn-north' } }
    }
}
stage('全量切流') {
    steps { sh './switch-traffic.sh' }
}
```

因此，**$f$ 的完整定义**：输入变更 $x$，沿 DAG $G$ 的拓扑序依次（或并行）执行各节点，最终输出结果 $c$：

$$
f(x) = \bigl(v_n \circ \cdots \circ v_2 \circ v_1\bigr)(x) = c
\qquad \text{其中执行序满足拓扑序 } \tau
$$

**流水线引擎就是拓扑序的执行器**——Jenkins / GitHub Actions / GitLab CI 读取声明式文件，按 DAG 依赖自动调度节点的执行顺序与并行度。

## 小结

这一篇做了第三次范式升级：**手动操作 → 流水线化**。

- **Jenkinsfile** 把 03 的命令链从「ssh 上去敲」变成「写在仓库里的代码」
- 流水线引擎（Jenkins / Actions / GitLab CI）按 `git push` 自动触发、自动执行
- **运维左移**让「上线步骤」从隐性知识变成显性、可版本管理的代码——这是 IaC 思想的入门

下一步进入 [第 07 篇 · GitHub Actions](./actions.md)：Jenkinsfile 用 Groovy DSL，GitHub Actions 用 YAML，两者语法不同但「声明式动作链」的思想完全一致。GitHub Actions 是托管式流水线代表——零运维、模板即开即用，对个人开发者和开源项目尤其友好。

## 思考

1. Jenkinsfile 应该和应用代码放在同一个仓库吗？如果放在独立仓库（专门的 `infra` 仓库）有什么利弊？
2. Jenkins agent 机器也要装 Maven / JDK——这跟 05 篇「服务器变脏」是不是同一类问题？怎么解决？
3. Pipeline 跑挂了应该通知谁？只通知提交者，还是整个团队？理由是什么？
4. `post { failure { ... } }` 这一段如果通知发送本身失败了（比如 Slack 挂），你要怎么兜底？

## 参考

1. [Jenkins 官方文档](https://www.jenkins.io/doc/)
2. [Jenkinsfile 语法参考](https://www.jenkins.io/doc/book/pipeline/syntax/)
3. [Jenkins Credentials 管理](https://www.jenkins.io/doc/book/using/credentials/)
4. [GitHub Actions 文档](https://docs.github.com/en/actions)
5. [Tekton 官方文档](https://tekton.dev/docs/)
6. [Argo CD 官方文档](https://argo-cd.readthedocs.io/en/stable/)