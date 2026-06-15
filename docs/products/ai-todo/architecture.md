# ai-todo 技术架构

ai-todo 的技术架构围绕一个目标设计：为人类和 AI Agent 提供同一套稳定的个人事务数据能力。

小程序、CLI 和 Agent Skill 都围绕后端服务工作，避免多端逻辑分裂。REST API 当前不作为公开接入方式，现阶段优先开放 CLI。

## 总体架构

```text
apps/
  api/              # 后端 API 服务
  cli/              # 命令行工具
  miniapp/          # 微信小程序
  ios/              # 预留 iOS 原生 App
  android/          # 预留 Android 原生 App
  harmony/          # 预留 HarmonyOS 原生 App
packages/
  shared/           # 共享类型
  api-client/       # API 客户端
  agent-protocol/   # Agent 工具协议
```

## 后端

后端采用 Python + FastAPI + PostgreSQL + Alembic。

核心能力：

- 用户隔离；
- 软删除；
- 审计日志；
- 幂等操作；
- 限流防护；
- 内部 API；
- JSON 字段使用 camelCase。

## 认证体系

ai-todo 区分人类入口和 Agent 入口：

- **小程序**：微信登录 + 会话 Token；
- **CLI / Agent**：Personal Access Token（PAT）；
- **权限隔离**：所有数据按 `user_id` 强隔离。

这种设计可以让用户在小程序里管理自己的访问令牌，也方便随时撤销 Agent 权限。

## CLI 设计

CLI 是 Agent 接入的首选方式。

设计要求：

- 所有命令支持 `--json`；
- 错误输出可被 Agent 稳定解析；
- 时间字段统一使用 ISO 8601；
- 写操作支持幂等能力；
- 命令语义与后端资源保持一致。

## 小程序设计

微信小程序承担人类用户的日常交互入口。

它需要覆盖：

- 今日事项；
- 提醒事项；
- 日历事项；
- 联系人管理；
- CLI / Agent 访问令牌管理；
- 微信订阅消息提醒。

小程序不内置 AI 能力，也不负责自然语言解析。它只提供确定、可控、轻量的图形化操作体验。

## 数据边界

ai-todo 保持数据模型克制：

- 不做团队项目管理；
- 不做复杂审批流；
- 不做文档协作；
- 不做企业 IM；
- 不在服务端保存大模型推理上下文。

它只保存待办小程序所需的提醒、日历、联系人以及必要的审计数据。

## 开发文档

更多技术细节建议在 ai-todo 仓库中继续补齐：

- `docs/api-design.md`：API 设计文档；
- `docs/developer-guide.md`：开发者指南；
- `docs/deploy.md`：部署文档。
