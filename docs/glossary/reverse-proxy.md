---
id: reverse-proxy
term: 反向代理
en: Reverse Proxy
aliases:
  - 反代
definition: 位于用户与后端服务之间的代理入口：用户只与代理通信，代理将请求转发给内部后端进程并返回响应。
enabled: true
---

与正向代理相对：正向代理替用户访问外部资源，反向代理替后端接收公网请求。Nginx 是最常见的反向代理实现，还承担负载均衡、HTTPS 终结等职责。
