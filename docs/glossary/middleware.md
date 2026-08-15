---
id: middleware
term: 中间件
en: Middleware
aliases:
  - Middleware
  - 中间件服务
definition: 位于操作系统与应用进程之间、为业务提供通用能力的支撑服务（如缓存、消息队列、数据库、搜索），本身不直接面向终端用户，但应用进程一旦连不上，对用户呈现的故障与进程宕机无异。
enabled: true
---

典型例子：Redis（缓存）、Kafka（消息队列）、MySQL（数据库）、Elasticsearch（搜索）。运维上常把 DB 单列为「数据持久化层」，与狭义中间件区分；广义中间件则包含一切位于操作系统和应用之间的服务。