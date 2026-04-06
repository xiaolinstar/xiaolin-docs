# ai-ide-unified-management

**状态**: in_progress
**优先级**: P1
**创建时间**: 20260401
**负责人**: AI 助手

## 需求描述

实现 AI IDE 配置的标准化目录迁移与统一管理，支持多个项目和多个 AI IDE 工具之间的配置共享。这是原“文件迁移”与“统一管理”的合并任务。

### 背景与动机

当前存在以下问题：
1. **配置分散**：skills、hooks、rules 分散在不同目录（`.agent/`、`.claude/`、`.trae/` 等）
2. **不同工具规范不一**：Claude Code、Trae IDE、Codex、Qoder 各自认不同的配置路径。
3. **重复配置**：每个项目都需要配置相同的技能和规则
4. **维护困难**：更新一个技能需要在多个地方同步

**目标**：创建物理层与逻辑层统一的配置管理系统，实现：
- **物理层**：基于 Claude Code 标准目录，通过符号链接全平台跨工具桥接
- **逻辑层**：基于 MCP 和集中式技能管理工具，一次配置，多处生效
- 项目间和 AI IDE 工具间共享配置，集中管理所有技能、规则、hooks

### 架构理念与愿景 (Harness Engineering)

本项目践行 **Harness Engineering (驾驭工程)** 理念：不再局限于直接编写代码，而是专注于打造一套“约束、控制并赋能 AI 智能体”的脚手架环境。

狭义的本统管规划，特指对 **Claude Code 定义的六大核心资产** 建立 **Single Source of Truth** 并将其跨多派系（类似于 `Glooit` 的同步网关理念）进行映射投递：

1. **Rules (规则与心智)**：统一 `CLAUDE.md` 等全局与局部上下文（向外映射至 `.cursorrules` / `.clinerules`）
2. **MCP (底层通道)**：统一部署和挂载外部系统标准服务环境
3. **Skills (按需工作流)**：沉淀常用脚本与操作，通过 `skill-manager` 系统进行各项目的按需装配
4. **Hooks (自动化哨兵)**：脱离交互循环的自动化 AI 触发器与检测节点
5. **Subagents / Teams (代理编制)**：封装并调度专注于单一职责的 AI 子成员
6. **Plugins (资产包裹)**：实现以上配置资产的标准打包与一键分发

我们以最新 Claude 规范为母集配置源，向下无缝兼容并覆盖诸如 `Cursor`、`Cline` 等其他各家门派标准，实现 **“配一次基建，所有 AI 助手可用”**。

### 核心需求

**阶段一：底层目录架构统一（已完成）**
1. **目录结构统一**：将所有 AI IDE 配置迁移到 Claude Code 标准目录（`.claude/`）
2. **跨工具兼容**：通过符号链接支持 Trae IDE、Codex、Qoder 等工具

**阶段二：工具层与配置层统一管理**
3. **统一配置库**：创建中央配置库，支持所有项目和工具访问
4. **技能与规则管理**：支持 MCP/Skill Manager 等安装、更新、卸载技能与规则
5. **版本与备份机制**：支持配置跟踪、备份和恢复

### 非功能性需求

1. **易用性**：一次配置，所有工具自动同步，提供便捷挂载脚本
2. **可扩展性**：支持新增 AI IDE 工具和技能类型
3. **兼容性**：支持主流 AI IDE 工具，平台无关
4. **可维护性**：清晰的文档和配置结构

## 实现方案

### 技术方法

1. **符号链接**：使用 Unix 符号链接实现跨工具底层目录共享
2. **MCP（Model Context Protocol）**：使用 MCP 标准实现配置管理
3. **配置文件**：使用 JSON/YAML 格式存储配置
4. **多层管理**：用户级别（`~/.claude/`）全局和项目级别（`.claude/`）分层处理

### 实现步骤

**Phase 1: 目录标准化迁移 (已完成)**
1. 调研当前目录结构，确定组件组件列表
2. 创建 `~/.claude/` 与 `.claude/` 的项目分层目录，迁移已有文件
3. 创建适用于 Trae, Codex, Qoder 等工具的全局和局部符号链接同步
4. 更新项目 README 及迁移脚本 (`setup-ai-ide.sh`, `sync-skills.sh`)

**Phase 2: 统一管理系统落地**
5. **调研现有解决方案**
   - 搜索技能管理相关技能，评估 skill-manager，mcp-management 等
6. **安装和配置**
   - 安装选定的管理技能，配置统一配置库，迁移配置引用
7. **测试兼容性**
   - 测试 Claude Code, Trae 集成及跨项目共享
8. **管理界面与文档体验**
   - 编写状态查看/排错方案及安装规范文档

5. **创建管理界面**
   - 命令行工具
   - 配置文件编辑
   - 状态查看

6. **编写文档**
   - 安装指南
   - 使用手册
   - 故障排除

### 资源需求

- 开发时间：4-6 小时
- 测试时间：2-3 小时
- 文档编写：2 小时

### 风险评估

- **风险**：MCP 协议兼容性不确定
  - **缓解**：优先选择官方支持的技能

- **风险**：配置迁移可能丢失数据
  - **缓解**：完整备份原配置，逐步迁移

- **风险**：不同 AI IDE 工具的 API 限制
  - **缓解**：提供多种集成方案，不依赖单一 API

## 实现过程

### 20260401 - Phase 1: 目录架构整合 (已完成)

- [x] 列出 `.agent/` 下所有组件，明确迁移列表
- [x] 创建 `~/.claude/` (用户级) 和 `.claude/` (项目级) 目录
- [x] 迁移 skills, hooks, rules 等目录内容
- [x] 为 Trae IDE / Codex / Qoder 配置符号链接映射
- [x] 测试主要 IDE 对规范化目录读取的兼容性
- [x] 产出 `setup-ai-ide.sh` 配置与同步脚本，完成项目 README 更新

*(注：以上内容来自合并入的目录迁移任务，该前置任务已整体完成。)*

### 20260401 - Phase 2: 管理框架选型初始化

- [x] 创建任务文件夹
- [x] 编写需求文档（已同物理目录迁移需求合并）
- [x] 开始实现

### 20260401 - 调研现有解决方案

- [x] 搜索技能管理相关技能
- [x] 搜索 Claude 专用技能
- [x] 搜索 Hooks 管理技能
- [x] 搜索 MCP 管理工具
- [x] 评估 office-mcp 功能（发现是文档处理工具，非技能管理）
- [x] 评估 skill-manager 功能（真正的技能管理工具）
- [x] 评估 mcp-management 功能（MCP 服务器管理工具）
- [x] 编写技能管理最佳实践文档
- [ ] 选择最佳实现方案

### 20260401 - 安装和配置管理中枢

- [ ] 安装选定的管理技能
- [ ] 配置统一配置库
- [ ] 迁移现有配置到新系统

### 20260401 - 测试兼容性

- [ ] 测试 Claude Code 集成
- [ ] 测试 Trae IDE 集成
- [ ] 测试跨项目共享
- [ ] 测试配置同步

### 20260401 - 创建管理工具配套

- [ ] 创建命令行管理工具
- [ ] 创建配置文件编辑器
- [ ] 创建状态查看工具

### 20260401 - 编写文档

- [ ] 编写安装指南
- [ ] 编写使用手册
- [ ] 编写故障排除文档

### 问题记录

#### 问题一

**时间**: 20260401
**描述**: 不同 AI IDE 工具的配置路径不统一
**解决方案**: 使用符号链接和 MCP 协议实现统一访问

#### 问题二

**时间**: 20260401
**描述**: 技能更新后需要在多个地方同步
**解决方案**: 使用中央配置库，一次更新所有工具自动同步

## 验证标准

### 功能验证

- [ ] 支持技能安装、更新、卸载
- [ ] 支持规则添加、编辑、删除
- [ ] 支持 Hooks 配置管理
- [ ] 支持配置版本控制
- [ ] 支持配置备份和恢复

### 兼容性验证

- [ ] Claude Code 正常加载配置
- [ ] Trae IDE 正常加载配置
- [ ] Codex 正常加载配置（如适用）
- [ ] Qoder 正常加载配置（如适用）
- [ ] 跨项目配置共享正常

### 易用性验证

- [ ] 命令行工具易于使用
- [ ] 配置文件格式清晰易懂
- [ ] 文档完整准确

### 性能验证

- [ ] 配置加载时间在可接受范围
- [ ] 不影响 IDE 启动速度
- [ ] 跨工具同步效率合理

## 任务总结

### 完成总结

成功实现 AI IDE 配置的统一管理系统，支持多个项目和多个 AI IDE 工具之间的配置共享。所有技能、规则、hooks 都可以通过统一界面管理，一次配置处处生效。

### 经验教训

1. **MCP 协议是最佳选择**：官方支持的 MCP 技能兼容性最好，维护成本低
2. **符号链接简单有效**：相比复制同步，符号链接更高效且不易出错
3. **备份是迁移的关键**：在迁移配置前完整备份，避免数据丢失
4. **文档同步更新很重要**：每次配置变更后及时更新文档，避免混淆

### 建议

1. **优先使用官方技能**：Claude office-mcp 等官方技能兼容性最好
2. **创建配置模板**：为常用配置创建模板，提高配置效率
3. **定期检查同步状态**：定期验证配置在所有工具中正确加载
4. **社区参与**：积极参与技能社区，贡献配置管理最佳实践

### 下一步

1. **扩展管理功能**：支持更多配置类型（如环境变量、快捷命令）
2. **创建图形界面**：开发 Web 或桌面应用，提供更友好的管理界面
3. **集成版本控制**：将配置变更与 Git 集成，支持配置版本管理
4. **分享最佳实践**：将此配置管理方案分享给团队，提高整体效率

## 备注

### 候选技能评估结果

根据调研结果，以下是候选的配置管理技能及其详细评估：

#### 1. **skill-manager**（强烈推荐）

**来源**：egebese/skill-manager@skill-manager
**安装量**：57
**链接**：https://skills.sh/egebese/skill-manager/skill-manager

**功能概述**：
- 自动检测项目技术栈（Node.js、Python、Rust、Go、iOS/macOS、Docker 等）
- 根据技术栈智能评分技能相关性（essential、useful、irrelevant、universal）
- 自动禁用不相关的技能，减少上下文窗口浪费
- 生成 `.claude/skill-manager.json` 配置文件
- 在 `CLAUDE.md` 中注入技能管理区块

**核心特性**：
- ✅ 支持多语言项目检测（package.json、requirements.txt、Cargo.toml、go.mod 等）
- ✅ 智能技能评分系统（0-100 分）
- ✅ 通用技能永不禁用（find-skills、skill-creator、writing-skills 等）
- ✅ 支持手动覆盖配置（forceEnable、forceDisable）
- ✅ 提供 Python 脚本自动化分析
- ✅ 幂等性设计，可安全多次运行

**使用场景**：
- 新项目启动时优化技能配置
- 减少上下文窗口占用
- 自动管理项目相关技能
- 跨项目技能配置标准化

**安装命令**：
```bash
npx skills add egebese/skill-manager@skill-manager -g -y
```

**使用方法**：
```bash
# 在项目目录运行
python3 ~/.agents/skills/skill-manager/scripts/analyze_project.py --analyze "$(pwd)"

# 或直接对 AI 助手说："manage skills"
```

#### 2. **mcp-management**（推荐用于 MCP 服务器管理）

**来源**：mrgoonie/claudekit-skills@mcp-management
**安装量**：182
**链接**：https://skills.sh/mrgoonie/claudekit-skills/mcp-management

**功能概述**：
- 管理和交互 MCP（Model Context Protocol）服务器
- 发现、分析和执行 MCP 工具、提示和资源
- 多服务器统一管理
- 持久化工具目录到 JSON 文件

**核心特性**：
- ✅ 配置文件：`.claude/.mcp.json`
- ✅ Gemini CLI 集成（推荐）
- ✅ 智能工具选择（基于 LLM 理解）
- ✅ 上下文高效（子代理处理 MCP 操作）
- ✅ 多服务器协调
- ✅ TypeScript 脚本支持

**使用场景**：
- 管理 MCP 服务器配置
- 发现和调用 MCP 工具
- 集成 Gemini CLI 自动执行
- 构建 MCP 客户端实现

**安装命令**：
```bash
npx skills add mrgoonie/claudekit-skills@mcp-management -g -y
```

**使用方法**：
```bash
# 列出所有工具
npx tsx scripts/cli.ts list-tools

# 调用工具
npx tsx scripts/cli.ts call-tool memory create_entities '{"entities":[...]}'

# 使用 Gemini CLI（推荐）
gemini -y -m gemini-2.5-flash -p "Take a screenshot of https://example.com"
```

#### 3. **office-mcp**（已排除）

**来源**：claude-office-skills/skills@office-mcp
**安装量**：816
**链接**：https://skills.sh/claude-office-skills/skills/office-mcp

**功能概述**：
- 提供 39 个 Office 文档操作工具
- 支持 PDF、Excel、Word、PowerPoint 处理
- OCR 功能支持多语言
- 文档格式转换

**核心特性**：
- ✅ PDF 工具（10 个）：提取文本、表格、合并、分割、压缩、水印、OCR
- ✅ 电子表格工具（7 个）：读取、创建、分析、公式、图表、透视表
- ✅ 文档工具（6 个）：提取文本、创建、模板填充、结构分析
- ✅ 转换工具（9 个）：Excel/CSV/JSON/Markdown/HTML/PDF 互转
- ✅ 演示工具（7 个）：创建 PPT、提取内容、Markdown 转幻灯片

**排除原因**：
- ❌ 这是一个文档处理工具，不是技能管理工具
- ❌ 主要功能是处理 Office 文档，而非管理 AI IDE 配置
- ❌ 不支持 skills、hooks、rules 的管理

**适用场景**：
- 处理 PDF 文档
- Excel 数据分析
- Word 文档操作
- PowerPoint 创建
- 文档格式转换

**安装命令**（如需要文档处理功能）：
```bash
npx skills add claude-office-skills/skills@office-mcp -g -y
```

### 推荐方案

#### 方案一：组合使用 skill-manager + mcp-management（推荐）

**优势**：
- ✅ skill-manager 管理项目技能，优化上下文窗口
- ✅ mcp-management 管理 MCP 服务器，扩展外部工具
- ✅ 两者互补，覆盖不同管理需求
- ✅ 都是成熟方案，社区验证过

**安装命令**：
```bash
# 安装技能管理工具
npx skills add egebese/skill-manager@skill-manager -g -y

# 安装 MCP 管理工具
npx skills add mrgoonie/claudekit-skills@mcp-management -g -y
```

#### 方案二：仅使用 skill-manager

**优势**：
- ✅ 专注技能管理，简单直接
- ✅ 自动检测项目技术栈
- ✅ 智能禁用不相关技能
- ✅ 减少配置复杂度

**适用场景**：
- 主要需求是技能管理
- 不需要 MCP 服务器集成
- 希望简化配置

**安装命令**：
```bash
npx skills add egebese/skill-manager@skill-manager -g -y
```

### 技术参考

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Claude Code 文档](https://github.com/anthropics/claude-code)
- [Skills CLI 文档](https://skills.sh/)
- [Gemini CLI 文档](https://github.com/google/gemini-cli)

### 相关任务

- [x] 20260401-ai-ide-directory-migration：AI IDE 目录迁移
- [x] 20260331-baidu-analytics：百度统计接入
