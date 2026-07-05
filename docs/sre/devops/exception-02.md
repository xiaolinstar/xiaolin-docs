---
title: Exception异常架构设计：异常分类（02）
description: "在现代分布式系统和微服务架构中，异常不再是偶然的\"意外\"，而是系统运行的常态。"
date: 2026-02-13
updated: 2026-02-13
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---


在现代分布式系统和微服务架构中，异常不再是偶然的"意外"，而是系统运行的常态。随着系统复杂度的提升，异常的种类和数量呈指数级增长，如何对异常进行科学的分类和管理，成为保障系统稳定性和可维护性的关键环节。

异常分类是异常架构设计的基础，它直接影响着异常处理策略的制定、监控告警的配置以及故障诊断的效率。一个清晰、合理的异常分类体系，能够让开发团队快速定位问题，帮助运维人员准确判断故障等级，使产品团队更好地理解业务影响。

## 分类维度

从实践经验来看，优秀的异常分类应具备以下特征：

- **明确性**：每种异常类型都有清晰的定义和边界
- **实用性**：分类标准与实际业务场景紧密结合
- **可操作性**：便于自动化处理和人工干预
- **可扩展性**：能够适应业务发展和技术演进

异常分类可从以下多维度切入：

### 核心责任维度

- **来源**：系统异常（外部/基础设施） vs 业务异常（内部规则）
- **责任方**：客户端错误（4xx） vs 服务器错误（5xx）

### 运维监控维度

- **严重程度**：致命/错误/警告/信息
- **可恢复性**：可重试/不可重试/可降级
- **影响范围**：用户/租户/服务/系统级

### 技术架构维度

- **生命周期阶段**：启动/运行/关闭
- **数据流阶段**：输入/处理/输出/存储
- **架构层次**：表现层/应用层/领域层/基础设施层

### 商业考量维度

- **SLA影响**：违例/风险/无影响

分类目的是指导处理策略，而非过度设计。对于绝大多数基础项目，按照**来源+责任方**来进行分类是合适的，是足够满足业务需求的。

---

特别地，对于**来源**，从开发者视角来划分：

- 平台异常（外部异常、内置异常）：编程语言、开发框架、中间件、第三方库、远程调用等抛出的异常，由元开发者定义。
- 应用异常：由业务开发者定义的异常。

> 元开发者，指的是为开发者服务的开发者。

### 平台异常

由编程语言、运行时、框架、中间件等"元开发者"定义的异常。

```python
# 1. 语言运行时
def language_runtime():
    # 内存、类型、运算等基础错误
    try:
        x = 1 / 0                    # ZeroDivisionError
        y = int("abc")               # ValueError
        z = {}["nonexistent"]        # KeyError
    except (ZeroDivisionError, ValueError, KeyError) as e:
        print(f"语言运行时异常: {type(e).__name__}")

# 2. 操作系统/文件系统
def os_filesystem():
    # 文件、进程、权限等OS相关错误
    import os
    try:
        os.remove("/nonexistent.txt") # FileNotFoundError
        import subprocess
        subprocess.run(["invalid"])   # FileNotFoundError
    except OSError as e:
        print(f"操作系统异常: {e}")

# 3. 网络/外部服务，包括远程关系调用RPC
def network_external():
    # 网络连接、HTTP请求等
    import requests
    try:
        response = requests.get("http://invalid", timeout=1)
    except requests.exceptions.ConnectionError as e:
        print(f"网络异常: {e}")
    except requests.exceptions.Timeout as e:
        print(f"超时异常: {e}")

# 4. 数据库/中间件
def database_middleware():
    # 数据库连接、查询、事务等
    import sqlite3
    try:
        conn = sqlite3.connect(":memory:")
        conn.execute("INVALID SQL")   # sqlite3.OperationalError
    except sqlite3.Error as e:
        print(f"数据库异常: {e}")
```

开发者不需要定义平台异常，但需要对异常进行处理，后续系列文章中再详细描述异常处理。

### 应用异常

又称为自定义异常，由业务开发者为了满足特定业务需求而创建的异常，反映业务规则、流程限制和领域逻辑，继承`Exception`类创建新类`class AppException(Exception)`。应用异常的核心特征：

- **业务语义性**：异常名称和消息反映业务概念，如：`InsufficientFundsException`（余额不足）
- **完全可控**：开发者决定何时抛出、抛出什么，可以添加任何业务相关属性
- **层次结构化**：可以建立有意义的继承体系，便于分类处理和监控
- **主动设计**：作为业务逻辑的一部分，提前设计异常类型和场景

基于**防御性编程、Fail-Fast、用户友好、可观测性**四大核心原则，将自定义异常细分为**客户端异常、业务异常、服务端异常**三层架构，是当前企业级应用开发中**成熟且合理的分层异常治理方案**，相比单一自定义异常或原生异常混用的模式，具备显著的工程化优势。

#### 客户端异常 4xx

客户端异常是由**调用方**（前端用户、第三方服务、内部调用方）的行为或输入不符合服务约定而引发的异常，服务端本身无任何故障，责任完全在调用方。

**典型场景**  

- 请求参数错误：参数缺失、参数类型不匹配、参数格式非法（如手机号格式错误、邮箱格式错误、ID为非数字）
- 请求权限不足：未登录、登录过期、无接口访问权限、无资源操作权限
- 请求资源不存在：访问的接口路径错误、请求的文件/数据ID不存在
- 请求方式错误：使用GET请求调用仅支持POST的接口、请求头缺失必要字段
- 调用频率超限：触发接口限流、防刷规则

#### 业务异常 299

业务异常是**在服务端逻辑正常执行、请求参数合法的前提下，因业务规则不满足、业务流程无法继续推进**而引发的异常，属于业务层面的预期性阻断，而非系统故障。业务异常可以归属于正常的业务逻辑，因此可将其划分到状态码2xx序列，或者自行定义一个特定值或区间值，便于进行异常处理。

**典型场景**  

- 业务规则校验：账户余额不足、商品库存不足、用户已存在、订单状态不支持当前操作、验证码错误
- 业务流程阻断：重复提交订单、未实名认证无法发起提现、商品已下架无法购买
- 业务逻辑限制：转账金额超出单日限额、用户账号已冻结

#### 服务端异常 5XX

服务端异常是**由服务自身的代码缺陷、基础设施故障、依赖服务不可用**引发的异常，责任完全在服务提供方，属于非预期的系统级故障。

**典型场景**  

- 代码逻辑错误：空指针异常、数组越界、类型转换异常、死循环、算法逻辑bug
- 基础设施故障：数据库连接失败、Redis宕机、MQ消息发送失败、磁盘空间不足
- 依赖服务异常：调用第三方接口超时、内部微服务调用失败、熔断降级触发
- 资源耗尽：线程池耗尽、内存溢出、文件句柄不足

#### 未知异常

未知异常是异常治理的重点，因为它代表了系统中尚未被充分理解和处理的潜在风险。这类异常通常在开发阶段未能预见，但在运行时却可能出现，对系统的稳定性和可维护性构成挑战。未知异常应当归类到服务端异常（5XX系列）中，作为ServerException的子类UnknownException进行专门处理。

**典型场景**：

- 第三方库升级引入的新异常类型
- 系统环境变化导致的异常（如新版本操作系统API变更）
- 硬件故障导致的底层异常
- 未充分测试的边缘情况
- 依赖服务的未预期行为变化

**处理原则**：

- 统一归类到服务端异常，返回5xx状态码
- 记录详细的错误信息和堆栈跟踪，便于后续分析
- 触发告警，通知开发团队关注
- 设置兜底机制，确保系统稳定性
- 建立反馈机制，将未知异常转化为已知异常

**在异常治理中的重要性**：

- **风险识别**：未知异常是系统潜在风险的指示器，帮助团队发现系统中的薄弱环节
- **持续改进**：通过对未知异常的分析和处理，不断完善异常处理策略
- **系统韧性**：良好的未知异常处理机制能够提升系统的容错能力和恢复能力
- **监控告警**：未知异常的出现频率和模式是重要的系统健康指标

在异常处理实践中，设置通用异常处理器，将所有未明确处理的异常转换为UnknownException，避免敏感信息泄露给客户端。同时，应建立**异常治理**流程，定期分析UnknownException的类型和频率，逐步将其转化为具体的、可处理的异常类型，从而不断优化异常治理体系。

### 异常分类举例

- **客户端异常**：基于主键ID查询用户信息，传入的ID格式非法或为null，返回参数错误异常
- **业务异常**：基于主键ID查询到用户信息，但用户信息是加密的只允许特定人员查看，返回权限不足异常
- **服务端异常**：基于主键ID查询用户信息，数据库连接失败，返回系统异常

对于我在工作中遇到的一个问题：一个审批流程，最后一个环节需要部门领导申请，但是部门领导没有注册该系统账户，导致工单到部门领导审批结点时被阻塞。这种业务异常的稽核规则应前置到发起该审批流程的时候：“该流程需要部门领导审批，没有查询到您所属部门领导的账户信息，请核实”。

### 编程实践

#### 异常层次架构

```text
Exception (Python内置顶层父类，所有异常根节点，仅作为底层捕获源)
└─ AppBaseException (可选抽象基类，封装通用属性：错误码/提示/HTTP状态码，推荐使用)
   ├─ ClientException (客户端异常根类，接口层抛出)
   │  ├─ ValidationException (参数校验：格式/非空/范围错误)
   │  ├─ AuthenticationException (认证：未登录/Token过期/认证失败)
   │  └─ AuthorizationException (授权：无接口/资源操作权限)
   │
   ├─ BizException (业务异常根类，业务层抛出)
   │  ├─ BusinessRuleException (通用业务规则：余额/库存不足、规则校验失败)
   │  ├─ ResourceException (资源：不存在/已被占用/已删除)
   │  └─ StateException (状态：订单/商品状态不支持当前操作)
   │
   └─ ServerException (服务端异常根类，数据/依赖层抛出，承接所有系统异常转换)
      ├─ InfrastructureException (基础设施异常：数据库/缓存/MQ/文件系统故障)
      ├─ ExternalServiceException (外部服务异常：第三方/内部平台调用超时/连接失败)
      ├─ UnexpectedException (预期内系统异常：可捕获的原生异常转换，如KeyError/IndexError)
      └─ UnknownException (未知异常：未专门处理的原生异常/未预见异常，最终兜底)
```

其中，UnknownException作为服务端异常的兜底分类，专门用于处理那些在开发阶段未能预见的异常情况。未知异常是异常治理的重点，因为它们代表了系统中尚未被充分理解和处理的潜在风险。这类异常虽然在发生时无法精确分类，但通过统一的UnknownException处理，可以确保：

- 系统保持稳定运行
- 为开发团队提供反馈，以便后续优化
- 避免敏感信息泄露给客户端
- 便于监控和告警系统的统一管理
- 作为异常治理的重要指标，推动系统持续改进

自定义异常设计实践：

> 避免过度设计，参数可根据业务需求添加

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class AppBaseException(Exception):
    """应用异常基类，封装通用属性"""
    message: str = "系统异常"
    error_code: str = "SYSTEM_ERROR"
    http_status: int = 500
    details: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        super().__init__(self.message)

@dataclass
class ClientException(AppBaseException):
    """客户端异常基类"""
    message: str = "客户端异常"
    error_code: str = "CLIENT_ERROR"
    http_status: int = 400

@dataclass
class ValidationException(ClientException):
    """参数校验异常"""
    message: str = "参数校验失败"
    error_code: str = "VALIDATION_ERROR"
    http_status: int = 400

@dataclass
class AuthenticationException(ClientException):
    """认证异常"""
    message: str = "认证失败"
    error_code: str = "AUTHENTICATION_ERROR"
    http_status: int = 401

@dataclass
class AuthorizationException(ClientException):
    """授权异常"""
    message: str = "权限不足"
    error_code: str = "AUTHORIZATION_ERROR"
    http_status: int = 403

@dataclass
class BizException(AppBaseException):
    """业务异常基类"""
    message: str = "业务异常"
    error_code: str = "BUSINESS_ERROR"
    http_status: int = 299

@dataclass
class ServerException(AppBaseException):
    """服务端异常基类"""
    message: str = "服务器异常"
    error_code: str = "SERVER_ERROR"
    http_status: int = 500

@dataclass
class UnknownException(ServerException):
    """未知异常类，用于处理未预见到的异常情况"""
    message: str = "未知异常"
    error_code: str = "UNKNOWN_ERROR"
    http_status: int = 500

# 使用示例
def example_usage():
    try:
        # 模拟业务逻辑
        raise ValidationException(
            message="手机号格式错误",
            error_code="INVALID_PHONE_FORMAT",
            details={"field": "phone", "value": "123"}
        )
    except ValidationException as e:
        print(f"捕获到异常: {e.message}, 错误码: {e.error_code}")
        # 输出: 捕获到异常: 手机号格式错误, 错误码: INVALID_PHONE_FORMAT
```

## 总结

本文详细介绍了异常分类的多维度模型和分类原则，包括：

1. **分类维度**：从核心责任、运维监控、技术架构、商业考量四个维度对异常进行分类
2. **异常来源**：区分平台异常（系统级）和应用异常（业务级）
3. **三大异常类型**：客户端异常（4xx）、业务异常（299）、服务端异常（5xx）
4. **未知异常处理**：作为异常治理的重点，需要建立兜底机制
5. **异常层次架构**：建立了清晰的异常继承体系

通过科学的异常分类，我们可以：

- 明确问题责任边界，快速定位故障根源
- 便于监控告警配置，提高运维效率
- 优化用户体验，提供友好的错误信息
- 为后续异常处理策略奠定基础

## 下一篇预告：异常处理

在明确了异常分类之后，下一步是建立有效的异常处理机制，将深入探讨：

- **异常处理策略**：不同异常类型的处理方式，异常抛出
- **架构层处理**：Controller-Service-Repository三层异常处理实践
- **异常转换**：如何将底层异常转换为用户友好的错误信息，保持异常信息的完整性
- **全局异常处理器**：统一异常处理机制