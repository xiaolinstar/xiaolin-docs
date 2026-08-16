---
id: immutable-infrastructure
term: 不可变基础设施
en: Immutable Infrastructure
aliases:
  - 不可变基础设施
  - Immutable Infrastructure
  - immutable infrastructure
definition: 云原生核心架构理念之一。主张任何部署组件（镜像、容器、虚拟机）一旦运行即处于只读不可变状态，严禁就地修改；任何更新或修复均通过构建全新交付物替换旧实例并销毁旧环境来完成。
enabled: true
---

不可变基础设施（Immutable Infrastructure）彻底摒弃了传统运维对服务器“就地打补丁、改配置”的宠物模式，转为“只换不修”的牲畜模式。它根除了配置漂移（Configuration Drift）与雪花服务器难题，确保测试环境与生产环境 100% 绝对一致。
