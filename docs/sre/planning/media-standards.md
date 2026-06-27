# 文档媒体规范

与 xiaolin-life 共用 **COS Bucket**（`media-1300240022`）与 **CDN**（`https://media.xiaolin.fun`）。本仓库对象键前缀为 **`docs/`**。

## 原则

1. **原画质上 COS**：不做有损压缩，加速靠 CDN。
2. **大图不进 Git**：`docs/public/images/**` 已 `.gitignore`；仓库只保留 Markdown 中的 CDN URL。
3. **本机保留上传源**：本地 `docs/public/images/` 作 coscli 母本，需自行备份。
4. **与 life 站隔离**：life 用 `life/`、`img-*`（life 侧约定）；docs 统一 **`docs/img-{slug}/`**。

## 目录与 URL

| 本地（上传源） | COS 键 | CDN URL |
|----------------|--------|---------|
| `docs/public/images/img-harness-engineering/avatar.png` | `docs/img-harness-engineering/avatar.png` | `https://media.xiaolin.fun/docs/img-harness-engineering/avatar.png` |

- 每篇文章 / 主题对应 **`img-{slug}/`** 目录（与文章 slug 或主题一致）。
- 例外：`img-gitops/` 等历史目录已统一加 `img-` 前缀。

## 命名规范

| 规则 | 示例 |
|------|------|
| 小写 ASCII + 数字 + 连字符 | `infographic-01.png` |
| 禁止中文、空格、下划线 | ❌ `4玩家.png` → ✅ `04-players.png` |
| 图集可加序号 | `01-cover.png` |
| 纠正拼写 | `mac-silver.jpg`（非 sliver） |

批量检查 / 重命名：`pnpm run media:normalize` → `pnpm run media:normalize:apply`

## 工作流

```bash
# 1. 新图放入 docs/public/images/img-{slug}/
# 2. 上传 COS
pnpm run media:upload

# 3. Markdown 引用（二选一）
#    A. 先写 /images/... 再批量改 CDN
pnpm run media:rewrite:apply
#    B. 直接写 CDN 绝对 URL

# 4. 校验
pnpm run media:cdn-check
pnpm docs:check-links
```

## 不进 Git 的范围

- `docs/public/images/**`（除 `.gitkeep`）
- 小图标可留 Git：`docs/public/sparrow.svg`、`docs/recommend/*.png` 等根目录轻量资源

## 相关

- 部署与脚本：`README.md` 媒体章节、`scripts/upload-media-cos.sh`
- life 站规范：`xiaolin-life/docs/MEDIA-STANDARDS.md`
