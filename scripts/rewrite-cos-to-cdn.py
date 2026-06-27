#!/usr/bin/env python3
"""将 docs/、content/ 下 Markdown 中的 COS 直链替换为 CDN 域名。

环境变量：
  COS_PUBLIC_BASE_URL  默认 https://media-1300240022.cos.ap-nanjing.myqcloud.com
  MEDIA_CDN_BASE       默认 https://media.xiaolin.fun

用法：
  python3 scripts/rewrite-cos-to-cdn.py              # 预览
  python3 scripts/rewrite-cos-to-cdn.py --apply    # 写入
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_COS = "https://media-1300240022.cos.ap-nanjing.myqcloud.com"
DEFAULT_CDN = "https://media.xiaolin.fun"
SCAN_DIRS = (ROOT / "docs", ROOT / "content")


def rewrite_text(text: str, cos_base: str, cdn_base: str) -> tuple[str, int]:
    cos = cos_base.rstrip("/")
    cdn = cdn_base.rstrip("/")
    if cos == cdn:
        return text, 0
    pattern = re.compile(re.escape(cos) + r"(?=[/\s\)\"'])")
    count = 0

    def repl(_: re.Match[str]) -> str:
        nonlocal count
        count += 1
        return cdn

    return pattern.sub(repl, text), count


def collect_targets(explicit: list[str]) -> list[Path]:
    if explicit:
        paths: list[Path] = []
        for item in explicit:
            p = Path(item)
            if not p.is_absolute():
                p = ROOT / p
            if p.is_dir():
                paths.extend(sorted(p.rglob("*.md")))
            elif p.is_file():
                paths.append(p)
            else:
                print(f"Skip missing: {item}", file=sys.stderr)
        return paths

    paths: list[Path] = []
    for base in SCAN_DIRS:
        if base.is_dir():
            paths.extend(sorted(base.rglob("*.md")))
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="Markdown 文件或目录（默认 docs/ + content/）")
    parser.add_argument("--apply", action="store_true", help="写入文件")
    parser.add_argument(
        "--cos-base",
        default=os.environ.get("COS_PUBLIC_BASE_URL", DEFAULT_COS),
    )
    parser.add_argument(
        "--cdn-base",
        default=os.environ.get("MEDIA_CDN_BASE", DEFAULT_CDN),
    )
    args = parser.parse_args()

    targets = collect_targets(args.paths)
    total = 0
    changed_files = 0

    for path in targets:
        if ".vitepress" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        new_text, count = rewrite_text(text, args.cos_base, args.cdn_base)
        if count:
            rel = path.relative_to(ROOT)
            print(f"{rel}: {count} 处")
            total += count
            if args.apply:
                path.write_text(new_text, encoding="utf-8")
                changed_files += 1

    if total == 0:
        print("未发现 COS 直链，无需替换。")
        return

    if args.apply:
        print(f"\n已写入: {changed_files} 个文件，共 {total} 处")
        print(f"  {args.cos_base} → {args.cdn_base}")
    else:
        print(f"\n预览共 {total} 处，加 --apply 写入。")


if __name__ == "__main__":
    main()
