# 配图清单 · delivery-start（DevOps 基础 01 ｜ Nginx 静态资源代理）

> 截图母本放本机 `docs/public/images/img-delivery-start/`（不进 Git），上传 COS 后 Origin / 公众号引用 CDN URL。
> 规范见 [文档媒体规范](../../../docs/sre/planning/media-standards.md)、[content/dist/README.md](../README.md#产品截图与占位符) 与 [sre-visual-standard SKILL](../../../.agents/skills/sre-visual-standard/SKILL.md)。

## CDN 前缀

| 项 | 值 |
|----|-----|
| 本地目录 | `docs/public/images/img-delivery-start/` |
| COS 键前缀 | `docs/img-delivery-start/` |
| CDN 基址 | `https://media.xiaolin.fun/docs/img-delivery-start/` |

## 截图列表

| ID | 文件名 | 内容 | 插入位置（Origin） | 公众号 | 状态 |
|----|--------|------|-------------------|--------|------|
| `vitepress-home` | `vitepress-home.png` | VitePress 首页 | `## 引入 VitePress` 段 | 正文图 | done |
| `vitepress-docs` | `vitepress-docs.png` | VitePress 文档页面 | `## 引入 VitePress` 段 | 正文图 | done |
| `vitepress-workflow` | `vitepress-workflow-aligned.png` | VitePress 开发与发布闭环流程 | `## 引入 VitePress` 段 | 正文图 | done |
| `wechat-cover` | `01-wechat-cover.png` | 公众号封面 900×383（Notion 线稿，蓝橙语义色） | 仅公众号后台 | 封面 | **done** |

封面图 prompt 嵌入在 [`../wechat.md` 封面图小节](../wechat.md#封面图codex-生成)，Codex / Antigravity 可直接读取生成。

## 补图工作流

```bash
# 1. 截图放入本地目录（按上表文件名）
# 2. 上传 COS
pnpm run media:upload   # 或 bash scripts/upload-media-cos.sh docs/public/images/img-delivery-start

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
<!-- shot:vitepress-home -->
<!-- ![VitePress 首页](https://media.xiaolin.fun/docs/img-delivery-start/vitepress-home.png) -->
```

补图时：删除 `<!-- shot:... -->` 行，取消图片行注释即可。
