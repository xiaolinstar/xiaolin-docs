---
id: desired-state
term: 期望状态
en: Desired State
aliases:
  - Desired State
  - desired state
  - 期望配置
definition: 声明式配置所描述的「系统应然样貌」；引擎负责将实际状态向该描述收敛，而不是由人逐步下达命令式操作序列。
enabled: true
---

Compose 的 `docker compose up` 即按 compose.yaml 的期望状态创建或更新服务；更完整的持续 reconciliation loop 是 Kubernetes 等系统的强化形态。
