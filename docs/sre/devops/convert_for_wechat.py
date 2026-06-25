#!/usr/bin/env python3
"""
将异常系列文章的 Markdown 转换为公众号/知乎友好的格式。

主要处理：
1. 将站内链接 [text](exception-XX.md) 转为纯文本引用
2. 将相对图片路径标注提醒（需手动上传到平台）

使用方式：
    python convert_for_wechat.py exception-06.md
    python convert_for_wechat.py exception-06.md exception-07.md exception-08.md
    python convert_for_wechat.py --all  # 转换所有 exception-*.md

输出：content/dist/{slug}/wechat.md + 更新 meta.yaml
"""

import re
import sys
from datetime import date
from pathlib import Path

# 文章编号到标题的映射（用于将链接转为可读文本）
ARTICLE_TITLES = {
    "exception-00.md": "四项核心原则",
    "exception-01.md": "异常基础",
    "exception-02.md": "异常分类",
    "exception-03.md": "异常抛出",
    "exception-04.md": "异常处理",
    "exception-05.md": "系统性总结",
    "exception-06.md": "异常文件结构",
    "exception-07.md": "异常类与错误码设计",
    "exception-08.md": "全局异常处理器与项目集成",
}


def convert_internal_links(content: str) -> str:
    """
    将站内链接转为纯文本引用。

    [02篇](exception-02.md) → 02篇《异常分类》
    [四项核心原则](exception-00.md) → 《四项核心原则》
    [02-异常分类](exception-02.md) → 《异常分类》
    """
    def replace_link(match):
        link_text = match.group(1)
        link_target = match.group(2)

        # 只处理站内 exception-XX.md 链接
        if not re.match(r'exception-\d+\.md', link_target):
            return match.group(0)  # 非站内链接保持原样

        article_title = ARTICLE_TITLES.get(link_target, "")

        if article_title and article_title in link_text:
            return f"《{link_text}》"
        elif article_title:
            return f"{link_text}《{article_title}》"
        else:
            return link_text

    pattern = r'(?<!!)\[([^\]]+)\]\(([^)]+)\)'
    return re.sub(pattern, replace_link, content)


def convert_image_paths(content: str) -> str:
    """将相对路径图片标注为需要手动上传。"""
    def replace_image(match):
        original = match.group(0)
        path = match.group(2)
        if path.startswith('http'):
            return original
        return f"{original}\n<!-- ⚠️ 公众号发布提醒：上述图片 {path} 需手动上传到平台 -->"

    pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
    return re.sub(pattern, replace_image, content)


def add_series_navigation(content: str, current_file: str) -> str:
    """在文末添加系列文章导航（纯文本版）。"""
    match = re.search(r'exception-(\d+)', current_file)
    if not match:
        return content

    current_num = int(match.group(1))
    nav_lines = ["\n---\n", "**异常系列文章导航**\n"]

    for filename, title in sorted(ARTICLE_TITLES.items()):
        num_match = re.search(r'exception-(\d+)', filename)
        if num_match:
            num = int(num_match.group(1))
            prefix = "▶ " if num == current_num else "　 "
            category = "架构设计" if num <= 5 else "编程实践"
            nav_lines.append(f"{prefix}{num:02d}. {title}（{category}）")

    content = content.rstrip() + "\n" + "\n".join(nav_lines) + "\n"
    return content


def convert_file(input_path: Path) -> str:
    """转换单个文件。"""
    content = input_path.read_text(encoding='utf-8')
    content = convert_internal_links(content)
    content = convert_image_paths(content)
    content = add_series_navigation(content, input_path.name)
    return content


def dist_dir(repo_root: Path, slug: str) -> Path:
    return repo_root / "content" / "dist" / slug


def update_meta_yaml(meta_path: Path, slug: str, origin_rel: str) -> None:
    """创建或更新 meta.yaml 中的 wechat 平台记录。"""
    today = date.today().isoformat()
    origin_url = f"https://xiaolinstar.cn/sre/devops/{slug}.html"

    if meta_path.exists():
        text = meta_path.read_text(encoding='utf-8')
        text = re.sub(r'^updated:.*$', f'updated: {today}', text, flags=re.MULTILINE)
        meta_path.write_text(text, encoding='utf-8')
        return

    meta_path.write_text(
        f"""slug: {slug}
origin: {origin_rel}
origin_url: {origin_url}
pillar: 云原生
created: {today}
updated: {today}
platforms:
  wechat:
    account: AI持续运维
    status: draft
    output: wechat.md
""",
        encoding='utf-8',
    )


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent.parent
    origin_dir = script_dir

    if sys.argv[1] == "--all":
        files = sorted(origin_dir.glob("exception-*.md"))
    else:
        files = [Path(f) if Path(f).is_absolute() else origin_dir / f for f in sys.argv[1:]]

    for filepath in files:
        if not filepath.exists():
            print(f"⚠️  文件不存在: {filepath}")
            continue

        slug = filepath.stem
        out_dir = dist_dir(repo_root, slug)
        out_dir.mkdir(parents=True, exist_ok=True)

        converted = convert_file(filepath)
        output_path = out_dir / "wechat.md"
        output_path.write_text(converted, encoding='utf-8')

        origin_rel = f"docs/sre/devops/{filepath.name}"
        update_meta_yaml(out_dir / "meta.yaml", slug, origin_rel)

        print(f"✅ {filepath.name} → content/dist/{slug}/wechat.md")

    print(f"\n转换完成！输出根目录: {repo_root / 'content' / 'dist'}")
    print("提示：将 wechat.md 粘贴到 mdnice.com 或墨滴编辑器中，即可生成公众号排版。")


if __name__ == "__main__":
    main()
