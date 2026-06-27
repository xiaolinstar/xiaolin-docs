#!/usr/bin/env python3
"""将 docs/、content/ 下 Markdown 中的 /images/ 路径替换为 CDN 绝对 URL。

映射：/images/img-foo/bar.png → {MEDIA_CDN_BASE}/docs/img-foo/bar.png

环境变量：
  MEDIA_CDN_BASE   默认 https://media.xiaolin.fun
  MEDIA_COS_PREFIX 对象键前缀，默认 docs

用法：
  python3 scripts/rewrite-media-urls.py              # 预览
  python3 scripts/rewrite-media-urls.py --apply      # 写入
  python3 scripts/rewrite-media-urls.py --apply docs/ai/theory/harness-engineering.md
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CDN = "https://media.xiaolin.fun"
DEFAULT_COS_PREFIX = "docs"
LOCAL_PREFIX = "/images/"

SCAN_DIRS = (ROOT / "docs", ROOT / "content")

PATTERN = re.compile(
    r"(?<!\w)" + re.escape(LOCAL_PREFIX) + r"([^\s\)\"'<>]+)"
)


def rewrite_text(text: str, cdn_base: str, cos_prefix: str) -> tuple[str, int]:
    cdn = cdn_base.rstrip("/")
    prefix = cos_prefix.strip("/")
    count = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal count
        count += 1
        rel = match.group(1).lstrip("/")
        return f"{cdn}/{prefix}/{rel}"

    return PATTERN.sub(repl, text), count


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
    parser.add_argument(
        "paths",
        nargs="*",
        help="要处理的 Markdown 文件或目录（默认 docs/ + content/）",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="写入文件（默认仅预览）",
    )
    parser.add_argument(
        "--cdn-base",
        default=os.environ.get("MEDIA_CDN_BASE", DEFAULT_CDN),
        help=f"CDN 根 URL（默认 {DEFAULT_CDN} 或 MEDIA_CDN_BASE）",
    )
    parser.add_argument(
        "--cos-prefix",
        default=os.environ.get("MEDIA_COS_PREFIX", DEFAULT_COS_PREFIX),
        help=f"COS 对象键前缀（默认 {DEFAULT_COS_PREFIX} 或 MEDIA_COS_PREFIX）",
    )
    args = parser.parse_args()

    targets = collect_targets(args.paths)
    total_files = 0
    total_refs = 0

    for path in targets:
        if ".vitepress" in path.parts:
            continue
        original = path.read_text(encoding="utf-8")
        updated, n = rewrite_text(original, args.cdn_base, args.cos_prefix)
        if n == 0:
            continue
        total_files += 1
        total_refs += n
        rel = path.relative_to(ROOT)
        print(f"{rel}: {n} 处")
        if args.apply:
            path.write_text(updated, encoding="utf-8")
        else:
            for line_no, line in enumerate(original.splitlines(), 1):
                if LOCAL_PREFIX in line:
                    new_line, c = rewrite_text(line, args.cdn_base, args.cos_prefix)
                    if c and new_line != line:
                        print(f"  L{line_no}: {line.strip()}")
                        print(f"     → {new_line.strip()}")

    mode = "已写入" if args.apply else "预览"
    print(f"\n{mode}: {total_files} 个文件，共 {total_refs} 处引用")
    if not args.apply and total_refs:
        print("确认无误后执行: pnpm run media:rewrite:apply")


if __name__ == "__main__":
    main()
