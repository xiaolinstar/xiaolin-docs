---
id: infrastructure-as-code
term: 基础设施即代码
en: Infrastructure as Code (IaC)
aliases:
  - IaC
  - Infrastructure as Code
  - 基础设施即代码（IaC）
definition: 用版本化的声明文件（而非手工点击与口口相传）描述并管理基础设施与运行拓扑，使变更可审查、可复现、可回滚。
enabled: true
---

Jenkinsfile / Actions YAML 是流水线即代码，与 compose.yaml 共享版本化、可审查的方法，但职责不同：前者描述交付流程，Compose 文件才是应用拓扑的 IaC 落点。首次对照见基础篇 06。
