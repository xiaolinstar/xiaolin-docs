#!/usr/bin/env python3
"""
配置文件初始化脚本
生成 md-config.json 和 md-config-full.json
"""

import json
import os
from pathlib import Path


# 完整配置（包含所有可用选项）
FULL_CONFIG = {
    "$schema": "./md-config-schema.json",
    "version": "1.0.0",
    "_description": "完整配置示例 - 展示所有可用选项",
    
    "theme": {
        "name": "default",
        "_availableThemes": [
            {"name": "default", "label": "经典", "desc": "默认主题样式"},
            {"name": "grace", "label": "优雅", "desc": "@brzhang 设计"},
            {"name": "simple", "label": "简洁", "desc": "@okooo5km 设计"}
        ]
    },

    "style": {
        "fontFamily": "-apple-system-font,BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB , Microsoft YaHei UI , Microsoft YaHei ,Arial,sans-serif",
        "fontSize": "16px",
        "primaryColor": "#0F4C81",
        "_availableFonts": [
            {"label": "无衬线", "value": "-apple-system-font,BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB , Microsoft YaHei UI , Microsoft YaHei ,Arial,sans-serif", "desc": "推荐"},
            {"label": "衬线", "value": "Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", "desc": "传统"},
            {"label": "等宽", "value": "Menlo, Monaco, 'Courier New', monospace", "desc": "代码风格"}
        ],
        "_availableFontSizes": ["14px", "15px", "16px", "17px", "18px"],
        "_availableColors": [
            {"label": "经典蓝", "value": "#0F4C81", "desc": "稳重冷静"},
            {"label": "翡翠绿", "value": "#009874", "desc": "自然平衡"},
            {"label": "活力橘", "value": "#FA5151", "desc": "热情活力"},
            {"label": "柠檬黄", "value": "#FECE00", "desc": "明亮温暖"},
            {"label": "薰衣紫", "value": "#92617E", "desc": "优雅神秘"},
            {"label": "天空蓝", "value": "#55C9EA", "desc": "清爽自由"},
            {"label": "玫瑰金", "value": "#B76E79", "desc": "奢华现代"},
            {"label": "橄榄绿", "value": "#556B2F", "desc": "沉稳自然"},
            {"label": "石墨黑", "value": "#333333", "desc": "内敛极简"},
            {"label": "雾烟灰", "value": "#A9A9A9", "desc": "柔和低调"},
            {"label": "樱花粉", "value": "#FFB7C5", "desc": "浪漫甜美"}
        ]
    },

    "codeBlock": {
        "themeUrl": "https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/atom-one-dark.min.css",
        "themeName": "atom-one-dark",
        "isMacStyle": True,
        "showLineNumber": False,
        "_availableThemes": [
            "atom-one-dark", "atom-one-light", "github", "github-dark", "monokai",
            "nord", "vs", "vs2015", "xcode", "tokyo-night-dark", "tokyo-night-light"
        ]
    },

    "image": {
        "legend": "alt-title",
        "_legendOptions": {
            "title-alt": "标题优先",
            "alt-title": "alt优先",
            "title": "仅显示标题",
            "alt": "仅显示alt",
            "none": "不显示"
        }
    },

    "link": {
        "citeStatus": False,
        "_description": "是否在微信外链接底部添加引用"
    },

    "content": {
        "countStatus": False,
        "useIndent": False,
        "useJustify": False,
        "_descriptions": {
            "countStatus": "是否统计字数和阅读时间",
            "useIndent": "是否开启段落首行缩进",
            "useJustify": "是否开启两端对齐"
        }
    },

    "headingStyles": {
        "h1": "default",
        "h2": "default",
        "h3": "default",
        "h4": "default",
        "h5": "default",
        "h6": "default",
        "_availableStyles": ["default", "color-only", "border-bottom", "border-left", "custom"]
    },

    "customCSS": "",
    "_customCSSDescription": "自定义 CSS 样式，会覆盖预设样式"
}

# 用户默认配置（精简版）
DEFAULT_CONFIG = {
    "$schema": "./md-config-schema.json",
    "version": "1.0.0",
    
    "theme": {
        "name": "default"
    },

    "style": {
        "fontFamily": "-apple-system-font,BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB , Microsoft YaHei UI , Microsoft YaHei ,Arial,sans-serif",
        "fontSize": "16px",
        "primaryColor": "#0F4C81"
    },

    "codeBlock": {
        "themeUrl": "https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/atom-one-dark.min.css",
        "isMacStyle": True,
        "showLineNumber": False
    },

    "image": {
        "legend": "alt-title"
    },

    "link": {
        "citeStatus": False
    },

    "content": {
        "countStatus": False,
        "useIndent": False,
        "useJustify": False
    },

    "headingStyles": {
        "h1": "default",
        "h2": "default",
        "h3": "default",
        "h4": "default",
        "h5": "default",
        "h6": "default"
    },

    "customCSS": ""
}


def init_config(output_dir: str = "."):
    """
    初始化配置文件
    
    Args:
        output_dir: 输出目录路径
    """
    output_path = Path(output_dir)
    
    # 检查是否已存在配置文件
    config_path = output_path / "md-config.json"
    full_config_path = output_path / "md-config-full.json"
    
    if config_path.exists():
        print(f"配置文件已存在: {config_path}")
        return str(config_path)
    
    # 生成完整配置示例
    with open(full_config_path, 'w', encoding='utf-8') as f:
        json.dump(FULL_CONFIG, f, ensure_ascii=False, indent=2)
    print(f"[OK] 已生成完整配置示例: {full_config_path}")
    
    # 生成用户默认配置
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)
    print(f"[OK] 已生成默认配置文件: {config_path}")
    
    return str(config_path)


def load_config(config_path: str = "md-config.json") -> dict:
    """
    加载配置文件
    
    Args:
        config_path: 配置文件路径
        
    Returns:
        配置字典
    """
    path = Path(config_path)
    
    if not path.exists():
        print(f"配置文件不存在，正在初始化...")
        init_config(str(path.parent))
    
    with open(path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 过滤掉以 _ 开头的说明字段
    def filter_config(obj):
        if isinstance(obj, dict):
            return {k: filter_config(v) for k, v in obj.items() if not k.startswith('_')}
        return obj
    
    return filter_config(config)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        output_dir = sys.argv[1]
    else:
        output_dir = "."
    
    init_config(output_dir)
