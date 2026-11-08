---
id: compose-service
term: 服务（Compose）
en: Service
aliases:
  - Compose Service
  - service（Compose）
definition: Compose Specification 中的逻辑运行单元：一个服务对应一组共享同一镜像与配置的容器实例，通过网络、卷与 depends_on 等与其他服务组成应用。
enabled: true
---

勿与流水线 Job 混淆：Service 描述「应用里跑什么」；Job 描述「交付流程跑哪一步」。
