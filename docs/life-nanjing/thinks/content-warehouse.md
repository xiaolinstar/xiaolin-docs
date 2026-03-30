---
description: 构建“可对话“的内容仓库：博客的下一个进化方向——让博客同时服务于人类读者和 AI 智能体
---

# 构建“可对话“的内容仓库：博客的下一个进化方向

内容创作者每天在互联网上发表内容：博客文章、公众号推文、技术笔记、大众点评、小红书。这些内容承载着思考和经验，但其价值是否被充分利用？

事实上，各大媒体平台瓜分了知识创作，毕竟数据存储在他们的服务器上。

内容创作者在大众点评、美团、高德、小红书等多个平台进行内容分发时，需要“复制粘贴”，效率低下。同时，也会有针对不同平台的差异性调整的需求。

在 AI 辅助写作的时代，AI 只能读取渲染后的 HTML 页面，无法理解原始的 Markdown 格式，无法准确提取文章结构。

是时候审视内容资产了。**内容由创作者创作，AI 为创作者服务。**

关键词：VitePress、LLM、AI 辅助写作

*特别说明：本文是笔者与 AI“结对编程“式写作的产物。AI 是我的协作者，而我作为主导者，对文章质量负责。*

## 快速展示

建议维护自己的网站，这不仅是个人名片展示，更是数字资产维护。

在浏览 OpenClaw 社区时，发现文档头部有这样的信息：

【OpenClaw Markdown 源文件】

右边显示：分享给 Agent 理解文档。这在 AI 时代非常有必要，除了人类读者，AI Agent 会变成访问量更大的用户。

## 同一个内容，两种访问方式

传统模式下，用户访问静态资源站点的文章，看到的是渲染后的 HTML 页面。而对于 AI 智能体，这些 HTML 是“脏“的——充满了 JS 脚本、CSS 样式、无关的导航元素。

**现在，我们可以做得更好。**

以本文为例，你可以用两种方式访问：

- **面向人类**：[https://xiaolinstar.cn/life-nanjing/thinks/content-warehouse.html](https://xiaolinstar.cn/life-nanjing/thinks/content-warehouse.html)
- **面向 AI**：[https://xiaolinstar.cn/life-nanjing/thinks/content-warehouse.md](https://xiaolinstar.cn/life-nanjing/thinks/content-warehouse.md)

只需将 `.html` 改为 `.md`，AI 就能直接读取纯净的 Markdown 源文件。这意味着你的每一篇文章都同时服务于两个对象：人类读者和 AI 智能体。

## 解决方案：vitepress-plugin-llms

实现这个功能并不复杂，我们使用 VitePress 的插件生态来完成。

### 核心工具

**[vitepress-plugin-llms](https://github.com/okineadev/vitepress-plugin-llms)** 是 VitePress 的一个插件，它可以：

- 为每个页面生成 LLM 友好的 Markdown 版本
- 生成 `llms.txt` 索引文件
- 生成 `llms-full.txt` 完整内容文件

其他工具插件：[docusaurus-plugins-llms](https://github.com/okadev/docusaurus-plugins-llms)

为了让 Markdown 源文件直接在浏览器中显示，我们还需要：Nginx 配置，正确返回 `.md` 和 `.txt` 文件的 Content-Type

```nginx.conf
# 允许直接访问 .md 和 .txt 文件（LLM 友好文档）
location ~* \.(md|txt)$ {
   root   /usr/share/nginx/html;
   default_type text/plain;
   charset utf-8;
}
```

注：工具插件的详细使用步骤，请参考其官方文档，或直接让 AI IDE 来实现。

### 页面顶部显示源文件链接

可以自定义主题组件，在每个页面顶部显示 Markdown 源文件地址：

```vue
<template>
  <div class=“markdown-source-link“>
    <span>📄 Markdown 源文件：</span>
    <a :href=“markdownUrl“ target=“_blank“>{{ fullUrl }}</a>
  </div>
</template>
```

完成后显示的效果：

【xiaolinstar.cn】

## 进阶使用：给 AI IDE 的提示词模板

现在你已经完成了配置，只需要告诉 AI 如何访问你的内容仓库。以下是一个通用的提示词模板，可以在任何 AI IDE（Cursor、Trae、OpenCode 等）中使用：

```text
我有一个 VitePress 站点，部署在 https://xiaolinstar.cn/
- 站点的所有 Markdown 源文件可以直接用 .md 后缀访问
- 站点索引文件位于 https://xiaolinstar.cn/llms.txt
- 完整内容文件位于 https://xiaolinstar.cn/llms-full.txt

请先了解我的内容库，然后回答我的问题。
```

**使用场景示例**：

**让 AI 了解你的知识体系**

```text
请阅读 https://xiaolinstar.cn/llms.txt，告诉我博客的主要内容领域分布
```

**让 AI 基于你的积累回答问题**

```text
我想写一篇关于”CI/CD 最佳实践”的文章，请先阅读 https://xiaolinstar.cn/sre/devops/cicd-01.md 等相关内容，然后给我一些建议
```

**让 AI 做你的内容策划师**

```text
请分析 https://xiaolinstar.cn/llms-full.txt，帮我梳理过去一年在”AI”领域写了哪些内容
```

**核心思路**：只需告诉 AI 你的站点地址和文件规则，它就能像访问本地文件一样访问你的内容。

## 总结

当你把每一篇文章都以 Markdown 源文件的形式暴露给 AI，你的博客就不再只是”给人看”的静态页面，而是一个”可以与 AI 对话”的内容资产库。

你可以：

- 让 AI 基于你过往的积累回答新问题
- 让 AI 分析你的思考模式和知识体系
- 让 AI 在你已有的内容上进行二次创作
- 构建真正的”个人数字花园”，让 AI 成为你的第二大脑

**从今天开始，让你的每一篇文章都”一鱼两吃”。**
