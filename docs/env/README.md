# xiaolin-docs 环境变量

真源分层见 [dev-standards env-management](https://github.com/xiaolinstar/dev-standards/blob/main/playbook/env-management.md)。

## 本仓库特点（内容站 + COS 媒体）

与 **xiaolin-life** 对齐：共用 COS Bucket 与 CDN，对象键前缀为 **`docs/`**（life 为 `life/`）。凭证在 **`~/.cos.yaml`**（方案 A），不在 `.env`。

| 层 | 放什么 | 路径 |
|----|--------|------|
| L0 模板 | `VITE_*`、`COS_PREFIX`、`MEDIA_CDN_BASE` | `.env.example` |
| L2 CI | 百度统计 | GitHub **Variables**：`DOCKER_BAIDU_ANALYTICS_ID` 等 |
| L2 CD | SSH + 邮件 | GitHub **Secrets**：`SERVER_*`、`MAIL_*` |
| L3 凭证 | SecretId / SecretKey | **`~/.cos.yaml`** |
| L3 本机 | Vite 构建 + 媒体脚本 | 仓库根 `.env` |
| L3 VPS | 无 | 镜像 + `compose.yaml`，upstream **8080** |
| L3 备份 | 本机 `.env` | `~/.config/xiaolinstar/xiaolin-docs/local.env` |
| L2 备份 | GitHub 清单 | `~/.config/xiaolinstar/xiaolin-docs/github-production.env` |

**VPS 上不应存在 `.env`**（无文件即达标）。

## 媒体工作流（与 life 对齐）

```bash
cp .env.example .env   # 填 VITE_*；COS 凭证仍只在 ~/.cos.yaml

pnpm run media:check    # coscli + Bucket
pnpm run media:upload   # docs/public/images → cos://…/docs/
pnpm run media:rewrite:apply
pnpm run media:cdn-check
```

规范见 [media-standards.md](../sre/planning/media-standards.md)。

## 加载顺序

```text
scripts/lib/cos-config.sh:
  1. source 仓库 .env（VITE_*、COS_PREFIX、MEDIA_CDN_BASE）
  2. 读取 ~/.cos.yaml（Bucket / 密钥）
  3. 默认 COS_PREFIX=docs
```

## 键名校验

```bash
~/AgentProjects/dev-standards/scripts/sync.sh env check --project .
~/AgentProjects/dev-standards/scripts/sync.sh env check \
  --project . --local --env local --strict
```

## 备份

```bash
cp .env ~/.config/xiaolinstar/xiaolin-docs/local.env
chmod 600 ~/.config/xiaolinstar/xiaolin-docs/local.env
# ~/.cos.yaml 与 life 共用，单独备份
```

## GitHub L2 同步（party-helper 模式）

键名清单见 `docs/env/github-environments.example.env`。本地填：

```bash
mkdir -p ~/.config/xiaolinstar/xiaolin-docs
cp docs/env/github-production.env ~/.config/xiaolinstar/xiaolin-docs/github-production.env
chmod 600 ~/.config/xiaolinstar/xiaolin-docs/github-production.env
pnpm sync:github-env -- --dry-run
pnpm sync:github-env
```

## Agent 禁区

禁止 Agent 修改 `.env`、`~/.cos.yaml` 与 `~/.config/xiaolinstar/**`。

注册表：[env-registry.yaml](https://github.com/xiaolinstar/dev-standards/blob/main/playbook/env-registry.yaml) §xiaolin-docs。
