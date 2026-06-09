
# ai-todo：AI 原生的待办、日历与联系人管理系统

ai-todo 是一个轻量级的 AI 原生待办管理系统，以微信小程序为核心入口，不内置自然语言解析能力，支持多端多平台，通过自动闭环 SKILL 与 OpenClaw、Claude Code 等 AI 工具无缝集成，提供稳定、结构化、可审计的 API 和 CLI。

## 产品理念

ai-todo 的设计理念围绕三个核心维度展开：

### 面向 Human 与 Agent 的双重设计

ai-todo 同时服务于人类用户和 AI Agent，提供不同的交互入口：

- **面向人类**：提供直观的微信小程序图形化界面，无需安装 App，直接嵌入微信生态，电脑端也可登入使用；支持快速记录、查看和管理待办事项，操作规则清晰确定，符合人类使用习惯
- **面向 Agent**：提供结构化的 CLI 和 REST API，支持 `--json` 输出，方便 OpenClaw、Claude Code、Cursor 等 AI 工具稳定调用

【说明下为什么这么设计？】

【使用场景介绍，画图表达】

自然语言解析由外部 Agent 完成，ai-todo 专注于提供可靠的数据存储和操作能力

### 轻量级设计

作为一款轻量工具，ai-todo 专注核心功能，避免过度复杂：

- **聚焦核心**：以提醒事项、日程和联系人为核心，不引入复杂的项目管理或团队协作功能
- **快速上手**：微信小程序无需安装，即用即走
- **性能优先**：后端采用 FastAPI + PostgreSQL，响应迅速，资源占用低

### 开放与多平台支持

ai-todo 支持多种终端和平台，满足不同场景需求：

- **微信小程序**：核心入口，适合日常快速操作
- **CLI 命令行**：适合开发者和 AI Agent 使用
- **REST API**：支持第三方集成和自定义开发
- **多端预留**：架构设计预留 iOS、Android、HarmonyOS 原生应用扩展空间

**核心原则**：专注能力层，不内置自然语言解析。让专业的 AI 工具做理解，让 ai-todo 做可靠的执行和存储。

## 什么是 ai-todo

ai-todo 由三个核心模块组成：

### 1. 提醒事项（Reminder）
提醒事项回答的是：**「有什么事情需要我记得完成？」**

典型场景：
- 周五前提交报销
- 晚上记得给家人打电话
- 回家前去超市买牛奶

特点：
- 关注事情本身和完成状态
- 可以有截止时间，但不一定占用日历时间
- 适合轻量记录、快速捕捉

### 2. 日程（Calendar）
日程回答的是：**「我在某个时间要做什么？」**

典型场景：
- 今天 14:00 开会
- 周六 10:00 参观博物馆
- 明天 19:00 和朋友吃饭

特点：
- 关注时间点或时间段
- 有明确的开始/结束时间
- 可以关联地点、参与人

### 3. 联系人（Contacts）
联系人是 AI 个人助理的**基础上下文能力**。

典型场景：
- 「提醒我明天给张三发方案」
- 「把今天的会议纪要发给 Alice」
- 「下周约李雷吃饭」

特点：
- 管理姓名、昵称、公司、邮箱、手机号等基础信息
- 可以被提醒和日程引用
- 让 AI 稳定知道「某个人是谁，以及可以如何联系」

## 谁适合用 ai-todo

### 1. AI 工具深度用户
如果你已经在使用 OpenClaw、Claude Code、Cursor 等 AI 工具，ai-todo 是完美的配套。你可以用自然语言告诉 AI「帮我安排明天的会议」，AI 会调用 ai-todo 的结构化接口完成。

### 2. 喜欢命令行的开发者
CLI 工具提供了高效的操作方式，所有命令都支持 `--json` 输出，方便脚本化和自动化。

### 3. 需要结构化数据的用户
如果你希望自己的待办、日程数据是结构化、可导出、可审计的，ai-todo 是不错的选择。

## 快速上手

### 方式一：微信小程序

微信小程序是最容易上手的方式，适合日常快速记录和查看。

1. 打开微信小程序（目前需自行部署或使用测试版）
2. 微信登录
3. 开始创建提醒、日程和联系人

### 方式二：CLI 命令行工具

CLI 是 AI Agent 和高级用户的主要入口。

**安装：**
```bash
npm install -g @xiaolinstar/ai-todo-cli
```

**配置：**
在微信小程序中「我的 → CLI / Agent 访问令牌 → 创建」，然后配置到本地：
```json
{
  "url": "https://xingxiaolin.cn",
  "token": "aitodo_xxx"
}
```
保存到 `~/.ai-todo/settings.json`

**常用命令：**
```bash
# 查看今天
ai-todo today --json

# 创建提醒
ai-todo reminder create \
  --title "给客户王总发报价确认邮件" \
  --due "2026-06-09T10:00:00+08:00" \
  --json

# 标记完成
ai-todo reminder done &lt;reminder_id&gt; --json

# 创建日程
ai-todo calendar add \
  --title "产品评审" \
  --start "2026-06-09T14:00:00+08:00" \
  --end "2026-06-09T15:00:00+08:00" \
  --json

# 搜索联系人
ai-todo contact search "王总" --json

# 创建联系人
ai-todo contact add "王总" --handle wangzong --email wang@example.com --json
```

### 方式三：Agent 集成

ai-todo 提供了 Skill，可以直接集成到 Claude、Cursor 等工具中。

将 `skills/ai-todo/` 目录复制到 Agent 的 skills 目录即可。

**推荐工作流：**

用户说「明天十点提醒我给王总发邮件」→ Agent 解析意图 → 搜索联系人 → 创建提醒：
```bash
# 1. 搜联系人
ai-todo contact search "王总" --json

# 2. 创建提醒（关联联系人）
ai-todo reminder create \
  --title "给客户王总发报价确认邮件" \
  --due "2026-06-09T10:00:00+08:00" \
  --contact &lt;contact_id&gt; \
  --json
```

## 技术架构

### 后端
- **技术栈**：Python + FastAPI + PostgreSQL + Alembic
- **核心能力**：用户隔离、软删除、审计日志、幂等操作、限流防护
- **API 风格**：RESTful，JSON 字段使用 camelCase

### 多端架构
```
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

### 认证体系
- **小程序**：微信登录 + 会话 Token
- **CLI/Agent**：Personal Access Token（PAT）
- **权限隔离**：所有数据按 `user_id` 强隔离

## 开发与接入

### API 接入
所有 API 都在 `/v1/*` 路径下，使用 Bearer Token 认证。

**示例：创建提醒**
```bash
curl -X POST https://xingxiaolin.cn/v1/reminders \
  -H "Authorization: Bearer aitodo_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "title": "给客户发方案",
    "dueAt": "2026-06-09T10:00:00+08:00"
  }'
```

### 开发者指南
更多技术细节请参考 ai-todo 仓库中的文档：
- `docs/api-design.md` - API 设计文档
- `docs/developer-guide.md` - 开发者指南
- `docs/deploy.md` - 部署文档

## 总结

ai-todo 不是另一个待办应用，而是一个**AI 原生的个人数据平台**。它把「理解自然语言」交给 AI 工具，自己专注做好「可靠存储和结构化操作」这件事。

如果你已经在使用 AI 工具提升效率，ai-todo 可以让这些工具更好地帮你管理生活和工作。
