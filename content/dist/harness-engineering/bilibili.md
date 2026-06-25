---
account: AI持续运维
status: draft
target_duration: 10min
---

# 标题（≤80 字）

驾驭工程入门：为什么 Prompt 不够用了？Rules / Hooks / Skills 怎么配

---

# 30 秒口播钩子

「你有没有遇到过这种情况：跟 Cursor 说了十遍不要改依赖，它下一轮还是改了？这不是模型笨，是结对编程这条路走到头了。今天聊一个叫驾驭工程的东西——怎么把约束写进工程，而不是写进聊天记录。」

---

# 分镜 / 章节

| 时间 | 内容 | 画面 |
|------|------|------|
| 00:00 | 钩子：Prompt 反复失效的真实场景 | 录屏 Cursor 对话 + _FACECAM |
| 00:30 | 这期讲什么：Harness 三件套 + 适合谁 | 幻灯片目录 |
| 01:00 | 结对编程痛点：API 幻觉、删校验、注意力漂移 | 原文信息图 02 |
| 03:00 | 驾驭工程定义：口头指令 → 代码级屏障 | 围栏比喻动画 / 静态图 |
| 04:30 | Rules 实操：展示项目 .cursor/rules 或 CLAUDE.md | 屏幕录制 |
| 06:00 | Hooks：pre-commit 如何把错误扔回给模型 | 终端演示（可选） |
| 07:30 | Skills / Subagent：权限切分思路 | 原文信息图 05 |
| 09:00 | 总结：泥瓦匠 → 基建架构师 + 跨 IDE 管理挑战 | 信息图 06 |
| 09:30 | 引流站点 + 关注 | 结束页 |

---

# 简介

```markdown
【本期要点】
1. 为什么单靠 Prompt 无法约束 Agent
2. 驾驭工程（Harness Engineering）是什么
3. Rules / Hooks / Skills 各自解决什么问题

【适用人群】
用 Cursor、Claude Code 等 AI IDE 的一线开发者、个人开发者

【相关链接】
站点原文：https://xiaolinstar.cn/ai/theory/harness-engineering.html

【时间戳】
00:00 开场
01:00 结对编程痛点
03:00 什么是驾驭工程
04:30 Rules
06:00 Hooks
07:30 Skills 与子代理
09:00 总结

#VibeCoding #Cursor #驾驭工程 #AI编程 #Harness #Rules #Skills
```
