---
id: wsgi
term: WSGI
en: Web Server Gateway Interface
aliases:
  - Web Server Gateway Interface
definition: Python 生态定义 Web 服务器与应用框架之间的标准接口协议（PEP 3333），使 Flask / Django 等应用能与 gunicorn / uWSGI 等任意 WSGI 服务器解耦组合——只要两端都遵循该协议。
enabled: true
---

调用约定形如 `app:app`：`module:variable` 指向 Flask 应用对象（通常是 `app = Flask(__name__)`）。生产部署时通常搭配 `gunicorn module:variable` 调用。