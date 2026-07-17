#!/usr/bin/env python3
"""
为 docs/ 下所有 .md 文章批量维护 frontmatter：
  - 补齐 6 项字段：title / description / date / updated / category / tags
  - description 三级优先级：已有 > ## 摘要/简介/概要 段 > 首段截取
  - 跳过特殊文件（VitePress 首页 / 项目规则文件）
  - 段落式 frontmatter（如 process-effects.md）兼容合并
  - 幂等：已有 description 不覆盖
  - 使用 PyYAML 严格解析，正确处理 block scalar
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = REPO_ROOT / "docs"

SKIP_FILES = {
    DOCS_DIR / "index.md",
    DOCS_DIR / "ai" / "dotai" / "base" / "core.md",
}

CATEGORY_MAP = {
    "sre": "SRE 运维",
    "software-development": "开发架构",
    "ai": "AI 实践",
    "products": "软件产品",
    "easy-office": "效率工具",
    "recommend": "优惠推荐",
    "process-workflow": "流程工作流",
}

SUB_DIR_TAGS = {
    "practice": ["SRE"],
    "architecture": ["架构设计"],
    "devops": ["DevOps", "CI/CD"],
    "tools": ["运维工具"],
    "planning": ["运营规划"],
    "jenkins": ["Jenkins"],
    "observability": ["可观测性"],
    "system-design": ["系统设计"],
    "system-architecture-designer": ["系统架构设计师", "软考"],
    "security": ["安全"],
    "theory": ["AI 理论"],
    "llm": ["LLM"],
    "framework": ["AI 框架"],
    "dotai": ["AI 记忆系统"],
    "ai-todo": ["AI 待办"],
    "drinkzen": ["奶茶仙人"],
    "forward": ["前沿"],
}

TITLE_KEYWORD_TAGS = {
    "GitOps": "GitOps",
    "K3s": "K3s",
    "Kubernetes": "Kubernetes",
    "Docker": "Docker",
    "Jenkins": "Jenkins",
    "ELK": "ELK",
    "Loki": "Loki",
    "Grafana": "Grafana",
    "Prometheus": "Prometheus",
    "Redis": "Redis",
    "Nginx": "Nginx",
    "Cookie": "Cookie",
    "JWT": "JWT",
    "OAuth": "OAuth",
    "SSL": "SSL",
    "TLS": "TLS",
    "Linux": "Linux",
    "Mac": "Mac",
    "Markdown": "Markdown",
    "OpenClaw": "OpenClaw",
    "Skill": "Skill",
    "Claude": "Claude",
    "Antigravity": "Antigravity",
    "可观测性": "可观测性",
    "异常处理": "异常处理",
    "混沌工程": "混沌工程",
    "监控": "监控",
    "拨测": "拨测",
    "巡检": "巡检",
    "DevOps": "DevOps",
    "SRE": "SRE",
    "AIOps": "AIOps",
    "AI": "AI",
    "Token": "Token",
}

SUMMARY_SECTION_HEADINGS = {"摘要", "简介", "概要", "摘要与导读", "文章摘要"}
MAX_DESC_LEN = 100


# -----------------------------
# Git 集成
# -----------------------------
def run_git_log(path: Path, mode: str = "first") -> str:
    try:
        out = subprocess.check_output(
            [
                "git",
                "-C",
                str(REPO_ROOT),
                "log",
                "--follow",
                "--format=%ad",
                "--date=short",
                "--",
                str(path.relative_to(REPO_ROOT)),
            ],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if not out:
            return ""
        lines = out.splitlines()
        return lines[-1] if mode == "first" else lines[0]
    except subprocess.CalledProcessError:
        return ""


# -----------------------------
# Frontmatter 解析（使用 PyYAML）
# -----------------------------
def parse_existing_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    if not content.startswith("---"):
        return {}, content

    # 找第二个 ---
    lines = content.splitlines()
    end_idx = -1
    for i in range(1, len(lines)):
        if lines[i].rstrip() == "---":
            end_idx = i
            break
    if end_idx == -1:
        return {}, content

    fm_text = "\n".join(lines[1:end_idx])
    rest = "\n".join(lines[end_idx + 1 :]).lstrip("\n")

    # 尝试 YAML 解析
    parsed: dict[str, Any] = {}
    if fm_text.strip():
        try:
            data = yaml.safe_load(fm_text)
            if isinstance(data, dict):
                parsed = data
            else:
                # 非字典 frontmatter（如 layout: home）—— 视为 YAML 但不混进我们的字段
                parsed = {"_vitepress_raw": data}
        except yaml.YAMLError:
            # YAML 解析失败 → 降级为段落式
            para = fm_text.strip()
            if para:
                parsed = {"description": para}

    # 兜底：如果任何字段值是列表，保留；如果是 None，转空字符串
    out: dict[str, Any] = {}
    for k, v in parsed.items():
        if v is None:
            continue
        out[k] = v

    return out, rest


# -----------------------------
# 内容提取
# -----------------------------
def extract_title(content: str) -> str:
    for line in content.splitlines():
        m = re.match(r"^#\s+(.+?)\s*$", line)
        if m:
            return m.group(1).strip()
    return ""


def _strip_md(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"\*(.+?)\*", r"\1", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    return s.strip()


def _is_in_code_block(lines: list[str], idx: int) -> bool:
    in_block = False
    for i in range(idx):
        s = lines[i].lstrip()
        if s.startswith("```"):
            in_block = not in_block
    return in_block


def extract_summary_section(rest: str) -> str:
    lines = rest.splitlines()
    found_idx = -1
    for i, ln in enumerate(lines):
        m = re.match(r"^#{1,3}\s*(.+?)\s*$", ln)
        if m and m.group(1).strip() in SUMMARY_SECTION_HEADINGS:
            found_idx = i
            break
    if found_idx == -1:
        return ""

    buf: list[str] = []
    for ln in lines[found_idx + 1 :]:
        if re.match(r"^#{1,3}\s+", ln) or ln.strip() == "---":
            break
        s = ln.strip()
        if not s:
            if buf:
                break
            continue
        if s.startswith("```"):
            break
        buf.append(_strip_md(s))

    para = " ".join(buf).strip()
    para = re.sub(r"\s+", " ", para)
    if len(para) > 200:
        para = para[:197].rstrip("，。、 ") + "..."
    return para


def extract_first_paragraph(rest: str) -> str:
    lines = rest.splitlines()
    seen_h1 = False
    buf: list[str] = []
    for i, line in enumerate(lines):
        if _is_in_code_block(lines, i):
            continue
        if not seen_h1:
            if re.match(r"^#\s+", line):
                seen_h1 = True
            continue
        s = line.strip()
        if not s:
            if buf:
                break
            continue
        if s.startswith(("#", ">", "!", "-", "*", "|", "---", "```")):
            if buf:
                break
            continue
        buf.append(_strip_md(s))

    para = " ".join(buf).strip()
    para = re.sub(r"\s+", " ", para)
    if not para:
        return ""

    sentence_end = re.search(r"[。！？；]", para)
    if sentence_end and sentence_end.end() < 120:
        para = para[: sentence_end.end()]
    elif len(para) > MAX_DESC_LEN:
        para = para[: MAX_DESC_LEN - 3].rstrip("，。、 ") + "..."

    return para


def smart_description(existing: str | None, rest: str) -> str:
    if existing and str(existing).strip():
        return str(existing).strip()
    desc = extract_summary_section(rest)
    if desc:
        return desc
    return extract_first_paragraph(rest)


# -----------------------------
# 分类与标签推导
# -----------------------------
def derive_category(path: Path) -> str:
    rel = path.relative_to(DOCS_DIR)
    parts = rel.parts
    if len(parts) >= 1:
        return CATEGORY_MAP.get(parts[0], parts[0])
    return ""


def derive_tags(path: Path, title: str) -> list[str]:
    tags: list[str] = []
    rel = path.relative_to(DOCS_DIR)
    for p in rel.parts[1:]:
        if p in SUB_DIR_TAGS:
            for t in SUB_DIR_TAGS[p]:
                if t not in tags:
                    tags.append(t)
    for kw, tag in TITLE_KEYWORD_TAGS.items():
        if kw in title and tag not in tags:
            tags.append(tag)
    return tags


# -----------------------------
# Frontmatter 输出（手写以保证稳定格式）
# -----------------------------
def _yaml_escape_string(s: str) -> str:
    """单行字符串：含特殊字符则双引号包裹。"""
    needs_quote = any(c in s for c in [":", "#", '"', "'", "\n", "{", "}", "[", "]", "&", "*", "!", "|", ">", "%", "@", "`"])
    if not needs_quote and not s.startswith((" ", "-", "?")):
        return s
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def build_frontmatter(fm: dict[str, Any], path: Path, title: str, rest: str) -> str:
    final: dict[str, Any] = dict(fm)

    if not final.get("title"):
        final["title"] = title

    desc = smart_description(str(final.get("description") or ""), rest)
    final["description"] = desc

    if not final.get("date"):
        final["date"] = run_git_log(path, mode="first")
    if not final.get("updated"):
        final["updated"] = run_git_log(path, mode="last") or final.get("date", "")

    if not final.get("category"):
        final["category"] = derive_category(path)

    tags_value = final.get("tags")
    if not tags_value or (isinstance(tags_value, list) and len(tags_value) == 0):
        final["tags"] = derive_tags(path, title)

    # 手写输出（避免 PyYAML 默认输出的差异）
    lines = ["---"]
    lines.append(f"title: {_yaml_escape_string(str(final['title']))}")
    desc_str = str(final["description"])
    if not desc_str:
        lines.append('description: ""')
    elif "\n" in desc_str or len(desc_str) > 80:
        lines.append("description: |")
        for ln in desc_str.splitlines():
            lines.append(f"  {ln}")
    else:
        lines.append(f"description: {_yaml_escape_string(desc_str)}")
    lines.append(f"date: {final.get('date', '')}")
    lines.append(f"updated: {final.get('updated', '')}")
    lines.append(f"category: {final.get('category', '')}")
    tags = final.get("tags", [])
    if tags and isinstance(tags, list):
        lines.append("tags:")
        for t in tags:
            lines.append(f"  - {t}")
    else:
        lines.append("tags: []")
    lines.append("---")
    return "\n".join(lines)


# -----------------------------
# 处理入口
# -----------------------------
def process_file(path: Path) -> str:
    content = path.read_text(encoding="utf-8")
    fm, rest = parse_existing_frontmatter(content)
    title = extract_title(rest) or extract_title(content) or path.stem
    new_fm = build_frontmatter(fm, path, title, rest)
    return new_fm + "\n\n" + rest.lstrip("\n")


def main() -> int:
    dry = "--write" not in sys.argv
    files = sorted(DOCS_DIR.rglob("*.md"))
    files = [f for f in files if f not in SKIP_FILES]

    print(f"[INFO] 扫描到 {len(files)} 个文件，dry_run={dry}")
    print(f"[INFO] 跳过 {len(SKIP_FILES)} 个特殊文件")

    changed = 0
    for f in files:
        old = f.read_text(encoding="utf-8")
        new = process_file(f)
        if new != old:
            changed += 1
            if not dry:
                f.write_text(new, encoding="utf-8")
        if dry:
            rel = f.relative_to(REPO_ROOT)
            preview = "\n".join(new.splitlines()[:12])
            print(f"\n--- {rel} ---")
            print(preview)

    if dry:
        print(f"\n[INFO] 干跑完成：{changed} 个文件将变更。使用 --write 真正写入。")
    else:
        print(f"\n[INFO] 写入完成：{changed} 个文件已变更。")
    return 0


if __name__ == "__main__":
    sys.exit(main())