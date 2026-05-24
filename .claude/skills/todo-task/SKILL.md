---
name: todo-task
description: 创建和管理待办任务，支持规范驱动开发。当用户说"创建待办"、"新建任务"、"添加任务"、"查看待办"、"列出任务"、"查找任务"、"更新任务"、"完成任务"、"记录进度"等自然语言时自动调用。
metadata:
  {
    "xiaolinstar":
      {
        "version": "2.1.0",
        "author": "AI 助手",
        "license": "MIT",
        "tags": ["todo", "task", "management", "specification", "development"],
        "category": "tools"
      }
  }
---

# Todo Task - 规范驱动开发任务管理

**AI 助手实用技能 - 使用标准管理 Todo 任务。**

## 概述

Todo Task 是一个用于创建和管理任务的技能，基于规范驱动开发原则。每个任务都有自己独立的文件夹，包含标准化的文档结构。

## 功能特性

### ✅ 任务创建
- 基于模板快速创建任务文件夹
- 自动生成标准化的文档结构
- 支持多种任务类型（feature、bug、optimization）
- 自动添加日期前缀

### ✅ 任务查找
- 按状态查找任务（pending、in_progress、completed）
- 按优先级排序
- 支持关键词搜索
- 列出所有任务

### ✅ 任务更新
- 更新任务状态
- 添加进度记录
- 更新任务信息
- 自动更新主 README.md

### ✅ 文档结构
- 使用单一文档管理模式
- 包含任务描述、实现方案、进度记录、验证标准、任务总结
- 支持实时更新和版本控制

## 安装

```bash
# 技能已内置在项目中
# 位置: .agent/skills/todo-task/
```

## 快速开始

### 创建新任务

```bash
# 使用 Python 实现
python .agent/skills/todo-task/index.py create baidu-analytics feature P0 "接入百度统计，监控网站访问量和转化率"

# 或使用 TypeScript 实现
npx ts-node .agent/skills/todo-task/index.ts create baidu-analytics feature P0 "接入百度统计，监控网站访问量和转化率"
```

### 查找任务

```bash
# 列出所有待办任务
python .agent/skills/todo-task/index.py list pending

# 按优先级排序
python .agent/skills/todo-task/index.py list all priority

# 搜索任务
python .agent/skills/todo-task/index.py search 百度
```

### 更新任务状态

```bash
# 更新状态为进行中
python .agent/skills/todo-task/index.py update 20260331-baidu-analytics in_progress

# 完成任务
python .agent/skills/todo-task/index.py update 20260331-baidu-analytics completed "百度统计已成功接入，数据正常上报"
```

### 添加进度

```bash
# 添加进度记录
python .agent/skills/todo-task/index.py progress 20260331-baidu-analytics "开始分析百度统计 API 文档"
```

## 命令参考

### create

创建新的待办任务。

**语法**：
```bash
python index.py create <任务名> <类型> <优先级> <描述>
```

**参数**：
- `<任务名>`：任务名称（必需）
- `<类型>`：任务类型，可选值：feature、bug、optimization（默认：feature）
- `<优先级>`：优先级，可选值：P0、P1、P2、P3（默认：P1）
- `<描述>`：任务描述（可选）

**示例**：
```bash
python index.py create baidu-analytics feature P0 "接入百度统计"
python index.py create content-distribution feature P1 "实现多平台内容自动分发"
python index.py create dead-link-fix bug P0 "修复 GitHub Actions 构建失败"
```

### list

列出任务。

**语法**：
```bash
python index.py list [状态] [排序]
```

**参数**：
- `[状态]`：过滤状态，可选值：pending、in_progress、completed、all（默认：all）
- `[排序]`：排序方式，可选值：priority、date、name（默认：priority）

**示例**：
```bash
python index.py list
python index.py list pending priority
python index.py list completed date
```

### search

搜索任务。

**语法**：
```bash
python index.py search <关键词>
```

**参数**：
- `<关键词>`：搜索关键词（必需）

**示例**：
```bash
python index.py search 百度
python index.py search 统计
python index.py search 分发
```

### update

更新任务状态。

**语法**：
```bash
python index.py update <任务名> <状态> [总结]
```

**参数**：
- `<任务名>`：任务名称（必需）
- `<状态>`：新状态，可选值：pending、in_progress、completed（必需）
- `[总结]`：任务总结，仅在状态为 completed 时使用（可选）

**示例**：
```bash
python index.py update baidu-analytics in_progress
python index.py update baidu-analytics completed "百度统计接入完成"
```

### progress

添加进度记录。

**语法**：
```bash
python index.py progress <任务名> <笔记>
```

**参数**：
- `<任务名>`：任务名称（必需）
- `<笔记>`：进度笔记（必需）

**示例**：
```bash
python index.py progress baidu-analytics "开始分析 API 文档"
python index.py progress baidu-analytics "完成代码集成"
```

## 任务结构

### 标准文件夹布局

```
YYYYMMDD-task-name/
└── README.md       # 任务完整文档（包含所有信息）
```

### 文档内容

**README.md** 包含以下部分：

- **任务标题和元数据**
  - 状态、优先级、日期
  - 负责人

- **需求描述**
  - 任务背景
  - 详细需求
  - 验收标准

- **实现方案**
  - 技术方法
  - 实现步骤
  - 资源需求
  - 风险评估

- **实现过程**
  - 逐步进度
  - 带时间戳的条目
  - 遇到的问题
  - 应用的解决方案

- **验证标准**
  - 功能验证
  - 性能验证
  - 测试用例
  - 验收标准

- **任务总结**
  - 完成总结
  - 经验教训
  - 建议
  - 下一步

## 配置

### config.json

```json
{
  "todoDir": "todo",
  "tasksDir": "todo/tasks",
  "readmePath": "todo/README.md",
  "defaultPriority": "P1",
  "defaultResponsible": "AI 助手",
  "dateFormat": "YYYYMMDD",
  "taskTypes": {
    "feature": {
      "name": "功能开发",
      "defaultPriority": "P1"
    },
    "bug": {
      "name": "Bug 修复",
      "defaultPriority": "P0"
    },
    "optimization": {
      "name": "性能优化",
      "defaultPriority": "P2"
    }
  }
}
```

## 使用场景

### 功能开发
- 从模板创建新功能任务
- 跟踪实现进度
- 根据验收标准验证
- 记录经验教训

### Bug 修复
- 创建 bug 报告任务
- 记录调试过程
- 记录修复和验证
- 跟踪预防措施

### 性能优化
- 创建优化任务
- 记录性能分析
- 记录优化措施
- 验证性能改进

### 任务管理
- 列出所有待办任务
- 更新任务状态
- 跟踪完成日期
- 生成总结报告

## 任务状态流转

```
pending → in_progress → completed
    ↓
  (开始)    (完成)
```

### 状态定义

- **pending**：任务已创建，未开始
- **in_progress**：任务开发中
- **completed**：任务已完成并验证

## 优先级

| 级别 | 名称        | 响应时间 | 示例任务              |
|------|-------------|----------|-----------------------|
| P0   | Critical    | 立即     | 生产问题、安全 Bug    |
| P1   | High        | 一周内   | 面向用户的功能、重要 Bug |
| P2   | Medium      | 一个月内 | 改进、优化            |
| P3   | Low         | 有空时   | 锦上添花、研究        |

## 技术实现

### Python 版本

**文件结构**：
```
.agent/skills/todo-task/
├── SKILL.md
├── index.py              # 主程序
├── templates/
│   └── task_template.md   # 任务模板
└── config.json           # 配置文件
```

**依赖**：
- Python 3.7+
- 标准库（os、sys、datetime、json、pathlib）

### TypeScript 版本

**文件结构**：
```
.agent/skills/todo-task/
├── SKILL.md
├── index.ts              # 主程序
├── templates/
│   ├── task_template.md   # 任务模板
│   └── feature.md       # 功能开发模板
├── config.json           # 配置文件
└── package.json          # 依赖配置
```

**依赖**：
- Node.js 16+
- TypeScript 4+
- fs、path 等标准模块

## 最佳实践

### 任务命名
- 使用描述性、简洁的名称
- 包含日期前缀（YYYYMMDD）
- 使用小写字母和连字符
- 避免特殊字符

### 文档
- 保持描述清晰具体
- 定期更新进度
- 记录决策和权衡
- 总结经验教训

### 状态管理
- 及时更新状态
- 同时只保持一个任务为 in_progress
- 定期将已完成任务归档

## 错误处理

### 无效的任务类型
- 清晰的错误消息
- 列出可用的任务类型
- 建议使用正确的类型

### 文件系统错误
- 优雅地处理权限错误
- 检查任务是否已存在
- 提供恢复建议

### 无效的状态转换
- 验证状态转换
- 提供清晰的错误消息
- 建议有效的转换

## 提示

### 高效的任务管理
- 优先处理 P0 任务
- 将相关任务分组
- 使用模板保持一致性
- 每周回顾已完成任务

### 文档质量
- 在需求中具体说明
- 包含验证标准
- 记录决策和理由
- 跟踪任务花费的时间

### 协作
- 使用清晰的任务名称
- 在描述中包含上下文
- 定期分享进度
- 记录依赖关系

## 许可证

MIT

---

**使用标准管理任务。用规范驱动开发。** 📋
