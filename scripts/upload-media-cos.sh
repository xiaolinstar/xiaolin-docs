#!/usr/bin/env bash
# 使用 coscli 将 xiaolin-docs 本地媒体同步到腾讯云 COS（与 xiaolin-life 共用 Bucket）。
#
# 对象键前缀默认 docs/，与 CDN URL https://media.xiaolin.fun/docs/... 对齐。
#
# 环境变量（均可选，未设置时从 ~/.cos.yaml 读取）：
#   COS_BUCKET_ALIAS  coscli bucket alias
#   COS_PREFIX        对象键前缀，默认 docs
#   MEDIA_CDN_BASE    仅用于上传完成后的提示
#
# 用法：
#   ./scripts/upload-media-cos.sh docs/public/images
#   pnpm run media:upload

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/cos-config.sh
source "$ROOT/scripts/lib/cos-config.sh"
cos_load_dotenv "$ROOT"
cos_load_config

ALIAS="$COS_BUCKET_ALIAS"
PREFIX="${COS_PREFIX}"
PREFIX="${PREFIX#/}"
PREFIX="${PREFIX%/}"

DOCS_IMAGES="$ROOT/docs/public/images"

if ! command -v coscli >/dev/null 2>&1; then
  echo "Error: coscli 未安装，见 https://cloud.tencent.com/document/product/436/63144" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  set -- "$DOCS_IMAGES"
fi

cos_dest() {
  local key="$1"
  key="${key#/}"
  if [[ -n "$PREFIX" && -n "$key" ]]; then
    echo "cos://${ALIAS}/${PREFIX}/${key}"
  elif [[ -n "$PREFIX" ]]; then
    echo "cos://${ALIAS}/${PREFIX}/"
  elif [[ -n "$key" ]]; then
    echo "cos://${ALIAS}/${key}"
  else
    echo "cos://${ALIAS}/"
  fi
}

upload_docs_images() {
  local src="$1"
  if [[ ! -d "$src" ]]; then
    echo "Error: 目录不存在: $src" >&2
    exit 1
  fi
  echo "→ sync ${src#"$ROOT"/} → $(cos_dest "")"
  coscli sync "$src/" "$(cos_dest "")" -r
}

upload_content_assets() {
  local src="$1"
  local rel="${src#"$ROOT"/}"
  local cos_key="${rel#content/dist/}"
  cos_key="${cos_key#content/}"
  echo "→ sync ${rel} → $(cos_dest "$cos_key")/"
  coscli sync "$src/" "$(cos_dest "$cos_key")/" -r
}

for arg in "$@"; do
  target="$(cd "$ROOT" && realpath "$arg")"
  if [[ ! -e "$target" ]]; then
    echo "Skip missing: $arg" >&2
    continue
  fi

  rel="${target#"$ROOT"/}"
  case "$rel" in
    docs/public/images|docs/public/images/*)
      if [[ -d "$target" ]]; then
        if [[ "$(basename "$target")" == "images" ]]; then
          upload_docs_images "$target"
        else
          parent="$(dirname "$target")"
          if [[ "$parent" == "$DOCS_IMAGES" ]]; then
            name="$(basename "$target")"
            echo "→ sync ${rel} → $(cos_dest "$name")/"
            coscli sync "$target/" "$(cos_dest "$name")/" -r
          else
            upload_docs_images "$DOCS_IMAGES"
          fi
        fi
      else
        parent="$(dirname "$target")"
        name="$(basename "$parent")"
        echo "→ cp: ${rel} → $(cos_dest "$name")/$(basename "$target")"
        coscli cp "$target" "$(cos_dest "$name")/$(basename "$target")"
      fi
      ;;
    content/dist/*/assets|content/dist/*/assets/*)
      if [[ -d "$target" ]]; then
        if [[ "$(basename "$target")" == "assets" ]]; then
          upload_content_assets "$target"
        else
          upload_content_assets "$(dirname "$target")"
        fi
      else
        upload_content_assets "$(dirname "$(dirname "$target")")/assets"
      fi
      ;;
    *)
      name="$(basename "$target")"
      if [[ -d "$target" ]]; then
        echo "→ sync: ${rel} → $(cos_dest "$name")/"
        coscli sync "$target/" "$(cos_dest "$name")/" -r
      else
        parent="$(dirname "$target")"
        pname="$(basename "$parent")"
        echo "→ cp: ${rel} → $(cos_dest "$pname")/$(basename "$target")"
        coscli cp "$target" "$(cos_dest "$pname")/$(basename "$target")"
      fi
      ;;
  esac
done

echo "Done. Bucket: cos://${ALIAS}/${PREFIX}/"
if [[ -n "${MEDIA_CDN_BASE:-}" ]]; then
  echo "CDN base: ${MEDIA_CDN_BASE}/${PREFIX}"
elif [[ -n "${COS_PUBLIC_BASE_URL:-}" ]]; then
  echo "Public base (COS 直链): ${COS_PUBLIC_BASE_URL}/${PREFIX}"
fi
