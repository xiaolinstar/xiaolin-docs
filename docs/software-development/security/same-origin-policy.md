---
title: 浏览器同源策略与 Nginx 跨域全链路解析
description: 解析前后端分离架构下的完整交互链路：Nginx 动静分工（静态资源代理 vs 反向代理）、浏览器同源策略（SOP）本质、跨域拦截机制与 Nginx 同域收敛最佳实践。
date: 2026-06-03
updated: 2026-08-16
category: 开发架构
tags:
  - 安全
  - Nginx
  - 跨域
  - 架构设计
---

在现代前后端分离架构中，“前端调不通后端 API”通常是新手开发者和运维工程师最常撞墙的场景。控制台报错 `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy` 往往让人困惑：**请求到底发出去没有？为什么后端收到了数据但前端拿不到响应？Nginx 是如何在这条链路中优雅化解跨域难题的？**

本文将从 Web 交互的全链路出发，讲透 Nginx 的动静代理职责、浏览器同源策略的底层逻辑以及生产级跨域解决方案。

## 一、前后端交互全链路图景

在典型的生产部署架构中，客户端浏览器并不直接与后端业务进程打交道，而是通过 Nginx 作为统一网关入口：

```
┌─────────────────────────────────────────────────────────────┐
│                    用户浏览器 (Client)                       │
└──────────────┬───────────────────────────────▲──────────────┘
   1. 访问 /   │                               │ 2. 返回 HTML/CSS/JS (静态资源)
   3. 发起请求 │ /api/v1/users (同域 API 请求)   │ 6. 返回 JSON 业务数据
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                  Nginx (公网唯一入口 :80/:443)                │
│                                                             │
│  ├─ location / { root /var/www/dist; }     -> 【功能一：静态代理】
│  └─ location /api/ { proxy_pass :8080; }   -> 【功能二：反向代理】
└──────────────────────┬───────────────────────▲──────────────┘
                       │ 4. 内网转发           │ 5. 处理响应
                       ▼                       │
               ┌───────────────────────────────┴──────────────┐
               │    后端 API 进程 (Spring Boot / Flask :8080)   │
               └──────────────────────────────────────────────┘
```

### 交互链路的两个关键阶段

1. **阶段一 · 静态资源拉取（静态代理）**：
   - 用户在浏览器输入 `https://example.com`。
   - Nginx 根据 `location /` 匹配规则，从本地磁盘（如 `/var/www/dist`）直接读取 HTML/CSS/JS 文件并返回。
   - 浏览器解析 HTML，执行 JavaScript 脚本构建页面 DOM。

2. **阶段二 · 异步数据请求（反向代理）**：
   - 前端 JS 脚本执行，发起 `fetch('/api/v1/users')` 或 Axios 异步请求。
   - 请求再次到达 Nginx，Nginx 根据 `location /api/` 规则，通过 `proxy_pass http://127.0.0.1:8080` 将请求转发给后端 API 进程。
   - 后端处理业务逻辑并返回 JSON 数据，Nginx 原路回传给浏览器，前端 JS 拿到数据渲染视图。

---

## 二、Nginx 的两大核心能力剖析

### 1. 静态资源代理（Web Server）
- **核心指令**：`root`、`alias`、`try_files`、`sendfile`。
- **作用**：高效托管打包后的前端产物（Vue / React / VitePress `dist/`），零代码执行开销，充分利用 Linux 内核的 Zero-Copy 能力与浏览器强缓存。

### 2. 反向代理（Reverse Proxy）
- **核心指令**：`proxy_pass`、`proxy_set_header`。
- **作用**：替后端常驻进程（Spring Boot、Flask、Node.js）接收外部请求。实现内网隔离、负载均衡、SSL/TLS 卸载以及最关键的——**同域收敛规避跨域**。

---

## 三、浏览器同源策略与跨域本质

### 什么是同源（Same-Origin）？
只有当两个 URL 的 **协议（Protocol）**、**域名（Host）**、**端口（Port）** 三者完全相同时，才被称作“同源”：

| 比较 URL（基准：`https://example.com:443/app`） | 是否同源 | 原因 |
| :--- | :--- | :--- |
| `https://example.com/api` | ✅ **同源** | 协议、域名、默认端口 443 均一致 |
| `http://example.com/api` | ❌ **跨域** | 协议不同（HTTP vs HTTPS） |
| `https://api.example.com/api` | ❌ **跨域** | 子域名不同 |
| `https://example.com:8080/api` | ❌ **跨域** | 端口不同 |

### 跨域拦截的真相
> **核心认知**：跨域限制是**浏览器端**为了防范 CSRF / 数据窃取实施的安全策略，**并不是服务器端拒绝处理请求**。
>
> 当跨域发生时，浏览器通常已经把请求发到了后端，后端也成功执行并返回了响应；但浏览器在校验响应头时发现缺少合法的 CORS 允许声明，因此**在浏览器沙箱层拦截了 JavaScript 读取响应数据的权限**。

---

## 四、Nginx 解决跨域的两大武器

### 方案 A · 同域收敛（生产环境黄金实践）

**思路**：利用 Nginx 统一分发，让前端页面和后端接口在浏览器看来“天生属于同一个源”。

```nginx
server {
    listen 80;
    server_name example.com;

    # 1. 静态页面（同源）
    location / {
        root /var/www/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. 接口反向代理（同源）
    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
- **前端调用**：`axios.get('/api/users')`（直接使用相对路径）。
- **优势**：彻底消除跨域概念，无需预检请求（OPTIONS），性能最好、安全性最高。

### 方案 B · 网关层统一注入 CORS 响应头

**思路**：在必须进行跨域访问（如开放平台、微前端、多独立域名）的场景下，由 Nginx 统一响应预检请求并注入 CORS 头，后端代码零修改。

```nginx
location /api/ {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    proxy_pass http://127.0.0.1:8080/;
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
}
```

---

## 五、小结与决策建议

| 场景 | 推荐方案 | 理由 |
| :--- | :--- | :--- |
| **标准前后端分离 Web 项目** | **Nginx 同域收敛（方案 A）** | 简单、零跨域开销、架构清晰。 |
| **第三方开放 API / 多子域名集成** | **Nginx 统一 CORS 头（方案 B）** | 集中化管理，避免在每个微服务重复写跨域 Filter。 |
| **本地开发调试** | **Vite / Webpack DevServer Proxy** | 本地模拟 Nginx 反代，保持与生产行为一致。 |

---

## 关联阅读

- [SRE 运维 01 ｜ Nginx 静态资源代理与托管](../../sre/devops/foundation/delivery-start.md)
- [SRE 运维 03 ｜ 服务端应用部署：依赖、运行时与进程保活](../../sre/devops/foundation/server-side-deploy.md)
- [安全实践 ｜ 认证授权基础与 Cookie 安全](./basis-of-auth.md)