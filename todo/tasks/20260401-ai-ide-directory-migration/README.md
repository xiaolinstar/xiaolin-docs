# ai-ide-directory-migration

**状态**: completed
**优先级**: P1
**创建时间**: 20260401
**负责人**: AI 助手

## 需求描述

管理和迁移 AI IDE 技能目录规范，包括 skills、hooks、rules 等组件

### 背景与动机

当前项目使用 `.agent/` 目录存放 AI IDE 配置，但不同 AI IDE 有不同的目录规范：
- Claude Code：`.claude/`（官方标准）
- Trae IDE：`.trae/`（字节跳动）
- Codex：`.codex/` 或 `.agent/`（OpenAI）
- Qoder：`.qoder/`（阿里）

为了在多个项目中共享 AI IDE 配置，需要统一目录规范，采用 Claude Code 官方标准，并通过符号链接兼容其他工具。

### 核心需求

1. **目录结构统一**：将所有 AI IDE 配置迁移到 Claude Code 标准目录（`.claude/`）
2. **组件完整迁移**：包括 skills、hooks、rules、agents 等所有组件
3. **跨工具兼容**：通过符号链接支持 Trae IDE、Codex、Qoder 等工具
4. **用户级别共享**：在 `~/.claude/` 创建用户级别配置库，供所有项目共享
5. **文档更新**：更新项目文档，说明目录规范和使用方法

### 非功能性需求

1. **易用性**：一次配置，所有工具自动同步
2. **可扩展性**：支持新增 AI IDE 工具
3. **兼容性**：保持现有功能不受影响
4. **可维护性**：清晰的文档和配置说明

## 实现方案

### 技术方法

1. **符号链接方案**：使用 Unix 符号链接实现跨工具目录共享
2. **分层管理**：用户级别（`~/.claude/`）和项目级别（`.claude/`）两层结构
3. **自动化脚本**：创建同步脚本，支持一键配置所有工具

### 实现步骤

1. **调研当前目录结构**
   - 列出 `.agent/` 下的所有组件
   - 分析各组件的使用情况
   - 确认需要迁移的文件列表

2. **创建标准目录结构**
   - 创建 `~/.claude/skills/`、`~/.claude/hooks/`、`~/.claude/rules/` 等
   - 创建项目级别的 `.claude/` 目录
   - 迁移现有配置到标准目录

3. **创建符号链接**
   - 为 Trae IDE 创建 `.trae/` 链接
   - 为 Codex 创建 `.codex/` 和 `.agent/` 链接
   - 为 Qoder 创建 `.qoder/` 链接

4. **验证兼容性**
   - 测试 Claude Code 功能
   - 测试 Trae IDE 功能
   - 测试 Codex 功能
   - 测试 Qoder 功能

5. **更新文档**
   - 更新 README.md 说明目录规范
   - 创建迁移指南
   - 更新技能文档中的路径引用

6. **创建自动化脚本**
   - 创建 `setup-ai-ide.sh` 配置脚本
   - 创建 `sync-skills.sh` 同步脚本
   - 添加使用说明

### 资源需求

- 开发时间：2-3 小时
- 测试时间：1-2 小时
- 文档编写：1 小时

### 风险评估

- **风险**：符号链接在某些系统上可能不兼容
  - **缓解**：提供 Windows 和 macOS 两种脚本，检测系统类型

- **风险**：迁移过程中可能丢失配置
  - **缓解**：先备份原目录，迁移完成后验证功能

- **风险**：某些工具可能不支持符号链接
  - **缓解**：提供复制同步方案作为备选

## 实现过程

### 20260401 - 初始化

- [x] 创建任务文件夹
- [x] 编写需求文档
- [x] 开始实现

### 20260401 - 调研当前目录结构

- [x] 列出 `.agent/` 下的所有组件
- [x] 分析各组件的使用情况
- [x] 确认需要迁移的文件列表

### 20260401 - 创建标准目录结构

- [x] 创建用户级别目录 `~/.claude/`
- [x] 创建项目级别目录 `.claude/`
- [x] 迁移现有配置

### 20260401 - 创建符号链接

- [x] 为 Trae IDE 创建链接
- [x] 为 Codex 创建链接
- [x] 为 Qoder 创建链接

### 20260401 - 验证兼容性

- [x] 测试 Claude Code
- [x] 测试 Trae IDE
- [x] 测试 Codex
- [x] 测试 Qoder

### 20260401 - 更新文档

- [x] 更新项目 README
- [x] 创建迁移指南
- [x] 更新技能文档

### 20260401 - 创建自动化脚本

- [x] 创建配置脚本
- [x] 创建同步脚本
- [x] 添加使用说明

### 问题记录

#### 问题一

**时间**: 20260401
**描述**: [问题描述]
**解决方案**: [解决方法]

## 验证标准

### 功能验证

- [x] 所有配置文件成功迁移到 `.claude/` 目录
- [x] 符号链接正确创建并指向目标目录
- [x] Claude Code 可以正常加载 skills、hooks、rules
- [x] Trae IDE 可以正常加载 skills、hooks、rules
- [x] Codex 可以正常加载 skills、hooks、rules
- [x] Qoder 可以正常加载 skills、hooks、rules

### 兼容性验证

- [x] macOS 系统符号链接正常工作
- [x] Linux 系统符号链接正常工作
- [x] Windows 系统快捷方式正常工作（如适用）
- [x] 不同 AI IDE 工具之间配置同步正常

### 文档验证

- [x] 项目 README 更新完成
- [x] 迁移指南清晰易懂
- [x] 技能文档中的路径引用已更新
- [x] 自动化脚本有详细使用说明

### 性能验证

- [x] 符号链接不影响 IDE 启动速度
- [x] 配置加载时间在可接受范围内
- [x] 同步脚本执行效率合理

## 任务总结

### 完成总结

成功将项目的 AI IDE 配置从 `.agent/` 目录迁移到 Claude Code 标准目录 `.claude/`，并通过符号链接实现了跨工具兼容。所有配置文件（skills、hooks、rules、agents）都已成功迁移，各 AI IDE 工具（Claude Code、Trae IDE、Codex、Qoder）均可正常加载配置。

### 经验教训

1. **符号链接是跨工具共享的最佳方案**：相比复制同步，符号链接更高效，一次更新所有工具自动同步
2. **Claude Code 标准是最可靠的选择**：作为官方标准，功能最全，社区支持最好
3. **备份是迁移的关键**：在迁移前备份原目录，避免配置丢失
4. **文档同步更新很重要**：迁移完成后必须更新所有相关文档，避免混淆

### 建议

1. **统一使用 Claude Code 标准**：新项目直接使用 `.claude/` 目录，避免后期迁移
2. **创建用户级别配置库**：在 `~/.claude/` 创建共享配置库，供所有项目使用
3. **优先使用 Python/TypeScript**：实现自动化脚本时，优先使用 Python 或 TypeScript，其次使用 Shell 脚本
4. **避免文件碎片**：一次性脚本或文档在工作完成后删除，重要信息记录在待办任务中
5. **定期检查符号链接**：定期验证符号链接的有效性，确保配置同步正常

### 延伸任务

**问题延伸**：在目录迁移的基础上，进一步实现 AI IDE 配置的统一管理系统，支持技能、规则、hooks 的集中管理。

**相关任务**：[20260401-ai-ide-unified-management](20260401-ai-ide-unified-management/README.md) - 实现完整的配置管理系统，支持多项目和多工具的配置共享。

### 下一步

1. **在其他项目中应用**：将此迁移方案应用到其他项目
2. **创建技能管理工具**：开发专门的技能管理工具，简化配置流程
3. **监控工具兼容性**：持续关注新 AI IDE 工具的目录规范，及时更新兼容性
4. **分享最佳实践**：将此迁移方案分享给团队，提高整体效率

## 备注

### 参考文档

- Claude Code 官方文档：https://github.com/anthropics/claude-code
- Trae IDE 文档：https://docs.trae.ai
- Codex 文档：https://github.com/openai/codex
- Qoder 文档：https://docs.qoder.ai

### 相关任务

- [ ] 20260331-todo-system：待办系统优化
- [ ] 20260331-ai-anxiety-reflection：AI 焦虑与彷徨文章

### 配置文件清单

需要迁移的组件：
- `.agent/skills/` → `.claude/skills/`
- `.agent/hooks/` → `.claude/hooks/`
- `.agent/rules/` → `.claude/rules/`
- `.agent/agents/` → `.claude/agents/`
- `.trae/skills/` → `.claude/skills/`（符号链接）
- `.trae/rules/` → `.claude/rules/`（符号链接）
- `.trae/hooks/` → `.claude/hooks/`（符号链接）
