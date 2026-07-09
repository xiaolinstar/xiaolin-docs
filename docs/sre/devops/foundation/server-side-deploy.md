---
title: 04 ｜ 服务端应用部署：依赖地狱与环境一致性
description: 从静态站点过渡到服务端应用，以 Flask 为例演示两种部署策略各自的痛点——服务器构建的性能与依赖问题、本地构建的环境不一致问题，引出容器化需求。
date: 2026-07-10
updated: 2026-07-10
category: SRE 运维
tags:
  - DevOps
  - Flask
  - 服务端部署
---

前三篇文章部署的都是纯静态资源——HTML、CSS、JS，放到 Nginx 目录下就能跑。但真实应用不止是页面展示，还需要**服务端能力**：处理用户请求、读写数据库、调用外部接口。

这篇文章要解决的问题是：**服务端应用部署到服务器，会遇到什么坑？**

## 静态站点的局限

静态站点的工作方式是：浏览器请求一个文件，Nginx 从磁盘读取返回。没有计算逻辑，没有依赖库，没有运行时。

但如果你想做一个「用户提交表单 → 保存到数据库 → 返回结果」的功能，纯静态站点做不到。你需要一个**服务端程序**在服务器上持续运行，接收请求、处理逻辑、返回响应。

## 以 Flask 为例

Flask 是 Python 生态中最轻量的 Web 框架，几行代码就能跑起一个服务端应用。

一个最小的 Flask 应用只需要两个文件：

`app.py`：

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

`requirements.txt`：

```text
flask==3.1.1
```

本地跑通：

```bash
pip install -r requirements.txt
python app.py
```

浏览器访问 `http://localhost:5000`，看到「Hello from Flask!」。本地开发到这一步没问题。

接下来，把它部署到服务器上。

## 部署策略一：在服务器上构建

最直接的思路：把源代码传到服务器，在服务器上安装依赖、启动应用。

```bash
# 上传源代码
scp -r ./flask-app root@你的公网IP:/opt/flask-app

# 登录服务器
ssh root@你的公网IP

# 安装依赖
cd /opt/flask-app
pip install -r requirements.txt

# 启动应用
python app.py
```

浏览器访问 `http://你的公网IP:5000`，跑通了。但问题随之而来：

**依赖安装耗时、占资源**

`pip install` 需要下载包、编译扩展。如果依赖里有 NumPy、Pandas 这类需要编译的库，安装过程可能耗时几分钟甚至十几分钟，期间 CPU 和内存被大量占用。如果服务器上同时运行着线上服务，构建过程可能拖垮正在运行的应用。

**服务器缺少编译环境**

有些 Python 包依赖系统级的 C 库。比如安装 `psycopg2`（PostgreSQL 驱动）需要 `libpq-dev`，安装 `Pillow`（图片处理）需要 `libjpeg-dev`。在服务器上装这些系统库，不仅麻烦，还可能和已有软件冲突。

**依赖安装失败**

服务器的 Python 版本是 3.10，本地开发用的 3.12。某些依赖要求 Python 3.11+，`pip install` 直接报错。或者系统缺少某个头文件，编译阶段就挂了。

## 部署策略二：在本地构建后上传

换个思路：在本地把依赖装好、构建完成，只把产物传到服务器。

```bash
# 本地安装依赖
pip install -r requirements.txt

# 本地构建（如果有构建步骤的话）
# ...

# 上传产物
scp -r ./flask-app root@你的公网IP:/opt/flask-app
```

服务器上不需要 `pip install`，直接启动就行。依赖安装的耗时和编译问题避开了，但新的问题出现了：

**环境不一致**

本地是 macOS + Python 3.12，服务器是 Ubuntu + Python 3.10。本地装的依赖是在 macOS 上编译的二进制文件，传到 Linux 上可能无法运行。

常见的报错：

```text
OSError: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.28' not found
```

```text
ModuleNotFoundError: No module named '_ssl'
```

这就是经典的「在我电脑上能跑」——本地环境和生产环境的差异导致的。

**动态链接库缺失**

Python 包里的 `.so` 文件（编译好的扩展）是针对特定操作系统和 Python 版本编译的。本地编译的 `.so` 文件放到服务器上，可能因为 glibc 版本不同、Python 版本不同而无法加载。

## 两条路的共同困境

不管在哪构建，核心问题是一样的：**代码、依赖、运行环境是割裂的**。

| | 在服务器上构建 | 在本地构建后上传 |
| --- | --- | --- |
| 依赖安装 | 耗时、占资源、可能失败 | 不需要 |
| 环境一致性 | 服务器环境 ≠ 本地环境 | 本地产物 ≠ 服务器环境 |
| 迁移成本 | 换服务器要重装一遍 | 换服务器可能跑不起来 |

两种策略都在「环境」上栽跟头。根本原因是：我们只传了代码和依赖，但没有传**运行环境本身**。

## 需要一种打包方式

如果能把「代码 + 依赖 + 运行环境」打成一个包，这个包到任何机器上都能直接运行，不依赖目标机器上预装了什么——上面的问题就都解决了。

这正是容器化要解决的问题。下一篇，我们引入 Docker，看看它是怎么把运行环境一起打包的。

## 小结

服务端应用部署面临的核心困境是：不管在服务器上构建还是本地构建，都无法保证环境一致性。在服务器上构建，受制于编译环境和资源；在本地构建，受制于平台差异。

两种策略的共同痛点是「代码、依赖、运行环境割裂」。容器化的价值就是把三者打包在一起，实现「到哪都能跑」。

## 思考

1. 如果你的 Flask 应用依赖 PostgreSQL 客户端库，服务器上没装 PostgreSQL，`pip install psycopg2` 会怎样？
2. 本地 macOS 编译的 Python 包，能直接传到 Linux 服务器上用吗？为什么？
3. 如果你有 10 个 Python 项目，每个依赖不同版本的 Flask，在同一台服务器上怎么隔离？

## 参考

1. [Flask 官方文档](https://flask.palletsprojects.com/)
2. [Python 虚拟环境 venv](https://docs.python.org/3/library/venv.html)
3. [pip 安装与依赖管理](https://pip.pypa.io/en/stable/)
