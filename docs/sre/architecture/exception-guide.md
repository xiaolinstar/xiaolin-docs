# Exception异常的架构设计

异常架构设计原则：

- 防御性编程
- Fail-Fast，快速失败
- 用户友好
- 可观测性（监控告警、异常日志查询、故障诊断）

本文面向开发工程师和SRE工程师：

- 开发工程师：在日常编码中形成良好的异常处理习惯，提高代码可读性和健壮性
- SRE 工程师：可观测性和故障治理基石，制定运维策略与规范，使用技术管控代码质量。

## 异常基础

异常是程序执行过程中发生的非正常情况，这些情况通常需要特殊处理。异常机制是现代编程语言中处理错误和异常情况的重要方式，不同语言在异常处理上有不同的哲学和实现。

以`Java`为代表的受检异常机制通过编译器强制检查异常声明和处理，确保错误的显式管理，增强了代码可靠性但可能引入冗余，受检查异常机制体现了防御性编程的异常设计原则；以`Python`和`JavaScript`为代表的灵活运行时异常机制采用“请求原谅比许可更容易”的哲学，提供简洁的`try`结构块和异步错误处理，适合快速开发但缺乏编译时保障；`C++`和`Rust`代表的资源安全与性能导向机制分别通过 RAII 模式和 Result 类型系统，在保证资源安全的同时追求零开销异常处理，适合系统编程；`Go`语言采用显式错误值返回模式，通过多返回值传递错误，强制调用者即时处理，避免了异常的控制流跳跃；这些不同范式反映了各语言在安全性、灵活性、性能及表达力之间的不同权衡。

> 示例代码选择`Python`（`Flask`），用户数量庞大，语法更简洁，可读性好

文中以最常见的应用级编程语言 `Python`（`Flask`），辅助`Java`（`SpringBoot`）为例，来介绍异常机制。


### 异常核心

开发者需要关注的异常核心三要素：`try`异常处理块、`raise`异常抛出和自定义异常。

#### 异常处理块

异常处理块的关键字和结构为`try-except-else-finally`，其中`except`可以多个嵌套，支持在一条`except`语句中捕获多个异常。

```python
try:
    # 可能引发异常的代码
    result = 10 / int(input("输入数字: "))
except ValueError as e:           # 捕获特定异常
    print(f"输入错误: {e}")
except ZeroDivisionError as e:    # 多个except子句
    print(f"除零错误: {e}")
except (TypeError, EOFError):     # 捕获多个异常
    print("类型或输入错误")
except Exception as e:            # 通用异常捕获
    print(f"其他错误: {e}")
else:                             # 无异常时执行
    print(f"结果: {result}")
finally:                          # 总是执行
    print("清理完成")
```

#### 异常抛出

开发者可以使用`raise`主动抛出异常，一般有2个用处：主动抛出、异常转换。

```python
# 抛出异常实例
raise ValueError("参数无效")

# 异常转换
try:
    # 可能引发异常的代码
    result = 10 / int(input("输入数字: "))
except ValueError as e:           # 捕获特定异常
    print(f"输入错误或: {e}")
except ZeroDivisionError as e:    # 多个except子句
    print(f"除零错误: {e}")
except Exception as e:            # 通用异常捕获
		raise MyException # 其他异常Exception转换为用户自定义异常MyException
```

#### 自定义异常

`Exception`是`Python`中所有的**非系统退出类异常**的父类，是所有自定义异常的基类，其本身几乎没有新增的专属字段/方法，其所有核心属性和方法都继承自父类`BaseException`。

```python
# 直接继承Exception
class AppException(Exception):
    pass

# 间接继承Exception
class MyAppException(AppException):
    pass
```

自定义异常需关注：

- `Exception`异常参数元组`args`
- 在`__init__`中调用`super().__init__(message)` → 正确设置`args`
- 按需重写`__str__` → 提供友好显示

```python
# Exception异常参数
e = Exception("错误消息", "附加信息", 123)
print(e.args)  # ('错误消息', '附加信息', 123)

# 必须调用 super().__init__ 父类构造函数
class MyException(Exception):
    def __init__(self, message, **kwargs):
        super().__init__(message)  # 必须调用！
        # 然后添加额外字段
        for k, v in kwargs.items():
            setattr(self, k, v)

# 重写 __str__，字符串友好提示
class MyException(Exception):
    def __str__(self):
        # 默认返回args的字符串表示，通常需要重写
        return f"MyException: {super().__str__()}"
```

当一个异常触发了另一个异常时，通过这两个属性`__cause__`和`__context__`可以追溯**原始异常**，`Python`解释器会自动处理其赋值，也可通过语法手动指定，是实现**异常链**的核心。

例如，在异常处理时，发生了新的异常，就会形成一条异常链：`Exception A -> Exception B -> ...`，在异常调试的时候非常有用。

```python
# 1. __cause__ (显式链，使用 from)
try:
    int("abc")
except ValueError as e1:
    raise RuntimeError("处理失败") from e1  # ← e1存入__cause__

# 2. __context__ (隐式链，自动设置)
try:
    int("abc")
except ValueError as e1:
    raise RuntimeError("处理失败")  # ← e1自动存入__context__
```

当没有使用`raise ... from`语法时，若在一个异常的处理过程中（`except`/`finally`块）触发了另一个异常，Python 会**自动**将前一个异赋值给后一个异常的`__context__`属性，这是**隐式关联**，无需手动干预。`__cause__`字段则是**手动指定**的，是为异常的**显示关联**，其优先级高于`__context__`。

特别地，当使用`raise MyException from None`可以屏蔽所有异常关联（`__cause__`和`__context__`均为`None`），只打印当前异常。另一方面：`__context__`和`__cause__`的语义存在差别，前者是上下文信息，后者是直接原因，这在打印异常信息的时候会存在语义差别。

```python
# __context__，在处理底层异常的过程中，又发生了一个新的异常
During handling of the above exception, another exception occurred:

# __cause__，新异常是由底层异常直接导致的
The above exception was the direct cause of the following exception:
```

一句话理解：`__context__`和`__cause__`均为`Exception`对象，存储当前异常的关联异常，`__context__`是自动关联的，而`__cause__`是手段关联的，使用`raise MyException from e`语句。

---

聊到了这里，就先简单异常处理时异常链的用法，在异常转换时需要主动抛出新的异常。

```python
# DataAceessException 是用户自定义异常，屏蔽底层的信息，向上呈现统一友好提示，同时使用__cause__来记录原始异常
DataAcessException -> requests.exceptions.ConnectTimeout
DataAccessException -> pymysql.MySQLError
DataAccessException -> FileNotFoundError
```

在业务层返回异常`DataAccessException`用来屏蔽底层技术性异常，但是在打印日志的时候也应该记录原始的异常信息，这样便于进行异常诊断。异常处理和日志打印的架构设计，将在后续详细介绍。

### 异常延伸

#### 异常层次结构

`Python`中所有的异常都是`BaseException`的子类。主要层级：

```
BaseException
 ├── SystemExit           # 程序退出
 ├── KeyboardInterrupt    # 用户中断(Ctrl+C)
 ├── GeneratorExit        # 生成器关闭
 └── Exception            # 常规异常基类
      ├── ArithmeticError
      ├── LookupError
      ├── OSError
      ├── ValueError
      └── ... (所有内置异常)
```

`Exception`与`SystemExit`、`KeyboardInterrupt`是并列关系，因此使用`except Exception`不会捕获系统退出信号，可以使用`except BaseException`捕获所有异常。

```python
try:
    raise SystemExit("退出程序")
except Exception as e:  # 不会捕获SystemExit
    print("不会执行这里")
except BaseException as e:  # 会捕获
    print(f"捕获到BaseException: {e}")
```

#### `assert`断言

`assert`断言，可以看作是**一种带有调试标志的语法糖**，但**不完全等价于简单的`if-raise`**，`assert`仅在调试时使用，可以使用`python -O main.py`的`-O`模式忽略掉，类似于忽略掉注释代码。

```python
# assert语句
assert condition, "错误信息"

# 大致等效的if-raise实现
if not condition:
    raise AssertionError("错误信息")

# assert的实际等效代码
if __debug__:
    if not condition:
        raise AssertionError("错误信息")
```

`with`块在资源管理上，非常有用，可以简化代码，提高可读性。在资源处理时即使发生异常，也可以保证资源被释放，有效避免资源泄露问题。在Java中也有类似的`try-with-resource`语句。

```python
# 资源泄露
file = None
try:
    file = open("file.txt", "r")
    content = file.read()
except Exception as e:
    pass # 发生异常是不对file进行关闭，会造成文件资源泄露

# 传统方式
file = None
try:
    file = open("file.txt", "r")
    content = file.read()
finally:
    if file:
        file.close()

# with语句方式（更简洁）
with open("file.txt", "r") as file:
    content = file.read()
```

在异常发生后，函数的执行可以延伸很多，后期将单独写一篇文章讲解，其中`except`、`finally`和`return`语句的执行顺序，是面试的一个高频考点。

## 异常进阶

在[异常基础](# 异常基础)章节，主要介绍编程语言原生的异常机制，本章节介绍应用级开发框架下的异常机制。

### Flask异常`HTTPException`（待补充）

应用级开发框架是基于**RESTful API**设计的，因此有专门封装面向HTTP的异常类，如`Flask`中的`HTTPException`。

**常见HTTP异常**

```
abort(404)           # NotFound
abort(400)           # BadRequest
abort(401)           # Unauthorized
abort(403)           # Forbidden
abort(500)           # InternalServerError
```

`abort`可以看作`assert`是一个语法糖，根据代码抛出具体的异常。

```python
# raise HTTPException
user = User.query.get(user_id)
    if not user:
        raise werkzeug.exceptions.NotFound(f"用户 {user_id} 不存在")
# abort
user = User.query.get(user_id)
    if not user:
    		abort(404, f"用户 {user_id} 不存在")
```

### 异常处理器 `handler`

异常抛出后，可以被异常处理器所捕获并进行处理。自定义异常处理器在函数头上加 `@app.errorhandler(ExceptionType)`注解

```python
# 基于状态码的处理器
@app.errorhandler(404)
def handle_404(error):
    """处理404错误"""
    if request.path.startswith('/api/'):
        return jsonify({"error": "资源不存在"}), 404
    return render_template('404.html'), 404

# 基于异常类的处理器
@app.errorhandler(ValidationError)
def handle_validation_error(error):
    """处理验证错误"""
    return jsonify({
        "error": "验证失败",
        "message": error.message,
        "details": error.details
    }), error.code
```

上述代码是全局异常处理，可以定义蓝图级的异常处理函数。

```python
from flask import Blueprint

api_bp = Blueprint('api', __name__, url_prefix='/api')

# 蓝图局部异常处理器
@api_bp.errorhandler(404)
def api_404(error):
    """只在api蓝图内有效的404处理器"""
    return jsonify({"error": "API资源不存在"}), 404
```

可以发现，异常处理器中的`ExceptionType`可以有多个，抛出的异常是如何匹配的？优先级？

### 异常处理优先级

异常处理优先级：具体异常类 -> 父异常类 -> 父类的父类 > .. > `Exception` > `BaseException`

```python
from werkzeug.exceptions import NotFound, HTTPException

# 定义多个处理器
@app.errorhandler(404)
def handler_404(error):
    print("执行: 404状态码处理器")
    return "404状态码处理器", 404

@app.errorhandler(NotFound)
def handler_not_found_class(error):
    print("执行: NotFound异常类处理器")
    return "NotFound异常类处理器", 404

@app.errorhandler(HTTPException)
def handler_http_exception(error):
    print("执行: HTTPException基类处理器")
    return "HTTPException基类处理器", error.code

# 测试路由
@app.route('/test-priority')
def test_priority():
    abort(404)  # 抛出NotFound异常
    
# 访问 /test-priority 的输出：
# 执行: NotFound异常类处理器
# 只有这个处理器被执行，其他不会执行

# 删除@app.errorhandler(NotFound)，执行404状态码处理器
# abort实际执行的是 raise NotFound
```

一般地，可使用`@app.errorhandler(Exception)`来实现全局异常兜底处理机制，保证所有的异常都不会无限向上抛出。

```python
@app.errorhandler(Exception)
def handler_general_exception(error):
    print("执行: 通用Exception处理器")
    return "通用Exception处理器", 500
```

如果异常没有被自定义异常捕获并处理，会走**Flask默认异常处理机制**：开发环境 `(DEBUG=True)`下，返回**带完整异常栈的调试页面**，能按到所有异常信息。生产环境下转换为`500 Internal Server Error`，通用的无信息的错误页。

有无必要使用`@app.errorhandler(BaseException)`兜底所有异常？**没有必要**。`Exception`是所有非中断异常的基类，对于会严重错误，而导致系统异常退出的异常，应该执行退出逻辑。`BaseException`是所有异常的基类，包括退出和系统中断

```python
from flask import Flask
import sys

app = Flask(__name__)

# ❌ 危险的BaseException处理器
@app.errorhandler(BaseException)
def handle_base_exception(e):
    """这会捕获所有异常，包括系统退出信号！"""
    print(f"捕获到BaseException: {type(e).__name__}")
    return "错误已处理", 500

@app.route('/exit')
def exit_app():
    """这个路由会触发系统退出"""
    sys.exit(1)  # 抛出SystemExit异常

@app.route('/keyboard')
def keyboard():
    """模拟键盘中断（在实际服务器中很难触发）"""
    raise KeyboardInterrupt()

# 访问 /exit 时：
# 1. 应该让程序正常退出
# 2. 但BaseException处理器会捕获SystemExit
# 3. 返回HTTP响应，程序继续运行！
# 4. 这破坏了正常的程序控制流
```

因此，大多数情况下应用开发时关注`Exception`即可，无需捕获`BaseException`。

**讨论问题：什么情况下需要`BaseException`处理器？**

## 异常分类

异常分类可从以下多维度切入：

**核心责任维度**

- **来源**：系统异常（外部/基础设施）vs 业务异常（内部规则）
- **责任方**：客户端错误（4xx）vs 服务器错误（5xx）

**运维监控维度**

- **严重程度**：致命/错误/警告/信息
- **可恢复性**：可重试/不可重试/可降级
- **影响范围**：用户/租户/服务/系统级

**技术架构维度**

- **生命周期阶段**：启动/运行/关闭
- **数据流阶段**：输入/处理/输出/存储
- **架构层次**：表现层/应用层/领域层/基础设施层

**商业考量维度**

- **SLA影响**：违例/风险/无影响

分类目的是指导处理策略，而非过度设计。对于绝大多数基础项目，按照**来源+责任方**来进行分类是合适的。

---

特别地，对于**来源**，从开发者角度来划分：

- 平台异常（外部异常、内置异常）：编程语言、开发框架、中间件、第三方库、远程调用等抛出的异常，由元开发者定义。
- 应用异常：由业务开发者定义的异常。

> 元开发者，指的是为开发者服务的开发者。

### 平台异常

由编程语言、运行时、框架、中间件等"元开发者"定义的异常，有四大来源：编程语言、操作系统/文件系统、网络/外部服务、数据库/中间件。

```Python
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

开发者不需要定义平台异常，但需要对异常进行处理，在下一章节描述。

### 应用异常

又称为自定义异常，由业务开发者为了满足特定业务需求而创建的异常，反映业务规则、流程限制和领域逻辑，继承`Exception` 类创建新类`class AppException(Exception)`。应用异常的核心特征：

- 业务语义性：异常名称和消息反映业务概念，如：`InsufficientFundsException`（余额不足）

- 完全可控：开发者决定何时抛出、抛出什么，可以添加任何业务相关属性

- 层次结构化：可以建立有意义的继承体系，便于分类处理和监控

- 主动设计：作为业务逻辑的一部分，提前设计异常类型和场景

基于**防御性编程、Fail-Fast、用户友好、可观测性**四大核心原则，将自定义异常细分为**客户端异常、业务异常、服务端异常**三层架构，是当前企业级应用开发中**成熟且合理的分层异常治理方案**，相比单一自定义异常或原生异常混用的模式，具备显著的工程化优势。

#### 客户端异常 4xx

客户端异常是由**调用方（前端用户、第三方服务、内部调用方）**的行为或输入不符合服务约定而引发的异常，服务端本身无任何故障，责任完全在调用方。

**典型场景**

- 请求参数错误：参数缺失、参数类型不匹配、参数格式非法（如手机号格式错误、邮箱格式错误、ID 为非数字）
- 请求权限不足：未登录、登录过期、无接口访问权限、无资源操作权限
- 请求资源不存在：访问的接口路径错误、请求的文件 / 数据 ID 不存在
- 请求方式错误：使用 GET 请求调用仅支持 POST 的接口、请求头缺失必要字段
- 调用频率超限：触发接口限流、防刷规则

#### 业务异常 299

业务异常是**在服务端逻辑正常执行、请求参数合法的前提下，因业务规则不满足、业务流程无法继续推进**而引发的异常，属于业务层面的预期性阻断，而非系统故障。业务异常可以归属于正常的业务逻辑，因此可将其划分到状态码2xx序列，自行定义一个特定值或区间值，便于进行异常处理。

**典型场景**

- 业务规则校验：账户余额不足、商品库存不足、用户已存在、订单状态不支持当前操作、验证码错误
- 业务流程阻断：重复提交订单、未实名认证无法发起提现、商品已下架无法购买
- 业务逻辑限制：转账金额超出单日限额、用户账号已冻结

#### 服务端异常 5XX

服务端异常是**由服务自身的代码缺陷、基础设施故障、依赖服务不可用**引发的异常，责任完全在服务提供方，属于非预期的系统级故障。

**典型场景**

- 代码逻辑错误：空指针异常、数组越界、类型转换异常、死循环、算法逻辑 bug

- 基础设施故障：数据库连接失败、Redis 宕机、MQ 消息发送失败、磁盘空间不足

- 依赖服务异常：调用第三方接口超时、内部微服务调用失败、熔断降级触发

- 资源耗尽：线程池耗尽、内存溢出、文件句柄不足

#### 异常分类举例

基于主键id查询用户信息，返回空，属于客户端异常

基于主键id查询到用户信息，但用户信息是加密的只允许特定人员查看，返回业务异常。

基于主键id查询用户信息，数据库不可用，则返回系统异常。



举例说明，一个审批流程，最后一个环节需要部门领导申请，但是部门领导没有该审批系统的权限，导致工单直接被卡住。这种业务异常的稽核规则应该前置，在提单子的时候应直接抛出异常：该流程需要部门领导审批，没有查询到您所属部门领导的账户信息，请核实后在提单子。

#### 架构设计理念

防御性编程：需要对可能发生的异常进行捕获，并处理。

Fail-Fast：外部请求在每一层都进行防御，如果存在异常，直接抛出，避免异常向下传递。

用户友好：所有的底层异常都要封装转换，向用户返回

可观测性：便于对HTTP状态码进行指标采集和监控。



#### 编程设计

这三类在服务端开发范式中，与`Controller-Service-Repository`三层对应。

【Controller-Service-Repository三层架构】

Controller：

Service：

Respository：





**异常层次架构**

```
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

自定义异常设计实践：

> 避免过度设计，参数可根据业务需求添加

```python
@dataclass
class AppException(Exception)
    message: str
    error_code: str  # 业务错误码
    http_status: int = 200  # HTTP状态码
    details: dict | None = None # 异常详情，上下文信息

@dataclass
class ClientException(AppException)
		message = "客户端异常"
  	http_status = 400

@dataclass
class BizException(AppException)
		message = "业务异常"
    http_status = 299

@dataclass
class ServerException(AppException)
		message = "服务器异常"
  	http_status = 500
```



## 异常抛出：`if-raise` | `try-except-raise`

什么时候抛出异常？什么时候是`if-raise`，什么时候是`try-except-raise`？

在软件开发中，异常不应被视为“失败”，而应视为一种**结构化的契约通信**。有效的异常抛出策略能让代码在崩溃前“优雅地拒绝”，并在发生不可控错误时“清晰地解释”。

### 异常发生的预期管理

异常并非随机产生的。根据**防御性编程**的原则，我们将异常分为两类预期：

- **可预见的违反约束，LBYL**：客户端输入了非法参数，或业务逻辑不满足前提条件。
- **不可控的环境失败，EAFP**：数据库连接断开、第三方接口超时或系统资源枯竭。

### 询问许可 (LBYL) 与 `if-raise`

这种模式遵循“先检查，后执行”的原则。当你明确知道哪些条件会导致程序进入非法状态时，应主动预防。

#### 接口层的客户端校验 (`ClientException`)

在接口入口处，我们**不信任任何外部输入**。使用 `if-raise` 可以在错误逻辑进入核心业务层之前将其拦截。

```python
def create_user(username, age):
    # LBYL: 主动预防非法输入
    if not username:
        raise ClientException("用户名不能为空", code=400)
    if age < 18:
        raise ClientException("未成年人禁止注册", code=403)
    
    # 执行业务逻辑...
```

#### 防御性业务逻辑 (`BizException`)

在业务深层，当某些业务前提不满足（例如余额不足、库存告急）时，主动抛出业务异常。这比返回 `False` 或 `None` 更具语义化，且能强制调用方处理。

```python
def withdraw_money(account_id, amount):
    account = db.get_account(account_id)
    # 防御性编程：如果不满足业务前提，主动拒绝
    if account.balance < amount:
        raise BizException("账户余额不足")
    
    account.balance -= amount
    account.save()
```

### 异常转换与 `try-except-raise`

当调用底层库、数据库或第三方 API 时，无法预测所有失败场景。此时需要捕获底层异常，并将其**包装（Wrap）**为面向用户的抽象异常。特别需要注意的是，在进行异常转换时需保留原始堆栈信息（异常链），便于进行异常诊断，不能直接丢弃。

#### 异常转换策略 (`ServerException`)

直接将 `OperationalError` 或 `ConnectionError` 抛给上一层是非常危险且不友好的，需通过 `try-except-raise` 进行异常转换（翻译）。

```python
def get_user_profile(user_id):
    try:
        return remote_api.fetch_user(user_id)
    except RemoteTimeoutError as e:
        # 将底层超时转换为可理解的服务端异常
        # 使用 'from e' 保留原始堆栈信息（异常链）
        raise ServerException("用户服务暂时不可用，请稍后再试") from e
    except Exception as e:
        # 兜底捕获，防止信息泄露
        logger.error(f"Unknown error: {e}")
        raise ServerException("内部系统错误") from e
```

### 铁律：严禁静默失败

无论选择哪种方式，**严禁使用空的 `except: pass`**。 静默失败（Silent Failure）是调试的噩梦。如果异常被捕获，它必须被：

- **处理**（如重试、回滚、记录日志）
- **转换**（重新抛出更高级别的异常）

```python
# 静默失败
def save_order(order):
    try:
        db.insert(order)
    except Exception:
        # 错误在这里消失了！
        # 既没有日志，也没有通知调用方，更没有回滚
        pass 
        # print("数据库异常") # 简单在中断打印错误信息，也应杜绝
    
    print("订单处理完成") # 哪怕数据库挂了，这里依然会打印成功
```

## 异常处理

异常处理的设计哲学可以用一句话概括：**早抛出，晚捕获(Throw Early, Catch Late)**。这种哲学的核心在于：让错误在发生的第一时间暴露，但在有足够上下文决策的地方统一解决。

本章节关注的异常处理。更具体地，回答2个问题：**时机和方式**。

### 核心理念

异常处理遵循**“责任链抛出、高层级分流”**的原则，通过明确各层对异常的边界职责，实现业务逻辑与错误处理的彻底解耦。**全局异常处理层。**

**异常责任链**，异常在系统中遵循「漏斗」模型流动：

- **平台层/Repository 层**：默认上抛，不作业务猜测。
- **Service 层**：充当“滤网”，负责过滤、补救或语义包装。
- **Controller 层**：异常透传，不对异常进行假设和处理，向上抛出。
- **全局异常处理层 (Interceptor)**：作为统一“出水口”，进行最后的分流与翻译。

### 异常流转策略

客户端请求 过滤器 拦截器 Controller Service Repository 拦截器 过滤器 客户端响应

【过滤器-Repository-Service-Controller-拦截器】

#### 默认上抛 (Repository层)

底层基础设施（如数据库、第三方 SDK）发生的异常应直接向上抛出至 Service 层。底层不具备业务语境，不应原地消解异常。

```python
# Repository 层：诚实报告技术故障
class UserRepository:
    def fetch_by_id(self, user_id: str):
        # 即使底层库有异常，也不在这里捕获，默认上抛
        return db.query(User).filter(User.id == user_id).one()
```

#### 异常补救 (Service层)

Service 层是唯一允许根据业务逻辑“挽回”异常的地方。只有当存在替代方案（备用服务、重试、默认值）时才进行捕获。

- *示例*：短信主通道失败，捕获异常并自动切换至备用通道。
- *示例*：缓存查询失败，捕获异常并降级去查询数据库。

```python
# Service 层：异常补救示例
def get_user_avatar(user_id: str):
    try:
        return cache.get(f"avatar:{user_id}")
    except CacheConnectionError:
        # 异常补救：缓存不可用时切换到数据库，不影响主流程
        return user_repo.fetch_avatar_from_db(user_id)
```

#### 主动上抛 (Service层)

Service 层通过主动防御确保系统不“带病运行”：主动预防与异常转换。

```python
# Service 层：主动抛出与转换示例
def transfer_funds(from_id, to_id, amount):
    # 1. if-raise: 主动防御
    if amount <= 0:
        raise BizException("转账金额必须大于零", code="INVALID_AMOUNT")
        
    try:
        bank_api.execute_transfer(from_id, to_id, amount)
    except APIResponseError as e:
        # 2. try-raise from: 异常转换，保留原始堆栈并赋予业务语义
        raise ServerException("第三方支付网关异常，请稍后重试") from e
```

#### 统一异常处理 (切面层)

所有未被 Service 层“自愈”的异常最终汇聚于切面层（Middleware/ErrorHandler）。在向用户返回消息前，切面层充当“外交官”，将程序内部的异常堆栈翻译为用户可理解、且不暴露系统细节的友好响应。它通过精确匹配异常类型，实现 HTTP 状态码映射、详细日志记录及信息脱敏。

切面层根据异常类型进行分类处理：

- **业务/客户端异常**：提取错误码，返回预期的提示信息。
- **服务端异常**：记录完整的异常日志，触发监控报警。

> 关于异常日志堆栈，可以开启再展开一篇文章展开描述。

```python
import logging
import traceback
from flask import jsonify, request

logger = logging.getLogger(__name__)

# 1. 客户端异常处理器：精确匹配 400 系列
@app.errorhandler(ClientException)
def handle_client_exception(e):
    # 记录详细日志辅助调试，但返回结果保持友好
    logger.warning(f"Client Error: {e.message} | Path: {request.path}")
    return jsonify({
        "success": False,
        "error_code": e.code or "BAD_REQUEST",
        "message": e.message
    }), 400

# 2. 业务逻辑异常处理器：映射为 299 (Unprocessable Entity)
@app.errorhandler(BizException)
def handle_business_exception(e):
    return jsonify({
        "success": False,
        "error_code": e.code or "BIZ_ERROR",
        "message": e.message
    }), 299

# 3. 服务端转换异常处理器：映射为 500
@app.errorhandler(ServerException)
def handle_server_exception(e):
    # traceback.format_exc() 捕获当前上下文的完整堆栈
    # 如果异常是由 'from e' 抛出的，它会自动包含原始异常的 trace
    stack_info = traceback.format_exc()
    
    # 特别记录：如果自定义异常定义了 cause 属性记录原始异常
    original_error = getattr(e, '__cause__', None)
    
    logger.error(
        f"Server Semantic Error: {e.message}\n"
        f"Original Cause: {original_error}\n"
        f"Full Stack: {stack_info}"
    )
    
    return jsonify({
        "success": False,
        "error_code": "INTERNAL_SERVER_ERROR",
        "message": e.message
    }), 500

# 4. 未知异常兜底策略：最高安全级别处理
@app.errorhandler(Exception)
def handle_fatal_exception(e):
    # 记录最详尽的堆栈，用于紧急定位 Bug
    logger.critical(f"FATAL UNKNOWN EXCEPTION: {str(e)}\n{traceback.format_exc()}")
    
    # 兜底策略：绝不向外暴露任何堆栈或底层错误信息 (防止 SQL 注入、表名泄露等)
    return jsonify({
        "success": False,
        "error_code": "SYSTEM_BUSY",
        "message": "系统繁忙，请稍后再试"
    }), 500
```

---

**职责汇总表**

| 层次           | 核心动作               | 对待异常的态度                   |
| -------------- | ---------------------- | -------------------------------- |
| **Repository** | `raise`                | 默认上抛技术异常                 |
| **Service**    | `remedy` / `raise`     | 补救可恢复异常，转换不可恢复异常 |
| **Controller** | **透明 (Vacuum)**      | 不做假设，不做处理               |
| **Aspect**     | `handle` / `translate` | 统一收割，分流映射，翻译响应     |

### 编程实践




## 总结

