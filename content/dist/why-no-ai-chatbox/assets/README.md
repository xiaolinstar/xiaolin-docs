# 配图清单 · why-no-ai-chatbox

> 截图母本放本机 `docs/public/images/img-ai-todo/why-no-ai-chatbox/`（不进 Git），上传 COS 后 Origin / 公众号引用 CDN URL。  
> 规范见 [文档媒体规范](../../../docs/sre/planning/media-standards.md) 与 [content/dist/README.md](../README.md#产品截图与占位符)。

## CDN 前缀

| 项 | 值 |
|----|-----|
| 本地目录 | `docs/public/images/img-ai-todo/why-no-ai-chatbox/` |
| COS 键前缀 | `docs/img-ai-todo/why-no-ai-chatbox/` |
| CDN 基址 | `https://media.xiaolin.fun/docs/img-ai-todo/why-no-ai-chatbox/` |

## 截图列表

| ID | 文件名 | 内容 | 插入位置（Origin） | 公众号 | 状态 |
|----|--------|------|-------------------|--------|------|
| `flow-4step` | `01-flow-4step.png` | 邮件 → Agent → CLI → 小程序 流程图 | `## 举个真实的用法` 段首 | `## 一条链路怎么跑通` 替换文字流程 | pending |
| `miniapp-list` | `02-miniapp-list.png` | 小程序提醒列表（含至少 1 条 Agent 写入的待办） | `## 三块东西，各干各的` 段末 | 可选补图 | pending |
| `miniapp-reminder` | `03-miniapp-reminder-detail.png` | 提醒详情 / 编辑页（展示微信提醒开关） | `## 那小程序还重要吗` 段首 | `## 小程序仍然重要` 段首 | pending |
| `cli-today` | `04-cli-today.png` | 终端 `ai-todo today --json` 输出（可打码 token） | `## 举个真实的用法` 代码块后 | 一般不放（公众号代码块体验差） | pending |
| `wechat-cover` | `05-wechat-cover.png` | 公众号封面 900×383 | 仅公众号后台 | 封面 | optional |

## 补图工作流

```bash
# 1. 截图放入本地目录（按上表文件名）
# 2. 上传 COS
pnpm run media:upload   # 或 bash scripts/upload-media-cos.sh docs/public/images/img-ai-todo

# 3. Origin：去掉对应 <!-- shot:... --> 注释，启用 ![alt](cdn-url)
# 4. 公众号：下载 CDN 图手动上传后台（微信不支持外链图床）
# 5. 校验
pnpm run media:cdn-check
pnpm run docs:check-links

# 6. 本表 status 改为 done
```

## Markdown 占位符约定

Origin 中使用统一注释，与 ID 对应：

```markdown
<!-- shot:miniapp-list -->
<!-- ![AI 日省待办提醒列表](https://media.xiaolin.fun/docs/img-ai-todo/why-no-ai-chatbox/02-miniapp-list.png) -->
```

补图时：删除 `<!-- shot:... -->` 行，取消图片行注释即可。
