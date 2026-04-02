# AI IDE 技能管理最佳实践

## 技能安装位置策略

### 1. 社区技能（推荐：用户级别）

**位置**：`~/.claude/skills/`

**适用场景**：
- 从 skills.sh 安装的社区技能
- 通用的、跨项目使用的技能
- 不需要定制的技能

**优势**：
- ✅ 一次安装，所有项目共享
- ✅ 减少重复配置
- ✅ 统一管理，易于更新

**示例**：
```bash
# 安装社区技能到用户级别
npx skills add egebese/skill-manager@skill-manager -g -y
npx skills add mrgoonie/claudekit-skills@mcp-management -g -y
```

### 2. 个人定制技能（推荐：专门项目）

**位置**：创建专门的项目仓库，如 `~/Projects/claude-skills/`

**适用场景**：
- 自己开发的技能
- 对社区技能的定制版本
- 需要版本控制的技能
- 需要分享给团队的技能

**项目结构**：
```
~/Projects/claude-skills/
├── skills/
│   ├── my-custom-skill/
│   │   ├── SKILL.md
│   │   ├── index.js
│   │   └── package.json
│   └── my-project-specific-skill/
│       ├── SKILL.md
│       └── index.py
├── rules/
│   └── my-custom-rules.md
├── hooks/
│   └── my-custom-hook.js
├── README.md
├── package.json
└── .gitignore
```

**安装方法**：
```bash
# 在项目中创建符号链接
ln -s ~/Projects/claude-skills/skills/my-custom-skill ~/.claude/skills/my-custom-skill

# 或复制到用户级别
cp -r ~/Projects/claude-skills/skills/my-custom-skill ~/.claude/skills/
```

**优势**：
- ✅ 版本控制，追踪变更历史
- ✅ 易于维护和更新
- ✅ 可以分享给团队
- ✅ 支持协作开发

### 3. 项目特定技能（推荐：项目级别）

**位置**：`<project>/.claude/skills/`

**适用场景**：
- 仅在特定项目中使用的技能
- 项目特定的业务逻辑
- 临时性的工具脚本

**优势**：
- ✅ 项目配置自包含
- ✅ 版本控制方便
- ✅ 不影响其他项目

**示例**：
```
my-project/
├── .claude/
│   └── skills/
│       └── project-specific-skill/
│           ├── SKILL.md
│           └── index.js
├── src/
└── package.json
```

## 推荐的组织结构

### 方案一：集中式管理（推荐）

```
~/
├── .claude/                          # 用户级别配置（社区技能）
│   ├── skills/
│   │   ├── skill-manager/             # 社区技能
│   │   ├── mcp-management/           # 社区技能
│   │   ├── find-skills/              # 社区技能
│   │   └── todo-task/                # 社区技能
│   ├── rules/
│   │   └── core.md                  # 核心规则
│   └── hooks/
│       └── custom-hook.js           # 全局 hooks
│
├── Projects/
│   └── claude-skills/               # 个人技能仓库（版本控制）
│       ├── skills/
│       │   ├── my-custom-skill/
│       │   └── my-forked-skill/     # 定制的社区技能
│       ├── rules/
│       │   └── my-rules.md
│       ├── hooks/
│       │   └── my-hook.js
│       ├── README.md
│       ├── package.json
│       └── .git/
│
└── WebstormProjects/
    └── xiaolin-docs/               # 当前项目
        ├── .claude/               # 项目级别配置
        │   └── skills/
        │       └── doc-specific-skill/
        └── src/
```

### 方案二：完全集中式（简化版）

```
~/
└── .claude/                       # 所有技能集中在这里
    ├── skills/
    │   ├── community/              # 社区技能（子目录）
    │   │   ├── skill-manager/
    │   │   ├── mcp-management/
    │   │   └── find-skills/
    │   └── personal/              # 个人技能（子目录）
    │       ├── my-custom-skill/
    │       └── my-forked-skill/
    ├── rules/
    │   ├── community/
    │   └── personal/
    └── hooks/
        ├── community/
        └── personal/
```

## 具体实施建议

### 第一步：创建个人技能仓库

```bash
# 创建专门的项目
mkdir -p ~/Projects/claude-skills
cd ~/Projects/claude-skills

# 初始化 Git 仓库
git init
echo "# Claude Skills\n\n个人定制的 AI IDE 技能集合" > README.md
git add README.md
git commit -m "Initial commit"

# 创建目录结构
mkdir -p skills rules hooks
```

### 第二步：安装社区技能

```bash
# 安装到用户级别
npx skills add egebese/skill-manager@skill-manager -g -y
npx skills add mrgoonie/claudekit-skills@mcp-management -g -y
```

### 第三步：创建个人技能

```bash
# 在个人技能仓库中创建新技能
cd ~/Projects/claude-skills/skills
mkdir my-custom-skill
cd my-custom-skill

# 创建 SKILL.md
cat > SKILL.md << 'EOF'
# My Custom Skill

**Description**: 我的自定义技能

## When to Use

当需要执行特定任务时使用此技能。

## Implementation

详细的实现说明...
EOF

# 创建实现文件
cat > index.js << 'EOF'
function myCustomFunction() {
  // 实现代码
}

module.exports = { myCustomFunction };
EOF

# 提交到版本控制
cd ~/Projects/claude-skills
git add .
git commit -m "Add my-custom-skill"
```

### 第四步：链接个人技能

```bash
# 创建符号链接到用户级别
ln -s ~/Projects/claude-skills/skills/my-custom-skill ~/.claude/skills/my-custom-skill

# 或复制到用户级别
cp -r ~/Projects/claude-skills/skills/my-custom-skill ~/.claude/skills/
```

## 版本控制策略

### 社区技能

**不需要版本控制**：
- 通过 `npx skills` 管理
- 使用 `npx skills update` 更新
- 定期检查更新：`npx skills check`

### 个人技能

**需要版本控制**：
- 使用 Git 追踪变更
- 定期提交到远程仓库（GitHub/GitLab）
- 使用语义化版本号（v1.0.0）

### 定制的社区技能

**Fork 后维护**：
- Fork 原仓库到个人 GitHub
- 克隆到 `~/Projects/claude-skills/skills/my-forked-skill`
- 在个人仓库中维护定制版本
- 定期合并上游更新

## 维护工作流

### 日常维护

```bash
# 1. 检查社区技能更新
npx skills check

# 2. 更新社区技能
npx skills update

# 3. 提交个人技能变更
cd ~/Projects/claude-skills
git add .
git commit -m "Update skills"
git push

# 4. 定期备份用户配置
cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d)
```

### 新技能开发

```bash
# 1. 在个人仓库创建新技能
cd ~/Projects/claude-skills/skills
mkdir new-skill
cd new-skill

# 2. 创建技能文件
# SKILL.md, index.js, package.json 等

# 3. 提交到版本控制
cd ~/Projects/claude-skills
git add .
git commit -m "Add new-skill"

# 4. 链接到用户级别
ln -s ~/Projects/claude-skills/skills/new-skill ~/.claude/skills/new-skill
```

## 推荐方案总结

### 对于你的情况

**推荐使用方案一（集中式管理）**：

1. **社区技能**：安装到 `~/.claude/skills/`
   - skill-manager
   - mcp-management
   - find-skills
   - todo-task
   - markdown-formatter

2. **个人技能**：创建 `~/Projects/claude-skills/` 仓库
   - 版本控制所有个人定制技能
   - 使用符号链接到 `~/.claude/skills/`
   - 定期提交到 GitHub

3. **项目特定技能**：放在项目 `.claude/skills/`
   - 仅在特定项目中使用
   - 随项目版本控制

### 优势

- ✅ 清晰的职责划分
- ✅ 社区技能自动更新
- ✅ 个人技能版本控制
- ✅ 项目配置自包含
- ✅ 易于维护和分享

## 下一步

1. 创建个人技能仓库：`~/Projects/claude-skills/`
2. 安装社区技能到用户级别
3. 创建符号链接策略
4. 建立维护工作流
5. 定期备份和更新
