#!/usr/bin/env bash
# 检查 coscli 与腾讯云 COS 连通性（需已完成 coscli config init）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/cos-config.sh
source "$ROOT/scripts/lib/cos-config.sh"
cos_load_dotenv "$ROOT"

CONFIG="$(cos_config_path)"
DOCS_IMAGES="$ROOT/docs/public/images"

cos_load_config

echo "== coscli =="
if ! command -v coscli >/dev/null 2>&1; then
  echo "✗ coscli 未安装"
  exit 1
fi
coscli --version

echo
echo "== 配置文件 =="
if [[ ! -f "$CONFIG" ]]; then
  echo "✗ 未找到 $CONFIG"
  echo "  请执行: coscli config init"
  exit 1
fi
echo "✓ $CONFIG 存在"

cos_load_config
echo "  Bucket: ${COS_BUCKET_NAME} (alias: ${COS_BUCKET_ALIAS})"
echo "  Endpoint: ${COS_ENDPOINT}"
echo "  对象键前缀: ${COS_PREFIX}/"
if [[ -n "${COS_PUBLIC_BASE_URL:-}" ]]; then
  echo "  直链前缀: ${COS_PUBLIC_BASE_URL}/${COS_PREFIX}"
fi
if [[ -n "${MEDIA_CDN_BASE:-}" ]]; then
  echo "  CDN 前缀: ${MEDIA_CDN_BASE}/${COS_PREFIX}"
fi

echo
echo "== Bucket 连通 =="
if coscli ls "cos://${COS_BUCKET_ALIAS}/${COS_PREFIX}/" 2>/dev/null | head -5; then
  echo "✓ cos://${COS_BUCKET_ALIAS}/${COS_PREFIX}/ 可访问"
else
  echo "△ cos://${COS_BUCKET_ALIAS}/${COS_PREFIX}/ 暂无对象或无法列出（新前缀可忽略）"
  if ! coscli ls "cos://${COS_BUCKET_ALIAS}/" >/dev/null 2>&1; then
    echo "✗ 无法访问 Bucket，请检查 alias、密钥与地域"
    exit 1
  fi
  echo "✓ Bucket 根目录可访问"
fi

echo
echo "== 本地媒体体量 =="
if [[ -d "$DOCS_IMAGES" ]]; then
  du -sh "$DOCS_IMAGES"
  echo "  文件数: $(find "$DOCS_IMAGES" -type f | wc -l)"
else
  echo "△ 未找到 $DOCS_IMAGES"
fi

echo
echo "就绪。上传: pnpm run media:upload"
