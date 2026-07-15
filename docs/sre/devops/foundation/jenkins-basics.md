---
title: 06 ｜ 流水线入门：Jenkins 与 Jenkinsfile
description: 把 04 篇的手动运维动作（pull → build → deploy → healthcheck）流水线化——用 Jenkinsfile 把动作写进代码仓库，运维左移到开发。
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

04 篇的服务器动作链还是手动的：

```bash
ssh ubuntu@server
cd /var/www/my-site
git pull
mvn package          # 或 pip install
sudo systemctl restart myapp
sleep 5 && curl -fsS http://localhost:8080/health
```

每一步都要登录服务器、复制粘贴命令；漏一步就出问题，**上线靠记忆**。

这一篇要做的事：**把 04 的动作链流水线化**——用一个声明式文件描述「要做哪些动作」，**每次 `git push` 自动执行**。带来的不只是「少敲几次命令」，而是**运维动作可版本管理、可 Code Review、可沉淀**——这就是「**运维左移**」（Shift Left）。

这一篇以 **Jenkins** 作为流水线引擎为代表。它不是唯一的工具，但**Jenkinsfile** 的语法清晰展示了「声明式流水线」的核心理念。

## 流水线是什么

**流水线**（Pipeline）是「一组运维动作按顺序串起来，按触发条件自动执行」。三个关键属性：

| 属性 | 说明 |
| --- | --- |
| **顺序** | 动作有先后（先拉代码、再构建、再部署） |
| **触发** | 谁来启动它——`git push` / 定时 / 手动 |
| **可声明** | 动作描述在文件里，不是每次手敲 |

把流水线对应回 02 篇的范式：

$$
\forall x \in X, \quad f(x) = c
$$

**流水线就是 $f$ 的具体实现**——动作结构稳定，输入是 `$x$`（代码变更），输出是 `$c$`（部署成功）。手动的 $f$ 是「人在脑子里记着步骤」，流水线化的 $f$ 是「文件里写明步骤 + 引擎自动执行」。

Pipeline（首字母大写）特指具体工具：**Jenkins Pipeline / GitHub Actions / GitLab CI**。它们都遵循上面这三个属性，只是语法不同。

## Jenkinsfile：从手动命令到声明式代码

**Jenkinsfile** 是 Jenkins 流水线的声明文件——把 04 篇的「ssh 上去敲命令」写成一个文本文件，由 Jenkins 引擎读取并执行。

一个对应 04 篇 Spring Boot 部署的 Jenkinsfile：

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

Jenkins 的 agent 机器跑 `mvn package` 这一步，**它自己也得有 Maven / JDK**——这正是 04 篇「服务器变脏」的翻版，只不过现在「脏」的是 Jenkins agent，不是生产服务器。

后续篇章会用**容器化 agent**（`agent { docker { image 'maven:3.9' } }`）来解决——agent 启动时拉一个带 Maven 的镜像，pipeline 跑完即销毁。这正好把 04 学到的容器知识用到 Jenkins 上。

### 4. 流水线失败时日志去哪查

- Jenkins 控制台：每次流水线运行有完整 stdout / stderr 日志
- **保留策略**：默认保留 30 天；可调成「保留所有」+ 配置磁盘清理策略
- 通知：装 **Email / Slack / 企业微信插件**，失败时自动推

## 工具选型对比（附录）

Jenkins 不是唯一的流水线引擎。常见选项对比：

| 工具 | 部署方式 | 语言 | 插件生态 | 上手成本 | 适合谁 |
| --- | --- | --- | --- | --- | --- |
| **Jenkins** | 自托管（Java 进程） | Groovy DSL（Jenkinsfile） | 极丰富（1500+） | 中等 | 企业、强控制需求、复杂流水线 |
| **GitHub Actions** | 托管（GitHub 内置） | YAML | 丰富（Marketplace） | 低 | 开源项目、个人 / 小团队 |
| **GitLab CI** | 自托管或 SaaS | YAML | 丰富 | 低 | 用 GitLab 的团队 |
| **CircleCI** | SaaS | YAML | 中等 | 低 | 海外团队、SaaS 优先 |
| **Drone** | 自托管（容器化） | YAML | 中等 | 低 | 容器化偏好、轻量部署 |

**Jenkins 的位置**：自托管老牌、企业常用、插件多到「什么都能做」、但也因此「什么都要配」。新项目越来越多直接上 GitHub Actions / GitLab CI。**这一系列选 Jenkins 是因为 Jenkinsfile 是声明式流水线语法最清晰的一个，写一次就能理解「流水线 = 声明式动作链」这件事。**

## 小结

这一篇做了第三次范式升级：**手动运维动作 → 流水线化**。

- **Jenkinsfile** 把 04 的命令链从「ssh 上去敲」变成「写在仓库里的代码」
- 流水线引擎（Jenkins / Actions / GitLab CI）按 `git push` 自动触发、自动执行
- **运维左移**让「上线步骤」从隐性知识变成显性、可版本管理的代码——这是 IaC 思想的入门

下一步进入 [第 07 篇 · 多服务容器编排](./docker-compose.md)：06 把「手动」变成「自动」，但还是「单容器」。当你的应用需要 Nginx 反代 + 应用本身 + 数据库 + 缓存一起协作时，**多个容器如何用一份声明式 YAML 一起管理**？那是 docker-compose 的领域——它和 Jenkinsfile 一样是「声明式 + 写在仓库 + Git 版本管理」思想的进一步实践。

## 思考

1. Jenkinsfile 应该和应用代码放在同一个仓库吗？如果放在独立仓库（专门的 `infra` 仓库）有什么利弊？
2. Jenkins agent 机器也要装 Maven / JDK——这跟 04 篇「服务器变脏」是不是同一类问题？怎么解决？
3. Pipeline 跑挂了应该通知谁？只通知提交者，还是整个团队？理由是什么？
4. `post { failure { ... } }` 这一段如果通知发送本身失败了（比如 Slack 挂），你要怎么兜底？

## 参考

1. [Jenkins 官方文档](https://www.jenkins.io/doc/)
2. [Jenkinsfile 语法参考](https://www.jenkins.io/doc/book/pipeline/syntax/)
3. [Jenkins Credentials 管理](https://www.jenkins.io/doc/book/using/credentials/)
4. [GitHub Actions 文档](https://docs.github.com/en/actions)