import { defineConfig } from 'vitepress'

// @ts-ignore 网站基础路径，区分GitHub部署和常规部署
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/xiaolin-docs/' : '/'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: basePath, // (*)设置域名前缀
  title: "持续运维",
  description: "系统运维管理员日常工作经验交流与分享",
  head: [['link', { rel: 'icon', href: 'static/sparrow.svg' }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: 'static/sparrow.svg',
    nav: [
      { text: '首页', link: `/` },
      { text: '开发运维', link: `devops/index` },
      { text: '轻松办公', link: `easy-office/index` },
      { text: '南京生活', link: `life-nanjing/index` },
      { text: '前沿科技', link: `latest-tech/index` }
    ],

    sidebar: [
      {
        text: '开发运维', link: `devops/index`,
        items: [
          { text: '你好Jenkins', link: `devops/hello-jenkins/index` },
          { text: 'Zookeeper宕机恢复', link: `devops/zookeeper-restore/index` },
        ]
      },
      {
        text: '轻松办公', link: `easy-office/index`,
        items: [
          { text: 'Thunderbird解放收件箱', link: `easy-office/email-thunderbird/index` },
          { text: '推荐使用Markdown', link: `easy-office/markdown/index` },
        ]
      },
      {
        text: '前沿科技', link: `latest-tech/index`,
        items: [
        ]
      },
      {
        text: '南京生活', link: `life-nanjing/index`,
        items: [
          { text: '南京大学', link: `life-nanjing/university/nju/index` },
          { text: '南京师范大学', link: `life-nanjing/university/nnu/index` },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xiaolinstar?tab=repositories' }
    ]
  }
})
