---
origin: docs/sre/devops/foundation/06-pipeline-basics.md
origin_url: https://xiaolinstar.cn/sre/devops/foundation/06-pipeline-basics.html
slug: pipeline-basics
account: AI持续运维
mode: repurpose+polish
status: ready
polish:
  - 2026-11-02：内容复审，压缩重复讲解，提前校验数据库配置，明确远程脚本边界；沿用已验收格式。
  - 2026-11-02：第二批格式与 CDN 图片分发按范围验收完成，LaTeX 数学排版独立第三批；已发布。
  - 2026-11-01：轻排版候选稿，精简重复论述，待微信保存及手机预览验收。
---

![AI持续运维站点鸟图](https://media.xiaolin.fun/docs/wechat-theme/ai-ops-mascot.png)

# DevOps 基础 06 ｜ 流水线基础：把运维动作写成自动化脚本

05 篇用 Docker 固化了运行环境，但上线时还有最后一步：人登录服务器，把部署命令再执行一遍。

想象这样一个上线场景：周五晚上，小张把代码合进 main，通知老李上线。老李打开终端，拉取镜像、删除旧容器、启动新容器，再检查服务是否正常。一旦漏掉一步，就要回头排查、重新执行。

Docker 统一了部署接口，却没有消除重复操作。Java、Python、Node.js 应用都可以装进镜像，但每周发两次版本，老李还是要敲两遍相同的命令。

**步骤已经标准化，下一步就是把它们自动化。** 这一篇从 shell 脚本出发，再看流水线引擎和 Jenkinsfile 分别解决什么问题。

## 先把重复命令写进文件

### 最小部署脚本

最直接的做法，是把上线动作写成 `deploy.sh`。下面是一个简化示例，假定目标服务器已安装 Docker，已登录镜像仓库，并设置好 `DB_URL`。

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${DB_URL:?DB_URL is required}"
image="your-registry/app:${VERSION:?VERSION is required}"
docker pull "$image"
if docker container inspect app >/dev/null 2>&1; then
  docker rm -f app
fi
docker run -d --name app -p 8080:8080 \
  -e DB_URL="${DB_URL:?DB_URL is required}" "$image"
sleep 5
curl -fsS http://localhost:8080/health
```

### 执行与边界

将上面的脚本保存为 deploy.sh，确认镜像地址和数据库配置已设置，再在目标服务器指定版本执行：

```bash
VERSION=1.2.0 bash ./deploy.sh
```

这是帮助理解流程的示例，执行前需要替换镜像地址并提供配置。它会删除旧容器再启动新容器，存在中断窗口；固定等待 5 秒也不能保证服务已经就绪。生产环境还需要按应用特点设计就绪检查、重试和回滚。

脚本带来的收益，是把多步操作封装为一次调用。执行者不必每次凭记忆输入命令，步骤的顺序也可以随文件一起检查和修改。

这个变化可以记作 n → 1：将 n 个步骤封装为 1 次脚本调用。减少的是外部调用次数，脚本内部的步骤与失败风险并没有消失。

> 但脚本不会自动变得可靠。`set -euo pipefail` 能暴露一部分错误，也有适用边界，不能替代健康检查与失败处理。

## 把部署拆成 job 和 step

05 篇把生产变更拆成了数据库、应用、Nginx 和验证几个 job，分别记作 J₁、J₂、J₃、J₄。每个 job 面向一个目标，内部再包含多个 step。

下标只是任务编号。变更范围 x 决定需要哪些任务，不是每次都全量执行。

例如，应用部署是一个 job；拉取镜像、启动容器、检查健康状态，是它内部的 step。先按完整目标拆分，再在目标内部明确步骤，流程就更容易检查。

不是每次发布都要跑全部 job。只改 Nginx 配置时，可以只重载 Nginx 并验证；涉及数据库结构与后端代码时，就需要检查两者的变更顺序。

对于确实存在串行依赖的任务，可以先用 shell 串起来：

```bash
./db.sh && ./app.sh && ./nginx.sh && ./verify.sh
```

这条串行路径可以记作 J₁ → J₂ → J₃ → J₄。箭头表示执行依赖，前一个任务成功后，才开始后一个。

这种写法只表达一条串行路径，并依赖每个脚本正确报告成功或失败。

当流程涉及多台机器、多个环境和并行任务时，我们需要管理的就不再只是一串命令了。

## 从串行步骤走向依赖图

假设镜像构建完成后，要分别推送到华东和华北。两地推送互不依赖，可以并行；每地推送成功后，各自部署并检查；两地检查都成功，才允许全量切流。

图中的节点编号对应这些任务：v₁ 是单元测试，v₂ 是镜像构建；v₃、v₄ 分别向华东、华北推送镜像；v₅、v₆ 分别检查两地服务；v₇ 是全量切流。

图中的两地健康检查任务包含必要的部署动作；推送成功本身不代表应用已经更新。

![两地并行发布的 DAG 依赖关系](https://media.xiaolin.fun/docs/img-pipeline-basics/wechat-dag-v1.png)

这个流程可以直接用文字读出来：

1. 先完成测试和镜像构建。
2. 华东与华北各自执行推送、部署和检查，两条分支可以并行。
3. 两条分支全部成功后，才能进入切流步骤。

这样的依赖关系，适合用有向无环图 DAG 表达。节点表示任务，有向边表示依赖。无环意味着任务不会形成相互等待的循环依赖，但并不保证任务运行时不会阻塞。

用 vᵢ → vⱼ 表示节点依赖：vⱼ 要等待 vᵢ 完成；τ 表示一个满足依赖关系的拓扑序。同一张依赖图可能有多个合法拓扑序，彼此没有依赖的分支不必固定先后。

**并行的前提是没有直接或间接的先后依赖，并且资源与并发限制允许。** 不能只看两个节点之间有没有直接连线。

Shell 也能用后台任务、`wait` 和额外逻辑实现并行。困难在于：依赖、退出状态、失败传播、取消和重试，都需要自己维护。流程越复杂，这部分调度代码就越难读。

![shell 命令流与 DAG 依赖图对比](https://media.xiaolin.fun/docs/img-pipeline-basics/infographic-shell-flow-vs-dag.png)

任务调度之外，单步可靠性也会影响整体结果：假设每一步相互独立、失败率都为 p，n 步全部成功的概率就是 (1 − p)ⁿ。当 p = 0.01 时，5 步约为 95%，15 步约为 86%。这是特定假设下的估算，不代表真实任务的失败率一定相同或相互独立。

流水线引擎把调度工作集中起来。人声明任务和依赖，引擎根据定义安排执行，并提供日志、状态和通知等能力。

## 引擎负责调度，脚本负责动作

流水线引擎通常承担几类工作：接收手动或 webhook 触发，解析流程定义，把任务交给执行节点，记录运行结果，并在结束时执行通知等操作。

它没有让脚本消失。拉镜像、部署和健康检查仍然可以写在 shell 文件里，引擎负责决定这些脚本何时运行、在哪里运行，以及失败后如何处理。

职责分开后，排查也更清楚。依赖配置错误，要检查流程定义；某个任务失败，要查看该任务的日志和脚本；执行环境缺工具，则需要检查执行节点。

Jenkins、GitHub Actions、GitLab CI 等工具都可以承担流水线编排。下面三种工具都能定义流程，但配置方式不同：

| 工具 | 流程定义方式 |
| --- | --- |
| Jenkins | 在 Jenkinsfile 中用 Groovy DSL 定义流程。 |
| GitHub Actions | 在仓库的工作流文件中用 YAML 定义流程。 |
| GitLab CI | 在 .gitlab-ci.yml 中用 YAML 定义流程。 |

GitHub Actions 的工作流文件放在 `.github/workflows/*.yml`，GitLab CI 通常使用 `.gitlab-ci.yml`。这里以 Jenkinsfile 为例，下一篇再展开 GitHub Actions。

## Jenkinsfile：把流程定义放进 Git

如果构建命令只保存在 Jenkins 页面里的文本框中，审查和迁移就需要额外安排。把流程写成仓库中的 Jenkinsfile，可以让它与业务代码一起查看差异、讨论修改和保留历史。

流程文件与业务代码可以放在同一仓库：

```text
your-app/
├── src/
├── pom.xml
├── Jenkinsfile
└── README.md
```

用这两个粒度阅读后面的流程：

- job：封装一个完整目标，例如用 `app.sh` 管理应用部署。
- step：完成具体动作，例如 `docker pull` 和 `docker run`。

下面是一个最小结构示例。`deploy.sh` 与 `verify.sh` 是仓库中需要实际提供的脚本；示例假定 agent 已具备所需工具、网络权限与凭据配置，不是一份可直接用于生产的部署方案。

```groovy
pipeline {
  agent any
  stages {
    stage('Deploy') {
      steps { sh 'bash ./deploy.sh' }
    }
    stage('Verify') {
      steps { sh 'bash ./verify.sh' }
    }
  }
}
```

这个例子只展示两个阶段的顺序关系。更复杂的流程可以继续声明并行分支，但不必在入门时一次引入全部语法。

### 从整体结构逐层展开

先看包含关系：pipeline → stages → stage → steps → 具体步骤。pipeline 包住整条流水线，stages 组织阶段，每个 stage 中的 steps 再列出具体动作。凭据绑定位于步骤内部，不是新的阶段。

下面采用“整体骨架 + 局部展开”的方式讲解。局部代码用于说明各层职责，包含重复上下文，不能顺序拼接成完整文件。

上面的最小示例就是整体骨架：agent 指定执行环境，stages 安排部署和验证两个阶段。下面分别展开。

**第一层：stages 中安排 stage**

下面截取 stages 里的一个阶段。stage 的名称帮助读者理解任务目标，steps 则列出这个阶段执行的动作。

```groovy
stage('Deploy') {
  steps {
    sh 'bash ./deploy.sh'
  }
}
```

**第二层：steps 中排列具体步骤**

再展开 steps。这里的 sh 就是一个具体步骤，用来执行 Shell 命令。多个步骤可以按顺序排列，不需要再包一层名为 step 的容器。

```groovy
steps {
  sh 'bash ./deploy.sh'
  sh 'bash ./verify.sh'
}
```

这段展示的是“同一个阶段内顺序执行两个步骤”的另一种组织方式；上面的整体示例将部署与验证分成两个阶段，两种安排不应同时照搬。

**第三层：需要凭据时，再包住相关步骤**

原文通过 withCredentials 将 SSH 凭据提供给内部步骤。下面只看它的包含位置：阶段中的 steps 包住凭据绑定，凭据绑定再包住使用密钥的 sh 步骤。

```groovy
withCredentials([sshUserPrivateKey(
  credentialsId: 'app-key',
  keyFileVariable: 'SSH_KEY'
)]) {
  sh 'bash ./remote-deploy.sh'
}
```

这段是结构片段，这里的 remote-deploy.sh 是另需实现的远程任务脚本：读取 SSH_KEY，校验目标主机身份，再通过 SSH 调用部署动作。前面的 deploy.sh 在目标服务器本地执行，不能直接替代它。Jenkins 的 sh 首先在 agent 上执行，凭据绑定本身不会自动完成远程连接。

**最后展开：sh 调用的脚本负责具体动作**

前文的 deploy.sh 已展示拉镜像、启动容器和健康检查。读流程时先确认顺序与执行位置，排查任务失败时再进入对应脚本，不必把所有命令挤进 Jenkinsfile。

### 流程进入 Git，环境仍需管理

**Jenkinsfile 管流程结构，shell 管具体动作。** 二者配合，能让部署逻辑留在代码仓库，而不只留在某个人的终端或页面配置里。

自动触发仍需要配置 webhook 或其他触发机制；凭据、插件、执行节点和工具链也需要单独管理。把 Jenkinsfile 放进 Git，不等于换一台 Jenkins 就能零配置复现环境。

同样，运行日志的保留时间取决于配置；流程进入 Git，也不代表所有 Jenkins 管理操作都自动获得完整审计记录。

## 构建与线上业务分开

引入独立的流水线平台，还有一个收益：可以让构建任务与线上业务分开使用资源。

Maven 编译、镜像构建会消耗 CPU、内存和磁盘。把这些工作直接放在生产业务服务器上，可能影响正在处理的请求。

先划分两侧的职责，再考虑如何分配机器与权限：

| 分工与边界 | 具体安排 |
| --- | --- |
| 构建与发布侧 | 准备构建产物，调度部署任务。 |
| 业务运行侧 | 运行应用，持续处理线上请求。 |
| 资源隔离 | 避免编译与镜像构建争抢线上 CPU、内存和磁盘。 |
| 故障影响 | 流水线平台故障会影响新版本发布，已运行的业务应尽量独立。 |
| 权限与凭据 | 两侧分别按需授权；业务侧仍可能需要拉取镜像的凭据。 |

这些边界需要靠部署与授权落实。规模扩大后，还可以继续将 Jenkins controller 的协调职责与 agent 的执行职责分开。

## 运维左移：把交接内容变成可执行定义

传统的交接方式，是开发提交应用和部署文档，运维读文档后执行。上线结果很大程度上依赖执行者有没有理解并记住每个细节。

![传统运维交接与运维左移对比](https://media.xiaolin.fun/docs/img-pipeline-basics/infographic-traditional-ops.png)

当部署脚本和 Jenkinsfile 与业务代码一起进入仓库，交接内容就多了一层可执行定义：代码告诉工具该做什么，人通过 review 检查目标环境、版本、凭据引用和验证条件。

开发与运维仍然需要协作。开发可以维护应用相关的构建和检查逻辑；运维或平台人员审核生产权限、发布条件与回滚安排。职责可以调整，但不会因为有了流水线就自然消失。

Jenkinsfile 是流水线即代码的一种形式，与基础设施即代码共享版本管理和代码审查的思路，但不能替代 Terraform 等工具对基础设施资源的管理。

回到开头的上线场景：老李需要做的，可以从逐条输入命令，变成检查变更、确认发布条件，再由引擎执行经过审查的流程。是否自动进入生产，则由团队明确的触发与审批规则决定。

## 小结

06 篇从一组重复的上线命令出发：先用 shell 固化单个任务，再用依赖关系组织多个任务，最后交给流水线引擎调度。Jenkinsfile 让流程定义进入 Git，便于审查与追溯。自动化减少了临场操作，但可靠发布仍依赖脚本、环境、凭据、健康检查和回滚设计。

## 延伸阅读：自动执行之后，如何可靠发布

### 失败后重试，为什么可能越试越错

本文把多步操作封装成脚本，但任务超时不代表它没有执行成功。直接重跑，可能重复创建资源或重复执行数据库变更。下一步值得了解的是幂等：如何让重复执行不产生额外副作用。

推荐阅读文末资料中的 Making retries safe with idempotent APIs。它以 API 为例说明重试与副作用的关系；先理解“结果未知”与“安全重试”，再思考如何应用到部署任务，不必在本篇深入其具体实现。

### 流水线跑成功，为什么还不能立即全量发布

本文的 DAG 最后汇聚到全量切流，但检查通过不代表新版本在真实流量下没有问题。金丝雀发布先让少量流量使用新版本，观察后逐步扩大，并保留退回旧版本的路径。

推荐阅读文末资料中的 Canary Release。本篇先理解控制影响范围的思路：何时扩大流量、观察什么、何时停止；具体实现留到后续。

### 参考资料

Jenkinsfile 语法参考：https://www.jenkins.io/doc/book/pipeline/syntax/

基础设施即代码（IaC）概览：https://en.wikipedia.org/wiki/Infrastructure_as_code

幂等 API 与安全重试：https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/

GitHub Actions 文档：https://docs.github.com/en/actions

Canary Release：https://martinfowler.com/bliki/CanaryRelease.html

---

下一篇，我们用 GitHub Actions，把这套流程放进实际项目。

你现在的部署流程里，还有哪一步依赖某个人记住？

本文的完整图示与示例见站点原文，点击文末“阅读原文”查看。
