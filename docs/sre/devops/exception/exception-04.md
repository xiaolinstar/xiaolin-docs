---
title: Exception异常架构设计：异常处理（04）
description: 在前三篇中，已经讨论了：异常设计原则、异常分类模型、异常抛出策略。
date: 2026-02-13
updated: 2026-02-13
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 异常处理
---


在前三篇中，已经讨论了：异常设计原则、异常分类模型、异常抛出策略。本篇回答两个个更重要的问题：

* 异常在系统中如何流动？
* 异常应该在哪里被处理？

异常处理，本质是架构边界设计。

## 异常处理的基本原则

异常处理核心架构准则是：**决策中心化处理，流经过程保持透明。**

### 战略性晚处理 (Strategic Catching)

异常应尽可能传递到具备「决策能力」的层级再处理。

* **中间层级（如 Repository/转发层）** 通常不具备业务决策权，只需让异常透明穿透。
* **最终处理层（如 Service/Global Handler）** 拥有全局视野，能决定是重试、执行降级逻辑，还是反馈给用户。
* **核心价值：** 避免业务处理逻辑碎片化，让异常治理逻辑收敛。

### 禁止隐式消化 (No Swallowing)

除非明确知道该异常可以被安全忽略，否则绝不允许捕获后不采取任何行动。

* 处理必须产生副作用：要么**业务恢复**（Retry/Fallback），要么**语义转换**（Wrap），要么**证据留存**（Log）。
* 任何空的 `try-except` 都是系统的隐患，会导致系统进入「不可知的故障状态」。

### 带上下文的语义转换 (Context Enrichment)

在涉及跨架构边界捕获异常时，应赋予其更清晰的业务内涵。

* **规则：** 将技术驱动的异常（如 `TimeoutError`）转换为业务驱动的异常（如 `ExternalServiceUnavailable`）。
* **要求：** 转换时必须保留原始异常链（Root Cause），并补充关键业务上下文（如 `order_id`），以便高层决策和排查。

### 收敛出口 (Single Exit)

系统最终应对外呈现单一的异常出口（Global Handler）。

* 统一处理所有未被消化的异常，负责响应格式化、错误日志审计以及内部堆栈脱敏。
* 确保系统不会因为细碎的本地处理而产生不一致的错误反馈模型。

## 异常的流动路径

> 外部请求如 REST API、RPC、消息队列等视为平台层，类比 Repository 层

在典型三层架构（Controller-Service-Repository）中，用户请求链路：

```text
Client -> Controller -> Service -> Repository -> Database
```

异常流链路：

```text
Database → Repository → Service → Controller → ErrorHandler
```

当然，最深处的异常在 Database 层，任何一层都可以发生异常，快速失败。

异常的流动模型如下，从调用堆栈的角度理解：

```text
Client
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↑
Exception
  ↑
Global Error Handler
  ↑
Client
```

异常自下而上冒泡，最终在统一出口收敛。这是异常的「漏斗模型」：

* 底层负责报告问题；
* 中层负责理解语义；
* 高层负责统一出口。

## 分层职责边界

异常处理是否清晰，取决于分层是否清晰。

### Repository —— 技术问题的报告者

Repository 层只负责技术访问：

* 数据库
* 缓存
* 文件系统
* 第三方 SDK

它不具备业务语义，因此它的职责只有一个：如实上抛技术异常。它不应：转换为业务异常、屏蔽底层异常、做业务推断。

底层只负责「报告」，不负责「解释」。

### Service —— 语义的转换层

Service 是唯一同时理解：技术语义、业务语义的层级。

因此，异常的语义转换必须发生在 Service 层。它负责：

* 异常上抛：将技术异常转换为业务语义异常
* 异常消化：进行补救或降级

Service 是异常语义的边界。

### Controller —— 透明传递层

Controller 的职责应保持最小化：接收请求、调用 Service、返回结果。Controller 不应承担异常处理逻辑。如果 Controller 开始处理异常，说明分层已经被破坏。

**Controller 应保持透明。**

### 全局异常处理层 —— 唯一出口

> 开发框架中如SpringBoot中全局异常处理层属于拦截器 Interceptor

所有未被 Service 消化的异常，最终汇聚到统一的异常处理层。它的职责包括：分类异常、统一输出结构、屏蔽内部实现细节、保证对外语义一致。

一个系统只能有一个异常出口。如果异常在多个地方被分散处理，错误模型会迅速失控。

### 职责汇总

| 层级             | 角色    | 核心职责    |
| -------------- | ----- | ------- |
| Repository     | 技术报告者 | 上抛技术异常  |
| Service        | 语义转换者 | 防御消化异常，或语义转换并上抛业务异常 |
| Controller     | 透明传递者 | 不处理异常，仅透传   |
| Global Handler | 统一出口  | 统一分流与输出 |

因此，异常处理仅发生在2个部分：

* Service 层：重试、降级，但建议也同步向上抛出异常；
* Global Handler：统一对异常进行分流与输出。

## 声明式异常处理

异常处理有2种方式：

* 编程式异常处理：try-except 异常碎片化
* 声明式异常处理：errorhandler 异常中心化

### ❌ 不推荐：try-except 异常碎片化

这种方式会导致业务逻辑被模板代码淹没，且每个接口返回的错误格式可能不一致。

```python
# Service 层
def get_user(user_id):
    try:
        return db.find_user(user_id)
    except DBError as e:
        # 在这里记录日志
        logger.error(e)
        # 还要决定返回什么
        return None

# Controller 层
@app.get("/users/{id}")
def handle_get_user(id):
    user = service.get_user(id)
    if user is None:
        return {"code": 404, "msg": "用户没找到"} # 业务逻辑和错误处理混在一起
    return user
```

### ✅ 推荐：errorhandler 声明式异常处理

业务代码只关注「正确路径」，异常由框架统一兜底。

```python
# --- 1. 业务代码保持「干净」 ---

# Service 层：只负责抛出，不负责捕获
def get_user(user_id):
    user = db.find_user(user_id)
    if not user:
        # 直接抛出自定义业务异常，不写 try-except
        raise ResourceException(f"User {user_id} not found")
    return user

# Controller 层：透明转发，完全不写 try-except
@app.get("/users/{id}")
def handle_get_user(id):
    return service.get_user(id)

# --- 2. 全局异常处理器：统一收敛逻辑 ---

@app.exception_handler(AppBaseException)
async def global_exception_handler(request, exc: AppBaseException):
    # 1. 统一记录日志（证据留存）
    logger.error(f"Path: {request.url} | Error: {exc.message} | Code: {exc.error_code}")
    
    # 2. 统一返回格式（收敛出口）
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.message,
            "request_id": request.state.request_id # 链路追踪
        }
    )
```

这种方式是非常合理的，它的核心价值在于：

* 逻辑解耦：Service 层只需表达「我想做什么」和「什么条件下我不做了」，而不需要关心「报错后前端要看什么样式的 JSON」。
* 保证一致性：整个系统数千个接口，通过一个 Global Handler 就能保证输出的 JSON 结构、状态码规范、脱敏规则完全统一。
* 减少代码腐烂：避免了 try-except 块带来的代码缩进嵌套，使业务主流程（Happy Path）清晰可见。
* 强制 Fail-Fast：一旦出现问题立即中断，异常携带完整的堆栈冒泡，不会出现「虽然报错了但代码还在往后跑」导致的脏数据。

这种异常处理方式为**可观测性**和**异常治理**奠定了基础。

## 总结

异常处理不是语法技巧，而是架构设计。成熟系统的标志，不是「没有异常」，而是：

* 异常可以被清晰地记录；
* 异常可以被统一地收敛；
* 异常不会破坏分层边界。

当异常的流动路径清晰，系统复杂度才是可控的。至此，异常架构设计的五部分已经全部设计完毕。下一篇，将继续讨论异常架构设计如何编程落地到软件项目中。