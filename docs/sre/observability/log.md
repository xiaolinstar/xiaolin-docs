---
title: 软件系统日志
description: |
  在当今数字化浪潮汹涌澎湃的时代，数据已然成为企业与组织的“生命线”，而日志作为数据的重要组成部分，犹如隐藏在系统深处的“宝藏”，记录着每一个微小的运行细节与关键事件。
date: 2026-03-28
updated: 2026-03-28
category: SRE 运维
tags:
  - 可观测性
---

# 软件系统日志

## 前言

在当今数字化浪潮汹涌澎湃的时代，数据已然成为企业与组织的“生命线”，而日志作为数据的重要组成部分，犹如隐藏在系统深处的“宝藏”，记录着每一个微小的运行细节与关键事件。

然而，海量且分散的日志数据往往如同散落的珍珠，难以被有效串联与挖掘，这使得许多组织在面对复杂多变的业务需求与运维挑战时，犹如盲人摸象，难以精准洞察全局态势。

本文从日志功能入手，思考为什么需要构建日志中心？

## 日志

日志数据是各种系统和应用程序运行时生成的信息。这些数据包括系统事件、错误消息、性能指标和用户活动。例如，日志能够记录故障以及故障发生的事件，便于随后居于此代码中查找错误，从而解决问题。每个日志都带有时间戳，并显示在特定时间点发生的事件。

日志可以现实操作系统中发生的事件，如连接尝试、错误和配置变更等。这些类型的日志被统称为系统日志。

与此不同，应用程序日志显示的是应用程序软件堆栈（特别是专用代理、防火墙以及其他软件应用程序）内所发生事件的信息。这些类型的日志会记录软件的更改、CRUD 操作，应用程序身份验证等信息。

日志的主要作用是帮助系统管理员、开发人员和运维人员监控系统运行情况、排查问题、分析性能瓶颈、进行安全审计以及支持业务决策。日志的特点：

* 时效性：记录系统在特定时间点或时间段内的运行状态、事件和行为；
* 顺序性：按照事件发生的先后顺序生成的，记录了系统的运行轨迹；
* 信息丰富性：记录了系统运行的详细信息，包括事件类型、操作结果、错误信息、用户行为、系统状态等；
* 不可变性：日志一旦生成，其内容通常不应被修改，以保证记录的真实性和完整性；
* **大量性**：系统运行过程中会产生大量的日志数据，尤其是在高并发和复杂的业务场景下；
* 多样性：日志的格式和内容因系统、框架和业务需求而异，常见的有文本日志、JSON 格式日志、二进制日志等；
* **分布式特性**：在分布式系统中，日志可能分散在多个节点上，需要集中管理和分析；
* 重要性分级：通常根据重要性分为不同的级别，如 DEBUG、INFO、WARN、ERROR 等。

从业务与 IT 系统软件开发工程师视角，可以将日志简单分为两类：**基础设施与框架日志**和**业务与应用自定义日志**。

### 基础设施与框架日志

由操作系统、数据库、开发框架或中间件（由水平极高的开发者定义、服务供应商）生成的日志，主要用于记录系统运行状态、配置信息、性能指标以及底层框架的运行情况。

软件开发工程师不需要手动编写这部分日志，但需要关注它们以排查问题。其特点包括：

* **自动生成**：由框架或中间件自动记录，无需手动编写；
* **标准化**：格式和内容通常由框架或中间件定义，具有统一的规范；
* **底层信息**：主要记录系统层面的信息，如启动、错误、性能等。

例如 Spring 日志、Redis 日志、Nacos 日志、MySQL 日志、Nginx 日志。

Spring 日志：

```text
2025-05-28 10:00:00 [main] INFO  o.s.b.SpringApplication - Starting application on localhost with PID 12345
2025-05-28 10:00:05 [main] ERROR o.s.b.SpringApplication - Application run failed
java.lang.NullPointerException: Some error occurred
at com.example.service.MyService.doSomething(MyService.java:42)
```

MySQL 日志：

```text
2025-05-28 22:41:25 2025-05-28 22:41:25+08:00 [Note] [Entrypoint]: Entrypoint script for MySQL Server 8.4.3-1.el9 started.
2025-05-28 22:41:26 2025-05-28 22:41:26+08:00 [Note] [Entrypoint]: Switching to dedicated user 'mysql'
2025-05-28 22:41:26 2025-05-28 22:41:26+08:00 [Note] [Entrypoint]: Entrypoint script for MySQL Server 8.4.3-1.el9 started.
2025-05-28 22:41:27 '/var/lib/mysql/mysql.sock' -> '/var/run/mysqld/mysqld.sock'
2025-05-28 22:41:27 2025-05-28T14:41:27.128286Z 0 [System] [MY-015015] [Server] MySQL Server - start.
2025-05-28 22:41:27 2025-05-28T14:41:27.393086Z 0 [System] [MY-010116] [Server] /usr/sbin/mysqld (mysqld 8.4.3) starting as process 1
2025-05-28 22:41:27 2025-05-28T14:41:27.401134Z 0 [Warning] [MY-010159] [Server] Setting lower_case_table_names=2 because file system for /var/lib/mysql/ is case insensitive
2025-05-28 22:41:27 2025-05-28T14:41:27.479811Z 1 [System] [MY-013576] [InnoDB] InnoDB initialization has started.
2025-05-28 22:41:31 2025-05-28T14:41:31.116967Z 1 [System] [MY-013577] [InnoDB] InnoDB initialization has ended.
2025-05-28 22:41:32 2025-05-28T14:41:32.797247Z 0 [Warning] [MY-010068] [Server] CA certificate ca.pem is self signed.
2025-05-28 22:41:32 2025-05-28T14:41:32.797813Z 0 [System] [MY-013602] [Server] Channel mysql_main configured to support TLS. Encrypted connections are now supported for this channel.
2025-05-28 22:41:33 2025-05-28T14:41:33.052484Z 0 [Warning] [MY-011810] [Server] Insecure configuration for --pid-file: Location '/var/run/mysqld' in the path is accessible to all OS users. Consider choosing a different directory.
2025-05-28 22:41:33 2025-05-28T14:41:33.171347Z 0 [System] [MY-011323] [Server] X Plugin ready for connections. Bind-address: '::' port: 33060, socket: /var/run/mysqld/mysqlx.sock
2025-05-28 22:41:33 2025-05-28T14:41:33.171484Z 0 [System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. Version: '8.4.3'  socket: '/var/run/mysqld/mysqld.sock'  port: 3306  MySQL Community Server - GPL.
```

### 业务与应用自定义日志

由软件开发工程师在编写业务代码时手工编写的日志，主要用于记录业务逻辑的执行过程、用户操作、业务数据等。

这部分日志是开发工程师根据具体需求编写的，具有很强的针对性。其特点包括：

* **手动编写**：由开发工程师根据业务需求编写；
* **针对性强**：记录业务逻辑的关键信息，便于调试和分析；
* **格式灵活**：可以根据业务需求自定义日志格式和内容。

例如业务操作日志、调试日志、性能日志。

在业务代码中自定义日志：

> MyBatisPlus 自动填充插件

```java
/**
 * @author xingxiaolin xing.xiaolin@foxmail.com
 * @Description MybatisPlus 自动填充插件
 * @create 2024/7/8
 */
@Component
@Slf4j
public class MyMetaObjectHandler implements MetaObjectHandler {


    /**
     * 插入操作自动填充
     * @param metaObject 元对象
     */
    @Override
    public void insertFill(MetaObject metaObject) {
        log.info("公共字段自动填充[insert]...");
        log.info(metaObject.toString());
        metaObject.setValue("createTime", LocalDateTime.now());
        metaObject.setValue("updateTime", LocalDateTime.now());
        metaObject.setValue("createdByUserId", ContextUtil.getUserId());
        metaObject.setValue("updatedByUserId", ContextUtil.getUserId());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        log.info("公共字段自动更新[update]...");
        log.info(metaObject.toString());
        metaObject.setValue("updateTime", LocalDateTime.now());
        metaObject.setValue("updatedByUserId", ContextUtil.getUserId());
    }
}
```

服务执行时，日志输出：
```text
2025-05-28 22:41:27 公共字段自动填充[insert]...
2025-05-28 22:41:27 MetaObject [originalObject=cn.xiaolin.xiaolinblog.entity.User@7322328d, metaObject=org.apache.ibatis.reflection.MetaObject@4662312a, metaClass=class cn.xiaolin.xiaolinblog.entity.User]
2025-05-28 22:41:27 公共字段自动更新[update]...
2025-05-28 22:41:27 MetaObject [originalObject=cn.xiaolin.xiaolinblog.entity.User@7322328d, metaObject=org.apache.ibatis.reflection.MetaObject@4662312a, metaClass=class cn.xiaolin.xiaolinblog.entity.User]
```
记录上述日志可用于调试数据库插入和更新时自动字段填充功能。

## 功能和作用

影视剧导演总喜欢用这样的镜头体现黑客的专业性与神秘性：一名电脑黑客屏幕上密密麻麻持续输出海量文本，背景是黑色的，专注地盯着屏幕！

> 使用“豆包AI”根据上述语言描述生成图像

![黑客镜头](https://media.xiaolin.fun/docs/img-log/log-hacker.png)

其实可能就执行了一条指令：

```shell
tail -f /var/log/myapp.log
```

依据笔者的开发和运维工作经验，基础日志使用场景：

1. 健康巡检：版面发布后检查异常日志；
2. 故障诊断：记录故障现场，用于故障发生后运维专家或开发人员介入；
3. 审计需要：安全部门与审计部门要求；

进阶使用场景：

1. 故障预警：在很多场景中，系统故障是累计的结果（量变到质变），发生前会输出异常日志；
2. 数据挖掘：从海量日志中挖掘有效信息，大数据分析。

## 总结

日志作为系统运行的重要记录，分为基础设施与框架日志（自动生成、标准化，如 Spring、MySQL 日志）和业务与应用自定义日志（手动编写、针对性强）。日志具有时效性、顺序性等特点，在健康巡检、故障诊断、安全审计等基础场景，以及故障预警、数据挖掘等进阶场景中作用关键。