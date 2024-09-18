import { defineConfig } from 'vitepress'

// @ts-ignore 网站基础路径，区分GitHub部署和常规部署
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/xiaolin-docs/' : '/'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: basePath,
  title: "持续运维",
  description: "系统运维管理员日常工作经验交流与分享",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: `` },
      { text: '运维经验', link: `devops/index` },
      { text: '轻松办公', link: `easy-office/index` },
      { text: '南京生活', link: `life-nanjing/index` },
      { text: '前沿科技', link: `latest-tech/index` }
    ],

    sidebar: [
      {
        text: 'DevOps',
        items: [
          { text: '开发运维', link: `devops/index` },
          { text: '你好Jenkins', link: `devops/hello-jenkins/index` },
          { text: 'Zookeeper宕机恢复', link: `devops/zookeeper-restore/index` },
        ]
      },
      {
        text: 'Easy-Office',
        items: [
          { text: '轻松办公', link: `easy-office/index` },
          { text: 'Thunderbird解放收件箱', link: `easy-office/email-thunderbird/index` },
          { text: '推荐使用Markdown', link: `easy-office/markdown/index` },
        ]
      },
      {
        text: 'Latest-Tech',
        items: [
          { text: '前沿科技', link: `latest-tech/index` },
        ]
      },
      {
        text: 'Life-Nanjing',
        items: [
          { text: '南京生活', link: `life-nanjing/index` },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xiaolinstar?tab=repositories' }
    ]
  }
})
