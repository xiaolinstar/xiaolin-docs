# AI持续运维 · xiaolin-docs

<p align="center">
  <img src="./docs/public/sparrow.svg" width="120" alt="Logo">
</p>

<p align="center">
  <strong>SRE、DevOps 与 AI 技术实践 · 个人知识库与内容分发仓库</strong>
</p>

<p align="center">
  <a href="https://xiaolinstar.cn">在线站点 xiaolinstar.cn</a>
  ·
  <a href="https://github.com/xiaolinstar/xiaolin-docs">GitHub</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VitePress-1.6-646cff?logo=vite&logoColor=white" alt="VitePress">
  <img src="https://img.shields.io/badge/pnpm-workspace-111?logo=pnpm&logoColor=f69220" alt="pnpm">
  <img src="https://img.shields.io/badge/creator--suite-1.0.0-blue" alt="creator-suite">
  <img src="https://img.shields.io/badge/site-0.1.0-green" alt="site version">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License"></a>
</p>

---

## 项目简介

`xiaolin-docs` 是基于 [VitePress](https://vitepress.dev/) 的个人技术知识库，同时作为 **SRE 全链路实践案例**（CI/CD、容器化、可观测性）与 **AI Agent 内容工作流** 的 monorepo。

| 能力 | 说明 |
|------|------|
| **公开站点** | `docs/` 权威原文，构建为静态站点 |
| **分发加工** | `content/dist/` 多平台发布稿，Git 管理、不上站 |
| **Agent Skills** | `.claude/` 项目 skill + `.agents/` 外部 skill，兼容 Cursor / Claude |
| **运维栈** | Docker、K8s、GitHub Actions、Prometheus + Grafana + Loki |

---

## 仓库结构

```
xiaolin-docs/
├── docs/                          # Origin：VitePress 权威原文（公开收录）
│   ├── .vitepress/config.mts      # 导航 / 侧栏 / srcExclude
│   ├── sre/                       # SRE、DevOps、可观测性
│   ├── ai/                        # AI 理论与 LLM 实践
│   ├── software-development/      # 架构与安全
│   ├── products/                  # 自研产品文档
│   └── easy-office/               # 效率工具
│
├── content/dist/{slug}/           # Output：多平台分发稿（不上站）
│   ├── meta.yaml                  # 溯源 origin、发布状态
│   ├── wechat.md                  # 公众号
│   ├── xiaohongshu.md             # 小红书
│   └── …                          # 掘金 / B 站 / 抖音等
│
├── .claude/skills/creator-suite/  # 自媒体技能包（项目自建）
│   ├── VERSION                    # 架构版本（大改动递增 MAJOR）
│   ├── content-repurpose/         # 一源多用编排
│   ├── wechat-publisher/          # 公众号 Generate / Polish
│   └── shared/                    # brand-voice、platform-specs
│
├── .agents/skills/                # 外部安装 skill（find-skills、gh-cli 等）
├── .github/workflows/             # CI / CD / Pages
├── k8s/                           # Kubernetes 清单
├── compose.yaml                   # 独立服务模式
└── docker-compose.yaml            # 完整可观测性栈
```

### Origin vs Output

| 类型 | 路径 | Git | VitePress 站点 |
|------|------|-----|----------------|
| **Origin 原文** | `docs/**/*.md` | 提交 | 公开收录 |
| **Output 加工** | `content/dist/{slug}/` | 提交 | 不上站 |

详见 [`content/dist/README.md`](./content/dist/README.md)。

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- [pnpm](https://pnpm.io/)（推荐）

### 本地开发

```bash
git clone https://github.com/xiaolinstar/xiaolin-docs.git
cd xiaolin-docs

pnpm install
pnpm docs:dev          # 开发服，默认 http://localhost:5173
pnpm docs:build        # 生产构建
pnpm docs:preview      # 预览构建产物
pnpm docs:check-links  # 站内链接检查
```

新增 `docs/` 文章时，请同步更新 `docs/.vitepress/config.mts` 中的 `nav` 与 `sidebar`。

### 容器化运行

**独立服务模式**（仅文档站点）：

```bash
docker compose -f compose.yaml up -d
# http://localhost:8080
```

**完整环境**（含 Prometheus、Grafana、Loki）：

```bash
docker compose -f docker-compose.yaml up -d
# 站点 http://localhost · Grafana http://localhost:9000
```

---

## 内容工作流（creator-suite）

```
docs/ Origin（权威原文）
    │
    ├─ content-repurpose ──→ content/dist/{slug}/  多平台包
    └─ wechat-publisher  ──→ wechat.md            公众号稿
```

- 技能包版本：[`.claude/skills/creator-suite/VERSION`](./.claude/skills/creator-suite/VERSION)（当前 **1.0.0**）
- 变更记录：[`CHANGELOG.md`](./.claude/skills/creator-suite/CHANGELOG.md)
- 账号矩阵：主号 **AI持续运维**（公众号、掘金、知乎、B 站等）；副号 **一只羊驼驼**（小红书、抖音）

Agent 通用规则见 [`AGENTS.md`](./AGENTS.md) / [`CLAUDE.md`](./CLAUDE.md)。

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 文档 | VitePress、Mermaid、MathJax、vitepress-plugin-llms |
| 包管理 | pnpm workspace |
| 部署 | Nginx、Docker、Kubernetes、GitHub Actions → GHCR |
| 可观测性 | Prometheus、Grafana、Loki、Promtail、Node / Nginx Exporter |

### GitHub Actions

| Workflow | 用途 |
|----------|------|
| `ci-ghcr.yml` | 构建镜像推送 GHCR |
| `cd-ghcr.yml` | 生产部署 |
| `page.yml` | GitHub Pages 预览 |

---

## 站点板块

- **SRE 运维**：CI/CD、异常架构、可观测性、Jenkins、K8s
- **开发架构**：Redis、Nginx、软考架构师、安全认证
- **AI 实践**：Agent Skills、Harness Engineering、LLM 工具链
- **软件产品**：ai-todo、party-helper 等
- **效率工具**：Markdown、邮件 CLI、Mac / Linux 办公

---

## 更新日志

| 日期 | 说明 |
|------|------|
| 2026-06 | creator-suite v1.0.0：Origin/Output 分层、wechat-publisher、`.agents` 目录规范化 |
| 2026-03 | 项目分离，专注技术内容 |
| 2025-12 | 接入 GitHub Actions CI/CD |
| 2025-09 | Kubernetes 自动化部署 |
| 2025-01 | Prometheus + Grafana + Loki 可观测性栈 |

---

## 开源协议

本项目采用 [MIT License](./LICENSE) 开源。

- **可引用、可修改、可再分发**（含商用）
- **须保留**原版权声明与本许可全文（注明出处为 **xiaolinstar** / 本仓库链接即可）

---

## 关注作者

<div align="center">

**微信公众号 · 掘金：AI持续运维**

Copyright © 2026 [xiaolinstar](https://github.com/xiaolinstar) · [MIT License](./LICENSE)

</div>
