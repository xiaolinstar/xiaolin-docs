---
id: asgi
term: ASGI
en: Asynchronous Server Gateway Interface
aliases:
  - 异步服务器网关接口
definition: WSGI 的异步继任者，专为支持 WebSocket、HTTP/2、长连接等异步协议设计，是 FastAPI / Starlette / 异步 Flask 等异步框架的标准接口。
enabled: true
---

对应的服务器实现：uvicorn（最常用）、daphne、hypercorn。与 WSGI 不兼容，但可在同一进程内通过 lifespan 协议并行处理 HTTP 与 WebSocket。