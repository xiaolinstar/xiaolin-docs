---
id: pipeline-engine
term: 流水线引擎
en: Pipeline Engine
aliases:
  - Pipeline Engine
  - pipeline engine
definition: 解析流水线声明、将 Job 依赖建成 DAG，并按拓扑序负责触发、调度、执行与收尾的中间层；Jenkins、GitHub Actions 等是其具体实现。
enabled: true
---

一句话：流水线引擎 = DAG 解析器 + 拓扑序执行器 + 触发与通知中心。首次正文详解见基础篇 06。
