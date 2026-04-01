#!/usr/bin/env python3
"""
Todo Task - 规范驱动开发任务管理工具
支持创建、查找、更新待办任务
"""

import os
import sys
import json
import re
from datetime import datetime
from pathlib import Path

# 常量配置
SKILL_DIR = Path(__file__).parent
CONFIG_FILE = SKILL_DIR / "config.json"
TEMPLATE_FILE = SKILL_DIR / "templates" / "task_template.md"

# 获取项目根目录（向上查找项目根目录）
PROJECT_ROOT = SKILL_DIR
# 向上查找，直到找到包含 todo/ 目录的根目录
while PROJECT_ROOT.parent != PROJECT_ROOT:
    if (PROJECT_ROOT.parent / "todo").exists():
        PROJECT_ROOT = PROJECT_ROOT.parent
        break
    PROJECT_ROOT = PROJECT_ROOT.parent

TODO_DIR = PROJECT_ROOT / "todo"
TASKS_DIR = TODO_DIR / "tasks"
README_PATH = TODO_DIR / "README.md"

# 优先级定义
PRIORITIES = {
    "P0": {"level": 0, "name": "Critical", "response_time": "立即"},
    "P1": {"level": 1, "name": "High", "response_time": "一周内"},
    "P2": {"level": 2, "name": "Medium", "response_time": "一个月内"},
    "P3": {"level": 3, "name": "Low", "response_time": "有空时"}
}

# 任务类型
TASK_TYPES = {
    "feature": {"name": "功能开发", "default_priority": "P1"},
    "bug": {"name": "Bug 修复", "default_priority": "P0"},
    "optimization": {"name": "性能优化", "default_priority": "P2"}
}

# 状态定义
STATUS = {
    "pending": "pending",
    "in_progress": "in_progress",
    "completed": "completed"
}


def load_config():
    """加载配置文件"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "todoDir": "todo",
        "tasksDir": "todo/tasks",
        "readmePath": "todo/README.md",
        "defaultPriority": "P1",
        "defaultResponsible": "AI 助手",
        "dateFormat": "YYYYMMDD",
        "taskTypes": TASK_TYPES
    }


def get_current_date():
    """获取当前日期，格式为 YYYYMMDD"""
    return datetime.now().strftime("%Y%m%d")


def sanitize_task_name(name):
    """清理任务名称，转换为小写并替换空格为连字符"""
    return name.lower().replace(" ", "-").replace("_", "-")


def create_task_name(task_name):
    """创建任务文件夹名称，添加日期前缀"""
    sanitized = sanitize_task_name(task_name)
    return f"{get_current_date()}-{sanitized}"


def read_template():
    """读取任务模板"""
    if not TEMPLATE_FILE.exists():
        return None
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        return f.read()


def create_task(task_name, task_type="feature", priority="P1", description=""):
    """创建新的待办任务"""
    config = load_config()
    
    # 验证任务类型
    if task_type not in TASK_TYPES:
        print(f"错误：无效的任务类型 '{task_type}'")
        print(f"可用的任务类型：{', '.join(TASK_TYPES.keys())}")
        sys.exit(1)
    
    # 验证优先级
    if priority not in PRIORITIES:
        print(f"错误：无效的优先级 '{priority}'")
        print(f"可用的优先级：{', '.join(PRIORITIES.keys())}")
        sys.exit(1)
    
    # 创建任务文件夹名称
    folder_name = create_task_name(task_name)
    task_path = TASKS_DIR / folder_name
    
    # 创建任务文件夹
    task_path.mkdir(parents=True, exist_ok=True)
    
    # 读取模板
    template = read_template()
    if template:
        # 替换模板中的占位符
        template = template.replace("{task_name}", task_name)
        template = template.replace("{priority}", priority)
        template = template.replace("{date}", get_current_date())
        template = template.replace("{responsible}", config.get("defaultResponsible", "AI 助手"))
        template = template.replace("{description}", description if description else "")
        
        # 写入 README.md
        readme_path = task_path / "README.md"
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(template)
    else:
        print("警告：未找到任务模板，创建空 README.md")
        readme_path = task_path / "README.md"
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(f"# {task_name}\n\n")
    
    # 更新主 README.md
    update_main_readme(folder_name, "pending", priority)
    
    print(f"✅ 任务创建成功：{folder_name}")
    print(f"📁 任务路径：{task_path}")
    return str(task_path)


def list_tasks(status="all", sort_by="priority"):
    """列出所有任务"""
    if not TASKS_DIR.exists():
        print("📋 没有找到任务")
        return []
    
    # 获取所有任务文件夹
    task_folders = [f for f in TASKS_DIR.iterdir() if f.is_dir()]
    
    tasks = []
    for folder in task_folders:
        task_info = {
            "name": folder.name,
            "path": str(folder),
            "status": "unknown",
            "priority": "P1",
            "created_at": folder.name[:8]
        }
        
        # 读取 README.md 获取状态和优先级
        readme_path = folder / "README.md"
        if readme_path.exists():
            with open(readme_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # 提取状态
                status_match = re.search(r'\*\*状态\*\*:\s*(\w+)', content)
                if status_match:
                    task_info["status"] = status_match.group(1)
                
                # 提取优先级
                priority_match = re.search(r'\*\*优先级\*\*:\s*(P[0-3])', content)
                if priority_match:
                    task_info["priority"] = priority_match.group(1)
        
        tasks.append(task_info)
    
    # 过滤状态
    if status != "all":
        tasks = [t for t in tasks if t["status"] == status]
    
    # 排序
    if sort_by == "priority":
        tasks.sort(key=lambda x: PRIORITIES.get(x["priority"], {}).get("level", 999))
    elif sort_by == "date":
        tasks.sort(key=lambda x: x["created_at"], reverse=True)
    elif sort_by == "name":
        tasks.sort(key=lambda x: x["name"])
    
    return tasks


def search_tasks(keyword):
    """搜索任务"""
    tasks = list_tasks()
    keyword_lower = keyword.lower()
    
    # 按名称搜索
    matching_tasks = [t for t in tasks if keyword_lower in t["name"].lower()]
    
    return matching_tasks


def update_task_status(task_name, new_status, summary=""):
    """更新任务状态"""
    # 验证状态
    if new_status not in STATUS:
        print(f"错误：无效的状态 '{new_status}'")
        print(f"可用的状态：{', '.join(STATUS.keys())}")
        sys.exit(1)
    
    # 查找任务文件夹
    task_path = find_task_folder(task_name)
    if not task_path:
        print(f"错误：未找到任务 '{task_name}'")
        sys.exit(1)
    
    readme_path = task_path / "README.md"
    if not readme_path.exists():
        print(f"错误：未找到任务文档 '{readme_path}'")
        sys.exit(1)
    
    # 读取并更新 README.md
    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 更新状态
    content = re.sub(
        r'\*\*状态\*\*:\s*\w+',
        f'**状态**: {new_status}',
        content
    )
    
    # 如果完成，添加总结
    if new_status == "completed" and summary:
        content += f"\n\n## 任务总结\n\n{summary}"
    
    # 写回文件
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # 更新主 README.md
    update_main_readme(task_name, new_status, content)
    
    print(f"✅ 任务状态已更新：{task_name} → {new_status}")
    if summary:
        print(f"📝 总结：{summary}")


def add_progress(task_name, notes):
    """添加进度记录"""
    task_path = find_task_folder(task_name)
    if not task_path:
        print(f"错误：未找到任务 '{task_name}'")
        sys.exit(1)
    
    readme_path = task_path / "README.md"
    if not readme_path.exists():
        print(f"错误：未找到任务文档 '{readme_path}'")
        sys.exit(1)
    
    # 读取 README.md
    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 添加进度记录
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    progress_entry = f"\n\n### {timestamp}\n\n{notes}"
    
    # 添加到实现过程部分
    if "## 实现过程" in content:
        content = content.replace("## 实现过程", f"## 实现过程{progress_entry}")
    else:
        content += f"\n\n## 实现过程{progress_entry}"
    
    # 写回文件
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ 进度记录已添加：{task_name}")


def find_task_folder(task_name):
    """查找任务文件夹"""
    # 尝试直接匹配
    direct_path = TASKS_DIR / task_name
    if direct_path.exists():
        return direct_path
    
    # 尝试搜索
    for folder in TASKS_DIR.iterdir():
        if folder.is_dir() and task_name in folder.name:
            return folder
    
    return None


def update_main_readme(task_name, status, content_or_priority):
    """更新主 README.md"""
    if not README_PATH.exists():
        print("⚠️  未找到主 README.md，跳过更新")
        return
    
    with open(README_PATH, 'r', encoding='utf-8') as f:
        readme_content = f.read()
    
    # 提取优先级
    priority = content_or_priority if isinstance(content_or_priority, str) else "P1"
    if isinstance(content_or_priority, str):
        priority_match = re.search(r'\*\*优先级\*\*:\s*(P[0-3])', content_or_priority)
        if priority_match:
            priority = priority_match.group(1)
    
    # 添加任务记录
    entry = f"- {get_current_date()}: {task_name} ({status}, {priority})"
    
    # 检查是否已存在
    if task_name not in readme_content:
        # 添加到相应部分
        if status == "completed":
            if "**已完成**：" in readme_content:
                readme_content = readme_content.replace(
                    "**已完成**：",
                    f"**已完成**：\n{entry}"
                )
            else:
                readme_content += f"\n\n**已完成**：\n{entry}"
        elif status == "in_progress":
            if "**进行中**：" in readme_content:
                readme_content = readme_content.replace(
                    "**进行中**：",
                    f"**进行中**：\n{entry}"
                )
            else:
                readme_content += f"\n\n**进行中**：\n{entry}"
        else:
            if "**待办**：" in readme_content:
                readme_content = readme_content.replace(
                    "**待办**：",
                    f"**待办**：\n{entry}"
                )
            else:
                readme_content += f"\n\n**待办**：\n{entry}"
        
        # 写回文件
        with open(README_PATH, 'w', encoding='utf-8') as f:
            f.write(readme_content)


def print_help():
    """打印帮助信息"""
    print("""
📋 Todo Task - 规范驱动开发任务管理工具

用法：
    python index.py <command> [arguments]

命令：
    create <任务名> [类型] [优先级] [描述]  - 创建新任务
    list [状态] [排序]                          - 列出任务
    search <关键词>                              - 搜索任务
    update <任务名> <状态> [总结]              - 更新任务状态
    progress <任务名> <笔记>                   - 添加进度记录
    help                                       - 显示此帮助信息

参数说明：
    任务名    - 任务名称（必需）
    类型      - 任务类型：feature、bug、optimization（默认：feature）
    优先级    - 优先级：P0、P1、P2、P3（默认：P1）
    描述      - 任务描述（可选）
    状态      - 任务状态：pending、in_progress、completed
    排序      - 排序方式：priority、date、name（默认：priority）
    关键词    - 搜索关键词
    笔记      - 进度笔记
    总结      - 任务总结（仅在状态为 completed 时使用）

示例：
    # 创建任务
    python index.py create baidu-analytics feature P0 "接入百度统计"
    
    # 列出待办任务
    python index.py list pending priority
    
    # 搜索任务
    python index.py search 百度
    
    # 更新任务状态
    python index.py update baidu-analytics in_progress
    
    # 添加进度
    python index.py progress baidu-analytics "开始分析 API 文档"
    
    # 完成任务
    python index.py update baidu-analytics completed "百度统计接入完成"
""")


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print_help()
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "create":
        if len(sys.argv) < 3:
            print("错误：缺少任务名称")
            print("用法：python index.py create <任务名> [类型] [优先级] [描述]")
            sys.exit(1)
        
        task_name = sys.argv[2]
        task_type = sys.argv[3] if len(sys.argv) > 3 else "feature"
        priority = sys.argv[4] if len(sys.argv) > 4 else "P1"
        description = " ".join(sys.argv[5:]) if len(sys.argv) > 5 else ""
        
        create_task(task_name, task_type, priority, description)
    
    elif command == "list":
        status = sys.argv[2] if len(sys.argv) > 2 else "all"
        sort_by = sys.argv[3] if len(sys.argv) > 3 else "priority"
        
        tasks = list_tasks(status, sort_by)
        print(f"\n📋 任务列表（共 {len(tasks)} 个）\n")
        
        for task in tasks:
            status_icon = {
                "pending": "⏳",
                "in_progress": "🔄",
                "completed": "✅",
                "unknown": "❓"
            }.get(task["status"], "❓")
            
            print(f"{status_icon} {task['name']} ({task['status']}, {task['priority']})")
    
    elif command == "search":
        if len(sys.argv) < 3:
            print("错误：缺少搜索关键词")
            print("用法：python index.py search <关键词>")
            sys.exit(1)
        
        keyword = sys.argv[2]
        tasks = search_tasks(keyword)
        
        print(f"\n🔍 搜索结果（共 {len(tasks)} 个）\n")
        
        for task in tasks:
            print(f"📌 {task['name']} ({task['status']}, {task['priority']})")
    
    elif command == "update":
        if len(sys.argv) < 4:
            print("错误：缺少参数")
            print("用法：python index.py update <任务名> <状态> [总结]")
            sys.exit(1)
        
        task_name = sys.argv[2]
        new_status = sys.argv[3]
        summary = " ".join(sys.argv[4:]) if len(sys.argv) > 4 else ""
        
        update_task_status(task_name, new_status, summary)
    
    elif command == "progress":
        if len(sys.argv) < 4:
            print("错误：缺少参数")
            print("用法：python index.py progress <任务名> <笔记>")
            sys.exit(1)
        
        task_name = sys.argv[2]
        notes = " ".join(sys.argv[3:])
        
        add_progress(task_name, notes)
    
    elif command == "help" or command == "-h" or command == "--help":
        print_help()
    
    else:
        print(f"错误：未知命令 '{command}'")
        print("使用 'python index.py help' 查看帮助信息")
        sys.exit(1)


if __name__ == "__main__":
    main()
