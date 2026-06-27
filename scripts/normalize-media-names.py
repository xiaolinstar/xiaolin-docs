#!/usr/bin/env python3
"""规范化 docs/public/images 目录与 CDN 引用。

规则：目录 img-{slug}/；文件名小写 ASCII + 连字符；禁止中文/空格/下划线。

用法：
  python3 scripts/normalize-media-names.py           # 预览
  python3 scripts/normalize-media-names.py --apply # 重命名并更新仓库引用
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "docs" / "public" / "images"
CDN = "https://media.xiaolin.fun/docs"

# 目录重命名：old_name/ → new_name/
DIR_RENAMES: dict[str, str] = {
    "gitops": "img-gitops",
    "img-project-mangament": "img-project-management",
}

# 目录内文件重命名：相对 images/ 的路径
FILE_RENAMES: dict[str, str] = {
    "img-mac/mac-sliver.jpg": "img-mac/mac-silver.jpg",
    "img-process-side-effects/workflow_domino.png": "img-process-side-effects/workflow-domino.png",
    "img-ai-ide-evolution/Codex.png": "img-ai-ide-evolution/codex.png",
    "img-ai-ide-evolution/CodexApp.png": "img-ai-ide-evolution/codex-app.png",
    "img-ai-ide-evolution/TRAE-Plugin.png": "img-ai-ide-evolution/trae-plugin.png",
    "img-ai-ide-evolution/TRAE.png": "img-ai-ide-evolution/trae.png",
    "img-availability-safeguard/阿里云安全报告.png": "img-availability-safeguard/aliyun-security-report.png",
    "img-binary-exam/base64编码索引表.png": "img-binary-exam/base64-index-table.png",
    "img-binary-exam/万万没想到-量子粉末小抄.png": "img-binary-exam/unexpected-quantum-cheatsheet.png",
    "img-binary-exam/你就是不懂得二进制的基本原理.png": "img-binary-exam/binary-basics-meme.png",
    "img-binary-exam/天才枪手-bank.webp": "img-binary-exam/bad-genius-bank.webp",
    "img-binary-exam/天才枪手-传答案.webp": "img-binary-exam/bad-genius-pass-answer.webp",
    "img-binary-exam/天才枪手-答题卡.webp": "img-binary-exam/bad-genius-answer-sheet.webp",
    "img-binary-exam/雍正王朝-肚皮小抄.png": "img-binary-exam/yongzheng-belly-cheatsheet.png",
    "img-ci-pipeline/Actions-Secret.png": "img-ci-pipeline/actions-secret.png",
    "img-ci-pipeline/CI-CD变更管控.png": "img-ci-pipeline/ci-cd-change-control.png",
    "img-ci-pipeline/GitHub-Actions-Email.png": "img-ci-pipeline/github-actions-email.png",
    "img-ci-pipeline/GitHub-package支持.png": "img-ci-pipeline/github-package-support.png",
    "img-ci-pipeline/Packages.png": "img-ci-pipeline/packages.png",
    "img-ci-pipeline/制品仓库到镜像仓库.png": "img-ci-pipeline/artifact-to-image-registry.png",
    "img-ci-pipeline/变更管控流程.png": "img-ci-pipeline/change-control-flow.png",
    "img-ci-pipeline/阿里云效codeup.png": "img-ci-pipeline/aliyun-codeup.png",
    "img-cicd/ci-cd权责.png": "img-cicd/ci-cd-responsibilities.png",
    "img-phone-storage/iPhone15Pro-repair.jpg": "img-phone-storage/iphone-15-pro-repair.jpg",
    "img-project-mangament/Wechat-Easy-Life.png": "img-project-management/wechat-easy-life.png",
    "img-table-game-guandan/4玩家.png": "img-table-game-guandan/04-players.png",
    "img-table-game-guandan/上家洗牌-头游切牌-末游抓牌.png": "img-table-game-guandan/shuffle-cut-draw.png",
    "img-table-game-guandan/红心J.png": "img-table-game-guandan/red-heart-j.png",
    "img-tencent-qclaw-workbuddy/Qclaw-experts.png": "img-tencent-qclaw-workbuddy/qclaw-experts.png",
    "img-tencent-qclaw-workbuddy/WorkBuddy-experts.png": "img-tencent-qclaw-workbuddy/workbuddy-experts.png",
    "img-what-is-observability/increasing-production-MTTRs.webp": "img-what-is-observability/increasing-production-mttrs.webp",
    # gitops/ 下文件随目录一并改为 img-gitops/
    "gitops/cover.png": "img-gitops/cover.png",
    "gitops/k8s-layers.png": "img-gitops/k8s-layers.png",
    "gitops/origin.png": "img-gitops/origin.png",
    "gitops/principles.png": "img-gitops/principles.png",
    "gitops/problem.png": "img-gitops/problem.png",
    "gitops/push-vs-pull.png": "img-gitops/push-vs-pull.png",
    "gitops/summary.png": "img-gitops/summary.png",
}

SKIP_DIR_NAMES = {".git", "node_modules", "coscli_output", "dist", ".vitepress"}


def build_replacements() -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for old, new in FILE_RENAMES.items():
        pairs.append((f"{CDN}/{old}", f"{CDN}/{new}"))
        pairs.append((f"/images/{old}", f"/images/{new}"))
    # 目录级替换（避免遗漏未在 FILE_RENAMES 列出的路径）
    for old_dir, new_dir in DIR_RENAMES.items():
        pairs.append((f"{CDN}/{old_dir}/", f"{CDN}/{new_dir}/"))
        pairs.append((f"/images/{old_dir}/", f"/images/{new_dir}/"))
    # img-project-mangament 下未单独列出的文件
    pairs.append((f"{CDN}/img-project-mangament/", f"{CDN}/img-project-management/"))
    pairs.append((f"/images/img-project-mangament/", f"/images/img-project-management/"))
    pairs.sort(key=lambda x: len(x[0]), reverse=True)
    return pairs


def rename_on_disk(apply: bool) -> list[tuple[str, str]]:
    done: list[tuple[str, str]] = []

    for old_rel, new_rel in FILE_RENAMES.items():
        src = IMAGES / old_rel
        dst = IMAGES / new_rel
        if not src.exists():
            print(f"Skip missing: {old_rel}", file=sys.stderr)
            continue
        if dst.exists() and src.resolve() != dst.resolve():
            print(f"Skip exists: {new_rel}", file=sys.stderr)
            continue
        print(f"FILE {old_rel} → {new_rel}")
        if apply:
            dst.parent.mkdir(parents=True, exist_ok=True)
            src.rename(dst)
        done.append((old_rel, new_rel))

    for old_dir, new_dir in DIR_RENAMES.items():
        src = IMAGES / old_dir
        dst = IMAGES / new_dir
        if not src.is_dir():
            continue
        if dst.exists():
            # 合并剩余文件到新目录
            for child in src.iterdir():
                target = dst / child.name
                print(f"MERGE {old_dir}/{child.name} → {new_dir}/{child.name}")
                if apply:
                    if target.exists():
                        child.unlink()
                    else:
                        child.rename(target)
            if apply and src.exists() and not any(src.iterdir()):
                src.rmdir()
        else:
            print(f"DIR  {old_dir}/ → {new_dir}/")
            if apply:
                src.rename(dst)
        done.append((old_dir, new_dir))

    return done


def update_repo_refs(apply: bool) -> int:
    replacements = build_replacements()
    total = 0
    files_changed = 0
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIR_NAMES for part in path.parts):
            continue
        if "docs/.vitepress/dist" in str(path):
            continue
        if path.suffix not in {".md", ".mts", ".vue", ".html", ".json", ".sh", ".py", ".yaml", ".yml"}:
            continue
        if path.name == "normalize-media-names.py":
            continue
        text = path.read_text(encoding="utf-8")
        updated = text
        file_count = 0
        for old, new in replacements:
            if old in updated:
                n = updated.count(old)
                updated = updated.replace(old, new)
                file_count += n
        if file_count and updated != text:
            rel = path.relative_to(ROOT)
            print(f"REF  {rel}: {file_count} 处")
            total += file_count
            files_changed += 1
            if apply:
                path.write_text(updated, encoding="utf-8")
    return total if apply else files_changed


def verify_compliance() -> int:
    issues = 0
    for p in sorted(IMAGES.rglob("*")):
        if p.name == ".gitkeep" or not p.is_file():
            continue
        rel = p.relative_to(IMAGES).as_posix()
        name = p.name
        parts = rel.split("/")
        if not parts[0].startswith("img-"):
            print(f"非 img- 目录: {rel}")
            issues += 1
        if re.search(r"[A-Z_]", name) or re.search(r"[^\x00-\x7F]", name):
            print(f"文件名不合规: {rel}")
            issues += 1
    return issues


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="执行重命名与引用更新")
    args = parser.parse_args()

    print("== 磁盘重命名 ==")
    rename_on_disk(args.apply)

    print("\n== 仓库引用 ==")
    n = update_repo_refs(args.apply)
    print(f"\n{'已更新' if args.apply else '待更新'}引用涉及 {n} 个文件" if n else "无引用变更")

    if args.apply:
        print("\n== 合规检查 ==")
        left = verify_compliance()
        if left:
            print(f"仍有 {left} 个问题")
            sys.exit(1)
        print("全部文件名已合规")
        print("\n下一步: pnpm run media:upload && pnpm run media:cdn-check")
    else:
        print("\n确认后执行: python3 scripts/normalize-media-names.py --apply")


if __name__ == "__main__":
    main()
