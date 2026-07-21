---
id: pipeline
term: 流水线
en: Pipeline
aliases:
  - Pipeline
  - CI/CD 流水线
definition: 将软件从代码提交到最终交付的各阶段（构建、测试、部署等）自动化串联的有序步骤序列，确保每次变更以可重复、可审计的方式完成交付。
enabled: true
---

源自 Jez Humble 与 David Farley 所著《Continuous Delivery》中的 Deployment Pipeline 概念，是 CI/CD 实践的核心结构单元。每个阶段对变更进行一轮验证，只有通过才能进入下一阶段。本系列后文中的 Jenkins、GitHub Actions 均是流水线引擎的具体实现。
