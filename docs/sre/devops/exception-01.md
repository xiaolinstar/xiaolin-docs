---
title: Exception异常架构设计：基础（01）
description: 监控告警、故障诊断是运维工程师的核心工作之一，而异常是其基石，打好了异常处理这块地基，在上层治理时，便会事半功倍。
date: 2026-02-13
updated: 2026-02-13
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

# Exception异常架构设计：基础（01）

监控告警、故障诊断是运维工程师的核心工作之一，而异常是其基石，打好了异常处理这块地基，在上层治理时，便会事半功倍。异常的架构设计，是业务无关的，大多数开发工程师都不会特别关注，什么时候抛异常，什么时候处理异常都看心情和习惯。互联网上关于异常的系统性研究文章几乎没有，我将花费一段时间，由浅入深探究异常架构设计。

异常分为两部分来研究：异常架构设计、异常治理。前者侧重**法**，后者侧重**术**（道法术器）。

---

异常架构设计原则（个人总结的四项设计准则）：

- 防御性编程
- fail-fast，快速失败
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

```text
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

```text
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