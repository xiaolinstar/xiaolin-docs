---
title: Exception异常编程实践：异常类与错误码设计（07）
description: "在 上一篇 中，我们规划了 exception/ 模块的文件结构，解决了\"异常代码往哪放\"的问题。"
date: 2026-03-06
updated: 2026-03-06
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

# Exception异常编程实践：异常类与错误码设计（07）

在 [上一篇](exception-06.md) 中，我们规划了 `exception/` 模块的文件结构，解决了"异常代码往哪放"的问题。本篇进入核心编码环节——**异常类怎么写、错误码怎么定义**。

## 异常类设计

异常类设计是异常模块的核心。在 [02篇](exception-02.md) 中，我们已经确立了异常层次架构，本节将其落地为可运行的代码。

### 类层次结构

```text
Exception (Python内置)
└── AppBaseException (应用异常基类)
    ├── ClientException (客户端异常 4xx)
    │   ├── ValidationException (参数校验)
    │   ├── AuthenticationException (认证失败)
    │   └── AuthorizationException (权限不足)
    ├── BizException (业务异常 299)
    │   ├── ResourceException (资源不存在/已占用)
    │   └── StateException (状态不支持)
    └── ServerException (服务端异常 5xx)
        ├── InfrastructureException (基础设施异常)
        ├── ExternalServiceException (外部服务异常)
        └── UnknownException (未知异常兜底)
```

### 基类设计：`base.py`

基类是整个异常体系的根基，需要封装所有异常共有的属性。

```python
# exception/base.py

class AppBaseException(Exception):
    """
    应用异常基类
    封装通用属性：错误消息、错误码、HTTP状态码、附加详情
    """

    def __init__(self, message: str = "系统异常", error_code: str = "SYSTEM_ERROR",
                 http_status: int = 500, details: dict = None):
        super().__init__(message)  # 必须调用，正确设置 args
        self.message = message
        self.error_code = error_code
        self.http_status = http_status
        self.details = details or {}

    def to_dict(self) -> dict:
        """序列化为 API 响应格式，供全局异常处理器使用"""
        result = {
            "success": False,
            "error_code": self.error_code,
            "message": self.message,
        }
        if self.details:
            result["details"] = self.details
        return result

    def __str__(self):
        return f"[{self.error_code}] {self.message}"
```

**设计要点**：

- `super().__init__(message)` 必须调用，确保 `args` 属性正确设置（参见 [01篇](exception-01.md)）
- `to_dict()` 方法将异常统一序列化为 JSON 响应格式，供全局处理器调用
- `__str__()` 重写，日志打印时显示 `[错误码] 错误消息` 格式
- 所有字段给默认值，子类可以按需覆盖

### `dataclass` vs 传统 class

在 [02篇](exception-02.md) 的编程实践中使用了 `@dataclass`，这里讨论两种方案的取舍：

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| `@dataclass` | 代码简洁，自动生成 `__init__` | `__post_init__` 中调用 `super().__init__()` 不直观；多层继承 + 默认值覆盖容易出问题 |
| 传统 `class` | 继承行为清晰，`super().__init__()` 自然 | 样板代码稍多 |

**实践建议**：在异常类设计中使用**传统 class**。原因是异常类的继承链比较特殊（继承自 `Exception`），`dataclass` 在多层继承场景下默认值的前后顺序以及 MRO（方法解析顺序） 容易引发难以排查的问题。传统 class 虽然代码略多，但逻辑更透明。

### 客户端异常：`client.py`

```python
# exception/client.py
from .base import AppBaseException


class ClientException(AppBaseException):
    """客户端异常基类，HTTP 4xx"""

    def __init__(self, message: str = "请求错误", error_code: str = "CLIENT_ERROR",
                 http_status: int = 400, details: dict = None):
        super().__init__(message, error_code, http_status, details)


class ValidationException(ClientException):
    """参数校验异常"""

    def __init__(self, message: str = "参数校验失败", error_code: str = "VALIDATION_ERROR",
                 details: dict = None):
        super().__init__(message, error_code, 400, details)


class AuthenticationException(ClientException):
    """认证异常：未登录、Token过期"""

    def __init__(self, message: str = "认证失败", error_code: str = "AUTH_FAILED",
                 details: dict = None):
        super().__init__(message, error_code, 401, details)


class AuthorizationException(ClientException):
    """授权异常：无权限"""

    def __init__(self, message: str = "权限不足", error_code: str = "PERMISSION_DENIED",
                 details: dict = None):
        super().__init__(message, error_code, 403, details)
```

### 业务异常：`business.py`

```python
# exception/business.py
from .base import AppBaseException


class BizException(AppBaseException):
    """业务异常基类，HTTP 299"""

    def __init__(self, message: str = "业务处理失败", error_code: str = "BIZ_ERROR",
                 http_status: int = 299, details: dict = None):
        super().__init__(message, error_code, http_status, details)


class ResourceException(BizException):
    """资源异常：不存在、已占用、已删除"""

    def __init__(self, message: str = "资源不存在", error_code: str = "RESOURCE_ERROR",
                 details: dict = None):
        super().__init__(message, error_code, 299, details)


class StateException(BizException):
    """状态异常：订单/商品状态不支持当前操作"""

    def __init__(self, message: str = "状态不支持当前操作", error_code: str = "STATE_ERROR",
                 details: dict = None):
        super().__init__(message, error_code, 299, details)
```

### 服务端异常：`server.py`

```python
# exception/server.py
from .base import AppBaseException


class ServerException(AppBaseException):
    """服务端异常基类，HTTP 5xx"""

    def __init__(self, message: str = "服务器内部错误", error_code: str = "SERVER_ERROR",
                 http_status: int = 500, details: dict = None):
        super().__init__(message, error_code, http_status, details)


class InfrastructureException(ServerException):
    """基础设施异常：数据库/缓存/MQ/文件系统故障"""

    def __init__(self, message: str = "基础设施异常", error_code: str = "INFRA_ERROR",
                 details: dict = None):
        super().__init__(message, error_code, 500, details)


class ExternalServiceException(ServerException):
    """外部服务异常：第三方接口超时/连接失败"""

    def __init__(self, message: str = "外部服务异常", error_code: str = "EXTERNAL_ERROR",
                 details: dict = None):
        super().__init__(message, error_code, 502, details)


class UnknownException(ServerException):
    """未知异常：未预见的异常，最终兜底"""

    def __init__(self, message: str = "未知异常", error_code: str = "UNKNOWN_ERROR",
                 details: dict = None):
        super().__init__(message, error_code, 500, details)
```

### 使用示例

```python
# 接口层：参数校验
def create_user(username, age):
    if not username:
        raise ValidationException("用户名不能为空", details={"field": "username"})
    if age < 18:
        raise ValidationException("未成年人禁止注册", error_code="AGE_LIMIT", details={"age": age})

# 业务层：业务规则校验
def withdraw(account_id, amount):
    account = get_account(account_id)
    if not account:
        raise ResourceException(f"账户 {account_id} 不存在")
    if account.balance < amount:
        raise BizException("账户余额不足", error_code="INSUFFICIENT_BALANCE",
                           details={"balance": account.balance, "amount": amount})

# 数据层：异常转换
def query_user(user_id):
    try:
        return db.execute("SELECT * FROM users WHERE id = %s", user_id)
    except OperationalError as e:
        raise InfrastructureException("数据库查询失败") from e
    except Exception as e:
        raise UnknownException(f"查询用户时发生未知错误") from e
```

## 错误码设计

### 为什么需要错误码

在 [04篇](exception-04.md) 中我们确立了"统一出口"原则：所有异常最终经过全局异常处理器归一化后，以统一的 JSON 格式返回给前端。然而，归一化的过程必然伴随着**信息损失**——服务端内部丰富的异常类型（`OperationalError`、`ConnectionTimeout`、`InsufficientBalanceError`）被收敛为有限的几个异常类别（`ClientException`、`BizException`、`ServerException`），底层的技术细节被屏蔽，堆栈信息被脱敏。

这带来了一个矛盾：**用户友好要求隐藏细节，排障效率要求保留细节。**

错误码就是解决这个矛盾的桥梁。它在异常归一化的过程中，**用一个结构化的编码保留异常的精确身份**，既不向前端暴露服务端实现细节，又能让前后端快速定位问题。

```text
服务端内部                        全局异常处理器                    前端收到的响应
                                  （归一化）
OperationalError ──┐
                   ├─→ ServerException ──→ {"error_code": "S-INFRA-001", "message": "系统繁忙"}
ConnectionError ───┘

ValueError ────────→ ClientException ──→ {"error_code": "C-COMMON-002", "message": "参数格式错误"}

余额不足 ──────────→ BizException ────→ {"error_code": "B-ACCOUNT-001", "message": "余额不足"}
```

可以看到：

- **异常类**决定了 HTTP 状态码和处理策略（4xx / 299 / 5xx）
- **错误码**保留了异常的具体身份（哪个模块、什么问题）
- **message** 提供了用户友好的提示文案

三者各司其职，缺一不可。

### 错误码 vs HTTP 状态码

有人会问：HTTP 状态码已经能区分错误类型了，为什么还需要错误码？

| 维度 | HTTP 状态码 | 错误码 |
| --- | --- | --- |
| 粒度 | 粗粒度，只有几十个标准值 | 细粒度，可定义数百个业务场景 |
| 语义 | 通用的协议语义（如 404 = 资源不存在） | 业务专属语义（如 `B-ORDER-001` = 订单状态不支持） |
| 使用方 | 基础设施层（Nginx、网关、监控） | 业务层（前端展示、后端排障） |
| 举例 | 同样是 400，无法区分是"参数缺失"还是"格式非法" | `C-COMMON-001`（缺失） vs `C-COMMON-002`（非法） |

一句话概括：**HTTP 状态码是给机器看的（网关路由、监控告警），错误码是给人看的（前端提示、后端排障）。**

### 错误码设计原则

- **唯一性**：每个错误码全局唯一，一个码只对应一种错误场景
- **可读性**：看到错误码就能大致判断问题归属，不需要查表
- **可扩展**：新增业务模块时，新增码段即可，不影响已有编码
- **不泄露**：错误码本身不包含技术实现细节（如表名、字段名），避免信息泄露

### 命名规范

推荐格式：`{责任方}-{模块}-{序号}`

```text
C-COMMON-001
│  │      │
│  │      └── 序号：模块内自增编号
│  └── 模块：功能/业务模块标识
└── 责任方：C(Client) / B(Business) / S(Server)
```

### 错误码枚举实现

将错误码从异常类中抽离出来，集中管理在 `error_codes.py` 中，便于前后端共享维护。

```python
# exception/error_codes.py
from enum import Enum


class ErrorCode(str, Enum):
    """
    错误码统一枚举
    命名规则：{责任方}-{模块}-{序号}
    继承 str 使其可直接作为字符串使用，如 JSON 序列化
    """
    # --- 客户端异常 C-xxx ---
    PARAM_MISSING = "C-COMMON-001"           # 缺少必要参数
    PARAM_INVALID = "C-COMMON-002"           # 参数格式非法
    AUTH_FAILED = "C-AUTH-001"               # 认证失败
    TOKEN_EXPIRED = "C-AUTH-002"             # Token 过期
    PERMISSION_DENIED = "C-AUTH-003"         # 权限不足

    # --- 业务异常 B-xxx ---
    INSUFFICIENT_BALANCE = "B-ACCOUNT-001"   # 余额不足
    ORDER_STATUS_INVALID = "B-ORDER-001"     # 订单状态不支持操作
    RESOURCE_NOT_FOUND = "B-COMMON-001"      # 资源不存在
    DUPLICATE_OPERATION = "B-COMMON-002"     # 重复操作

    # --- 服务端异常 S-xxx ---
    DB_ERROR = "S-INFRA-001"                 # 数据库异常
    CACHE_ERROR = "S-INFRA-002"              # 缓存异常
    EXTERNAL_TIMEOUT = "S-EXTERNAL-001"      # 外部服务超时
    UNKNOWN = "S-UNKNOWN-999"                # 未知异常
```

### 与异常类结合使用

错误码与异常类是**配合关系**而非替代关系。异常类决定"怎么处理"，错误码标识"具体是什么"：

```python
from exception import ValidationException, BizException, InfrastructureException
from exception.error_codes import ErrorCode

# 接口层：参数校验场景
raise ValidationException(
    message="手机号格式错误",
    error_code=ErrorCode.PARAM_INVALID,
    details={"field": "phone", "value": "123"}
)

# 业务层：余额不足场景
raise BizException(
    message="账户余额不足，请充值后重试",
    error_code=ErrorCode.INSUFFICIENT_BALANCE,
    details={"balance": 50.00, "amount": 100.00}
)

# 数据层：数据库异常转换
try:
    db.execute(sql)
except OperationalError as e:
    raise InfrastructureException(
        message="数据查询失败，请稍后重试",  # 用户友好的 message
        error_code=ErrorCode.DB_ERROR,       # 精确的错误码，便于排障
    ) from e  # 保留原始异常链，便于日志追踪
```

前端收到的响应：

```json
{
    "success": false,
    "error_code": "B-ACCOUNT-001",
    "message": "账户余额不足，请充值后重试"
}
```

前端开发者看到 `B-ACCOUNT-001`，可以直接查阅错误码手册定位问题；后端开发者通过日志中的错误码 + TraceID，快速找到对应的异常链和原始堆栈。**错误码就是前后端之间的"异常身份证"。**

## 总结

本篇解决了**异常代码怎么写**的问题，核心产出：

- **异常类层次结构**：`AppBaseException` → `ClientException` / `BizException` / `ServerException` → 具体异常类，与 [02篇](exception-02.md) 分类模型完全对应
- **基类设计**：封装 `message`、`error_code`、`http_status`、`details` 四个核心属性，提供 `to_dict()` 序列化方法
- **实践选择**：传统 class 优于 `@dataclass`，异常继承链的透明性更重要
- **错误码体系**：解决异常归一化过程中的信息损失问题，是前后端之间的"异常身份证"

异常类和错误码都定义好了，下一篇将讨论如何通过**全局异常处理器**将它们串联起来，实现一行代码完成项目集成。