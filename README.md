# 🚀 AI持续运维｜xiaolin-docs

<p align="center">
  <img src="./docs/public/sparrow.svg" width="120" alt="Logo">
</p>

<p align="center">
  <strong>系统运维管理员的日常工作经验分享与 SRE 实践平台</strong>
</p>

<p align="center">
  <a href="https://xiaolinstar.cn">🌐 在线访问: xiaolinstar.cn</a>
</p>

---

## 📖 项目简介

`xiaolin-docs` 是一个基于 **VitePress** 构建的个人知识库系统。它不仅仅是一个静态文档站点，更是一个完整的 **SRE (Site Reliability Engineering)** 实践案例。

本项目集成了现代化的 **CI/CD 流水线**、**全栈可观测性方案** 以及 **容器化编排部署**，展示了从代码提交到生产环境稳定运行的全生命周期管理。

## 🌟 核心板块

### 🛠️ 运维与 SRE (SRE)
- **学习与思考**：SRE 实践、项目管理、异常处理架构、2026 运营规划等。
- **CI/CD & DevOps**：从 Jenkins 到 GitHub Actions 的演进，流水线设计，制品库管理。
- **可观测性**：日志系统演进、Grafana Loki、Prometheus 监控体系。

### 💻 开发与架构 (Development)
- **系统设计**：Redis 缓存、Nginx 负载均衡等高可用方案。
- **系统架构设计师**：软考高级备考经验、数据库系统知识、秒杀系统设计。

### 🤖 人工智能 (AI)
- **理论基础**：LLM 擅长领域、AI Coding 实践。
- **LLM 系统**：大语言模型相关技术探索。

### ☕ 效率工具
- **轻松办公**：Thunderbird 邮件管理、Markdown 语法、Mac 办公体验、Linux 学习。

---

## 🛠️ 技术栈与架构

### 核心引擎
- **文档方案**: [VitePress](https://vitepress.dev/) + [Mermaid](https://mermaid.js.org/) (绘图) + [MathJax](https://www.mathjax.org/) (公式)
- **服务端**: Nginx (静态资源代理 & 软负载)
- **包管理**: pnpm / npm

### 基础设施与运维 (SRE Capabilities)
- **容器化**: Docker & Docker Compose
- **集群编排**: Kubernetes (K8s)
- **CI/CD**: GitHub Actions
- **可观测性 (Observability)**:
  - **指标监控**: Prometheus + Grafana + Node Exporter + Nginx Exporter
  - **日志管理**: Grafana Loki + Promtail

---

## 🚀 快速开始

### 本地开发 (Local Development)

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm docs:dev
```

### 容器化运行 (Docker Compose)

本项目采用**网关与服务分离**的架构设计，提供两个 Docker Compose 文件：

#### 1. 独立服务模式 (`compose.yaml`)

适用于网关部署在独立服务器的场景，仅启动文档网站服务：

```bash
docker compose -f compose.yaml up -d
```

- **网站访问**: [http://localhost:8080](http://localhost:8080)

#### 2. 完整环境模式 (`docker-compose.yaml`)

包含完整的可观测性栈，适用于本地开发或独立部署：

```bash
docker-compose up -d
```

- **网站访问**: [http://localhost](http://localhost)
- **Grafana 看板**: [http://localhost:9000](http://localhost:9000) (已预置 Prometheus & Loki 数据源)
- **Loki 接口**: [http://localhost:3100](http://localhost:3100)

---

## ⚓ 部署方案

### 1. GitHub Actions (推荐)
配置文件位于 `.github/workflows/`：
- **CI**: `ci-ghcr.yml` - 构建 Docker 镜像并推送至 GHCR (南京大学镜像加速)。
- **CD**: `cd-ghcr.yml` - 部署至生产环境。
- **Pages**: `page.yml` - GitHub Pages 预览部署。

### 2. Kubernetes
提供全套 K8s 部署清单文件（`k8s/` 目录）：
```bash
kubectl apply -f k8s/
```

---

## 📊 可观测性展示

本项目深度集成了 **Grafana 生态**，实现了以下监控能力：

- **系统监控**: 监控 Linux 宿主机 CPU、内存、磁盘等指标。
- **Nginx 监控**: 实时分析并发连接、请求速率及服务状态（通过 `stub_status`）。
- **日志聚合**: Promtail 实时收集 Nginx 日志并发送至 Loki，在 Grafana 中进行实时查询。

---

## 📅 更新日志

- **2026-03-30**: 项目分离，专注于技术内容，移除生活相关板块
- **2026-02-06**: 重构 README，完善 SRE 架构描述，更新 2026 运营规划文档。
- **2025-12-10**: 全面接入 GitHub Actions CI/CD 流水线。
- **2025-09-01**: 支持 Kubernetes 全自动化部署。
- **2025-01-25**: 集成 Prometheus + Grafana + Loki 全栈可观测性系统。

---

## 🤝 关注作者

<div align="center">
  <p><b>微信公众号：AI持续运维</b></p>
  <p>掘金：AI持续运维</p>
  <p>Copyright © 2026 XingXiaolin</p>
</div>
