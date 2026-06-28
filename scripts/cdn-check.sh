#!/usr/bin/env bash
# 校验 CDN 域名与 xiaolin-docs 媒体对象（docs/ 前缀）是否可访问。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/cos-config.sh
source "$ROOT/scripts/lib/cos-config.sh"
cos_load_dotenv "$ROOT"
cos_load_config

CDN="${MEDIA_CDN_BASE:-https://media.xiaolin.fun}"
CDN="${CDN%/}"
COS="${COS_PUBLIC_BASE_URL:-https://media-1300240022.cos.ap-nanjing.myqcloud.com}"
COS="${COS%/}"
PREFIX="${COS_PREFIX:-docs}"

# 上传后应存在的抽样键（相对 docs/ 前缀）
SAMPLES=(
  "img-harness-engineering/avatar.png"
  "img-gitops/cover.png"
  "img-openclaw/79-tencent-cloud.png"
)

echo "== CDN 检查 (xiaolin-docs) =="
echo "CDN:  $CDN/$PREFIX"
echo "COS:  $COS/$PREFIX"
echo

check_url() {
  local label="$1" url="$2"
  local code err
  err=$(curl -s -o /dev/null -w '%{http_code}' -I --max-time 15 "$url" 2>&1) || true
  code="${err: -3}"
  if [[ "$code" == "200" || "$code" == "206" ]]; then
    echo "✓ $label  $code  $url"
    return 0
  fi
  if [[ "$url" == https://* ]]; then
    local http_url="${url/https:/http:}"
    local http_code
    http_code=$(curl -s -o /dev/null -w '%{http_code}' -I --max-time 15 "$http_url" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" || "$http_code" == "206" ]]; then
      echo "△ $label  HTTPS 未就绪（${code:-SSL 错误}），HTTP 已通 200"
      echo "  → 请在 CDN 控制台为 ${CDN#https://} 部署 HTTPS 证书"
      return 2
    fi
  fi
  echo "✗ $label  ${code:-000}  $url"
  return 1
}

failed=0
https_pending=0
missing_local=0

echo "== 本地抽样文件 =="
for key in "${SAMPLES[@]}"; do
  local_file="$ROOT/docs/public/images/$key"
  if [[ -f "$local_file" ]]; then
    echo "✓ $key"
  else
    echo "△ 本地缺失: $key（上传前请确认路径）"
    missing_local=1
  fi
done

echo
echo "== DNS =="
cdn_host="${CDN#https://}"
if cname=$(dig +short "$cdn_host" CNAME 2>/dev/null | head -1); then
  if [[ -n "$cname" ]]; then
    echo "✓ CNAME $cdn_host → $cname"
  else
    ip=$(dig +short "$cdn_host" A 2>/dev/null | head -1 || true)
    if [[ -n "$ip" ]]; then
      echo "△ A 记录 $cdn_host → $ip（非 CNAME，请确认是否经 CDN）"
    else
      echo "✗ 未解析 $cdn_host"
      failed=1
    fi
  fi
else
  echo "△ 无法 dig，跳过 DNS 检查"
fi

echo
echo "== 抽样 URL =="
for key in "${SAMPLES[@]}"; do
  full_key="${COS_PREFIX}/${key}"
  check_url "COS" "$COS/$full_key" || failed=1
  rc=0
  check_url "CDN" "$CDN/$full_key" || rc=$?
  if [[ $rc -eq 2 ]]; then https_pending=1; elif [[ $rc -ne 0 ]]; then failed=1; fi
  echo
done

if [[ $failed -ne 0 && $missing_local -eq 1 ]]; then
  echo "提示: 若 COS/CDN 为 404，请先执行 pnpm run media:upload"
fi

if [[ $failed -eq 0 && $https_pending -eq 1 ]]; then
  echo "CDN 回源正常，HTTPS 待就绪后可执行: pnpm run media:cdn-migrate:apply"
  exit 2
fi

if [[ $failed -eq 0 ]]; then
  echo "CDN 就绪。Markdown 改链: pnpm run media:rewrite:apply"
else
  echo "存在失败项。若尚未上传，请先 pnpm run media:upload；CDN 配置见 xiaolin-life/docs/CDN-SETUP.md"
  exit 1
fi
