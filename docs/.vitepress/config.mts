// import { defineConfig } from 'vitepress'
import { withMermaid } from "vitepress-plugin-mermaid"
import markdownItTaskListPlus from "markdown-it-task-list-plus"

// @ts-ignore 网站基础路径，区分GitHub部署和常规部署
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/xiaolin-docs/' : '/'

// https://vitepress.dev/reference/site-config
// export default defineConfig({
export default withMermaid({
  base: basePath, // (*)设置域名前缀
  title: "持续运维",
  description: "系统运维管理员日常工作经验交流与分享",
  head: [['link', { rel: 'icon', href: '/sparrow.svg' }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/sparrow.svg',
    nav: [
      { text: '首页', link: `/` },
      { text: '开发运维', link: `/devops/` },
      { text: '轻松办公', link: `/easy-office/` },
      { text: '南京生活', link: `/life-nanjing/` },
      { text: '前沿科技', link: `/latest-tech/` }
    ],

    sidebar: {
      '/devops/': [
        {
          text: '开发运维', link: `/devops/`,
          items: [
            { text: '你好Jenkins', link: `/devops/hello-jenkins` },
            { text: 'Zookeeper宕机恢复', link: `/devops/zookeeper-restore` },
            { text: 'VitePress快速搭建个人网站', link: `/devops/vitepress-docs`},
            { text: 'CI/CD初体验', link: `/devops/cicd-taste`},
            { text: '连接资源泄露', link: `/devops/conn-leak`},
            { text: '内存泄露', link: `/devops/memory-leak`},
            { text: '小步快跑，餐饮中的「持续集成」', link: `/devops/catering-ops`},
          ]
        }
      ],

      '/easy-office/': [
        {
          text: '轻松办公', link: `/easy-office/`,
          items: [
            { text: 'Thunderbird解放收件箱', link: `/easy-office/email-thunderbird` },
            { text: '易读易写Markdown', link: `/easy-office/markdown` },
            { text: '协同办公', link: `/easy-office/wework` },
          ]
        }
      ],

      '/latest-tech/': [
        {
          text: '前沿科技', link: `/latest-tech/`,
          items: [
          ]
        }
      ],

      '/life-nanjing/': [
        {
          text: '南京生活', link: `/life-nanjing/`,
          items: [
            { text: '南京大学', link: `/life-nanjing/university/nju` },
            { text: '南京师范大学', link: `/life-nanjing/university/nnu` },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xiaolinstar?tab=repositories' }
    ],
    // 页脚
    footer: {
      message: '欢迎关注微信公众号：持续运维',
      copyright: 'Copyright © 2024  XingXiaolin'
    },
    // 支持模糊搜索
    search: {
      provider: 'local'
    }
  },
  // 支持mermaid
  mermaid: {

  },
  mermaidPlugin: {
    class: "mermaid my-class"
  },
  // pnpm install markdown-it-mathjax3
  // pnpm install markdown-it-task-lists
  markdown: {
    // 支持数学公式
    math: true,
    // 支持代码块行号
    lineNumbers: true,
    config: (md) => {
      md.use(markdownItTaskListPlus)
    }
  },

  // 上次更新
  lastUpdated: true
})
