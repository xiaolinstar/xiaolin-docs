---
title: Exception异常编程实践：异常模块规划（06）
description: 在前五篇中，我们完成了异常架构设计的理论体系：从四项核心原则出发，经历了异常基础、异常分类、异常抛出、异常处理，最终在系统性总结中将其融为一体。
date: 2026-04-19
updated: 2026-04-19
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

# Exception异常编程实践：异常模块规划（06）

在前五篇中，我们完成了异常架构设计的理论体系：从[四项核心原则](exception-00.md)出发，经历了[异常基础](exception-01.md)、[异常分类](exception-02.md)、[异常抛出](exception-03.md)、[异常处理](exception-04.md)，最终在[系统性总结](exception-05.md)中将其融为一体。

从本篇开始，进入**异常编程实践**系列，将架构设计思想落地到代码中。第一步，是对异常模块进行规划：**异常不应该是写到哪算哪的补丁，而应该是项目初期就被设计好的基础设施。**

## 为什么异常需要独立模块

在服务端项目开发中，项目结构是被提前规划的：

```text
src/
├── controller/      # 接口层
├── service/         # 业务逻辑层
├── repository/      # 数据访问层
├── exception/       # 异常模块
└── const/           # 常量层
```

`controller`、`service`、`repository` 的拆分是大多数开发者的共识，但 `exception` 往往被忽视。常见的反模式是：

- **散落各处**：`ValidationError` 写在 Controller 里，`InsufficientBalanceError` 写在 Service 里，`DBConnectionError` 写在 Repository 里。想找一个异常类？全局搜索。
- **一类兜底**：全项目只有一个 `AppException`，所有错误场景都用它，`error_code` 靠字符串区分。无法利用类型继承做分层捕获。
- **随写随定义**：每个开发者的异常风格不同，有人用 `dataclass`，有人用传统类，有人甚至用字典代替异常。

这些做法直接违反了我们在前面系列中确立的原则：

- 违反 **收敛出口**（04篇）：异常定义散落导致处理逻辑碎片化
- 违反 **分类即治理**（02篇）：没有层次结构，无法按类型差异化处理
- 违反 **可观测性**（00篇）：异常缺乏统一的错误码和结构化输出

因此，异常需要作为**独立模块**进行统一规划——就像数据库的 Schema 需要提前设计，异常的"Schema"也不例外。

## 异常文件结构

一个完整的 `exception/` 模块，推荐如下结构：

```text
exception/
├── __init__.py           # 统一导出，方便外部 import
├── base.py               # AppBaseException 基类
├── client.py             # 客户端异常：ValidationException, AuthException...
├── business.py           # 业务异常：BizException, ResourceException...
├── server.py             # 服务端异常：InfrastructureException, UnknownException...
├── error_codes.py        # 错误码常量枚举（集中管理）
└── handler.py            # 全局异常处理器（errorhandler 注册）
```

### 文件拆分原则

异常文件按什么维度拆分？有两种常见方案：

**方案A：按责任方拆分**（推荐）

```text
client.py    → 客户端异常（4xx）
business.py  → 业务异常（299）
server.py    → 服务端异常（5xx）
```

**方案B：按业务模块拆分**  

```text
order_exceptions.py   → 订单相关异常
user_exceptions.py    → 用户相关异常
payment_exceptions.py → 支付相关异常
```

两种方案的对比：

| 维度 | 按责任方拆分 | 按业务模块拆分 |
| --- | --- | --- |
| 与02篇分类模型的一致性 | ✅ 完全一致 | ❌ 偏离分类体系 |
| 全局异常处理器的编写 | ✅ 简单，按层级捕获 | ⚠️ 需逐模块注册 |
| 异常的复用性 | ✅ 高，`ValidationException` 可复用 | ❌ 低，每个模块各搞一套 |
| 文件数量可控性 | ✅ 固定3-4个文件 | ⚠️ 随业务增长文件膨胀 |
| 适用场景 | 中小型项目、微服务 | 超大型单体项目 |

**推荐方案A**。原因很简单：异常的本质是**按责任方分流处理**，而非按业务领域。一个 `ValidationException` 不管是订单模块还是用户模块抛出的，处理方式是一样的：返回 4xx + 友好提示。

### 大型项目的扩展方案

当项目规模增长，单个 `client.py` 中可能积累了十几个异常类，此时可以将文件升级为**二级目录**：

**扩展方案一：按责任方建立子目录**  

```text
exception/
├── __init__.py
├── base.py
├── client/                          # 客户端异常子模块
│   ├── __init__.py                  # 导出该子模块所有异常
│   ├── validation.py                # ValidationException, ParamMissingException...
│   ├── authentication.py            # AuthenticationException, TokenExpiredException...
│   └── authorization.py             # AuthorizationException, RoleNotFoundException...
├── business/                        # 业务异常子模块
│   ├── __init__.py
│   ├── order.py                     # OrderStatusException, OrderExpiredException...
│   ├── account.py                   # InsufficientBalanceException, AccountFrozenException...
│   └── resource.py                  # ResourceNotFoundException, ResourceOccupiedException...
├── server/                          # 服务端异常子模块
│   ├── __init__.py
│   ├── infrastructure.py            # DBConnectionException, CacheException...
│   ├── external.py                  # ExternalTimeoutException, ExternalUnavailableException...
│   └── unknown.py                   # UnknownException
├── error_codes.py
└── handler.py
```

子目录的 `__init__.py` 负责向上导出，保证顶层 `__init__.py` 的导入方式不变：

```python
# exception/client/__init__.py
from .validation import ValidationException, ParamMissingException
from .authentication import AuthenticationException, TokenExpiredException
from .authorization import AuthorizationException

# 顶层 exception/__init__.py 写法不变
from .client import ValidationException, AuthenticationException, AuthorizationException
```

这样做的好处是：**外部调用方的导入方式完全不受影响**，目录结构的调整是内部重构，对外透明。

**扩展方案二：一类一文件**  

在 Java 中，**一个类对应一个源文件**是语言强制的规范。在 Python 中虽然没有这个约束，但在异常类数量较多时，也可以采用类似策略：

```text
exception/
├── __init__.py
├── base.py
├── client/
│   ├── __init__.py
│   ├── validation_exception.py      # 仅包含 ValidationException
│   ├── authentication_exception.py  # 仅包含 AuthenticationException
│   └── authorization_exception.py   # 仅包含 AuthorizationException
├── business/
│   ├── __init__.py
│   ├── biz_exception.py
│   ├── resource_exception.py
│   └── state_exception.py
└── ...
```

两种扩展方案的对比：

| 维度 | 子目录 + 按职责聚合 | 子目录 + 一类一文件 |
| --- | --- | --- |
| Python 风格 | ✅ 更 Pythonic | ⚠️ 偏 Java 风格 |
| 文件数量 | 适中 | 较多 |
| 单文件可读性 | 一个文件包含相关异常，一目了然 | 每个文件极简，但需频繁跳转 |
| 代码审查 | 修改一类异常只涉及一个文件 | 新增异常需新建文件 + 更新 `__init__.py` |
| 适用场景 | Python 大型项目 | Java 项目，或团队有 Java 背景 |

> Python 社区惯例是**相关类聚合在同一模块文件**中（如标准库 `http.client`、`urllib.error`），而 Java 社区惯例是**一类一文件**。选择哪种取决于团队习惯和语言生态。对 Python 项目，推荐"子目录 + 按职责聚合"；若团队以 Java 为主，"一类一文件"也完全可行，关键是**通过 `__init__.py` 统一导出，屏蔽内部结构差异**。

### 关键设计决策

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| 错误码放在异常类内 vs 独立文件 | 独立 `error_codes.py` | 前后端共享，避免循环依赖 |
| handler 放在 exception 内 vs 独立 | 放在 exception 内 | 与异常定义内聚，符合"统一出口"原则 |
| `__init__.py` 是否统一导出 | 是 | `from exception import XxxException` 更简洁 |

注意到 `handler.py` 只有一个文件，但异常类有十几个。handler 是为每个异常类写一个处理器，还是按类别统一处理？handler 的注册粒度应该与**处理策略的差异**对齐，而非与异常类的数量对齐。这个问题将在 [08篇](exception-08.md) 中详细讨论。

> **💡 AI 编程工具推荐**：在规划项目架构和编写异常类时，推荐使用智谱 AI 的 Coding Plan。作为国内顶流编程大模型，它适配了 20+ 主流开发工具，帮你快速生成标准的异常模块代码。
> 👉 [立即参与「拼好模」获取优惠](https://www.bigmodel.cn/glm-coding?ic=AD49T61WTJ)

## 总结

异常文件结构的规划，解决的是**异常代码往哪放**的问题。核心结论：

- 异常需要作为**独立模块** `exception/` 进行统一管理
- **按责任方拆分**文件（`client.py` / `business.py` / `server.py`），与 [02篇](exception-02.md) 的分类模型一致
- 大型项目可升级为**二级目录**，通过 `__init__.py` 屏蔽内部结构变化
- 错误码、全局处理器与异常定义**内聚在同一模块**内

文件结构规划好了，下一步就是往里面填充代码。下一篇将详细讨论**异常类的设计实现**和**错误码体系**的编程落地。