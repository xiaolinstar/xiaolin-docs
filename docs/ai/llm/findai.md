---
title: 构建记忆系统，从发现开始
description: 在构建自己的 AI Agents、Skills 和 Commands 时，不要急着自己手写，也不要让 AI 生成。
date: 2026-03-28
updated: 2026-03-28
category: AI 实践
tags:
  - LLM
---

# 构建记忆系统，从发现开始

## Extensions plug

## 核心理念：先发现，再创造

在构建自己的 AI Agents、Skills 和 Commands 时，**不要急着自己手写，也不要让 AI 生成**。首要任务是：**先去发现别人创建好的、并且已经被广泛认可的方案**。

这就像开源软件的使用哲学：
- ❌ 错误做法：需要日志功能 → 自己写一个日志库
- ✅ 正确做法：需要日志功能 → 寻找成熟的 Log4j、SLF4J

AI Skills 领域同样如此。为什么要重复造轮子？站在巨人的肩膀上，才能走得更快、更远。

## 为什么「发现」如此重要？

### 1. 避免重复劳动
别人可能已经花了数百小时打磨一个 Skill，涵盖了各种边界场景和最佳实践。你自己从零开始，很可能忽略关键细节。

### 2. 质量保证
被广泛使用的 Skills 经过了大量用户的验证和迭代，稳定性和实用性远高于个人临时编写的版本。

### 3. 生态协同
使用标准化的 Skills，可以与其他工具无缝集成，享受社区持续更新的红利。

### 4. 学习机会
研究优秀的 Skills，是学习如何设计高质量 AI 指令的最佳途径。

## 主要发现平台

### 🌟 SkillHub（腾讯）

**网址**：https://skillhub.tencent.com/

**特点**：
- 🇨🇳 **专为中国用户优化**：中文支持友好，访问速度快
- 📦 **海量资源**：收录超过 13,000+ 个 AI Skills
- 🔒 **安全审核**：所有技能经过安全审查，使用更放心
- 🎯 **精选 Top 50**：提供高质量技能推荐，降低选择成本
- 🚀 **CLI 工具支持**：可通过命令行快速搜索和安装

**使用方式**：
```bash
# 安装SkillHub CLI
curl -fsSL https://skillhub-1388575217.cos.ap-guangzhou.myqcloud.com/install/install.sh | bash

# 搜索技能
skillhub search github

# 安装技能到当前 workspace
skillhub install github
```

**适用场景**：微信公众号运营、技术文档写作、代码审查、Git 提交规范等通用场景

### 🌟 Agent Skills Marketplace（GitHub）

**网址**：https://github.com/block/agent-skills

**特点**：
- 🔓 **开放标准**：基于 SKILL.md 格式，兼容性强
- 🌐 **国际化**：全球开发者贡献，覆盖面广
- 🔧 **高度可定制**：支持深度定制和二次开发
- 🤝 **社区驱动**：完全开源，透明度高

**支持工具**：Claude Code、Codex CLI、ChatGPT 等主流 AI 助手

**适用场景**：编程辅助、DevOps 自动化、数据分析等技术场景

### 🌟 SkillsMP（跨平台市场）

**网址**：https://skillsmp.com/

**特点**：
- 📊 **规模庞大**：500,000+ 个可用技能
- 🔄 **多平台兼容**：支持 Claude、Codex、ChatGPT 等多个平台
- 📋 **标准化格式**：采用开放的 SKILL.md 标准
- 🔍 **分类清晰**：便于按类别、热度、评分筛选

**适用场景**：办公自动化、内容创作、客户服务等商业场景

### 🌟 Atmos AI Skill Marketplace

**网址**：https://atmos.tools/ai/skill-marketplace

**特点**：
- 📂 **基于 GitHub**：技能以 GitHub 仓库形式存储和管理
- 🛠️ **易于分享**：支持通过 GitHub 仓库分享自定义技能
- 📦 **本地化管理**：安装的技能存储在本地 `.atmos` 目录

**适用场景**：团队协作、企业内部技能共享

## 发现的正确姿势

### Step 1：明确需求
在搜索之前，先问自己：
- 我需要解决什么具体问题？
- 这个技能的输入输出是什么？
- 有什么特殊要求（性能、安全性、兼容性）？

### Step 2：多维度搜索
不要只搜一次！尝试：
- **关键词搜索**：如 "git commit"、"code review"
- **场景搜索**：如 "微信公众号"、"技术文档"
- **工具搜索**：如 "claude"、"cursor"

### Step 3：评估质量
看这些指标：
- ⭐ **使用量**：下载/安装次数
- 📝 **评价**：用户反馈和评分
- 🔄 **更新频率**：是否持续维护
- 👥 **作者信誉**：是否有其他优质作品

### Step 4：小范围试用
不要直接用于生产环境！先：
- 在测试项目中安装
- 验证基本功能
- 检查与现有工作流的兼容性

### Step 5：规模化应用
确认可靠后：
- 在团队内推广
- 建立使用规范
- 持续跟踪效果

## 实战案例：安装 GitHub技能

假设你需要增强 AI 助手的 GitHub 相关能力：

```bash
# 1. 搜索相关技能
skillhub search github

# 2. 查看技能详情（通常包含使用说明、示例）
# 在 SkillHub 网站或 CLI 中查看

# 3. 安装到当前项目
skillhub install github

# 4. 验证安装
# 在你的 .qoder/skills 目录下会看到新增的 github技能

# 5. 开始使用
# 直接在对话中使用 GitHub 相关命令
```

## 避坑指南

### ❌ 常见错误

1. **闭门造车**：遇到问题直接让 AI 生成解决方案，不去搜索现有技能
2. **盲目相信**：不评估就直接在生产环境使用
3. **过度依赖**：完全不理解技能原理，出现问题无法排查
4. **忽视更新**：安装后从不更新，错过改进和安全修复

### ✅ 正确心态

1. **拿来主义**：优先使用成熟方案，必要时再定制
2. **批判思维**：保持怀疑，验证后再信任
3. **适度参与**：理解基本原理，能够调试和优化
4. **持续跟进**：关注技能更新和社区动态

## 从消费者到贡献者

当你积累了足够经验，也可以：

1. **分享经验**：在 SkillHub 等平台发布自己的 Skills
2. **改进现有**： fork 优秀项目，提交改进建议
3. **建立标准**：参与制定行业标准和最佳实践
4. **回馈社区**：帮助他人解决问题，形成正向循环

## 总结

构建 AI 能力体系，**发现比创造更重要**。

善用 SkillHub、Agent Skills Marketplace 等平台，可以让你：
- 🚀 **快速启动**：几分钟内获得成熟能力
- 💪 **事半功倍**：借助集体智慧，避免踩坑
- 🌱 **持续成长**：在学习和实践中不断提升

记住这句话：

> **聪明的开发者不是什么都自己写，而是知道去哪里找最好的方案。**

现在就开始你的发现之旅吧！🎉

## 参考资源

- [SkillHub](https://skillhub.tencent.com/) - 腾讯 AI 技能社区
- [Agent Skills Marketplace](https://github.com/block/agent-skills) - GitHub 开放市场
- [SkillsMP](https://skillsmp.com/) - 跨平台技能市场
- [Atmos AI Skills](https://atmos.tools/ai/skill-marketplace) - 基于 GitHub 的技能平台
- https://skills.sh/
- claude-skills, https://github.com/jezweb/claude-skills
- happy-claude-skills, https://github.com/iamzhihuix/happy-claude-skills

---

1. cursor-rules, https://github.com/flyeric0212/cursor-rules
2. qoder-rules, https://github.com/lvzhaobo/qoder-rules
3. 6A-TRAE, https://github.com/OIAPI/6A-TRAE?tab=readme-ov-file
4. Discover and share rules designed for Trae, https://github.com/xfq/rules
5. 