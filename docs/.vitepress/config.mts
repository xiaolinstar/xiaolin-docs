import { defineConfig } from 'vitepress'

const base = process.env.GITHUB_ACTIONS === 'true' ? '/xiaolin-docs/' : '/'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base,
  title: "持续运维",
  description: "千万用户级软件系统运维经验交流与分享",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: `${base}` },
      { text: '运维经验', link: `${base}/dev-exp/index` },
      { text: '前沿科技', link: `${base}/latest-tech/index` },
      { text: '高效办公', link: `${base}/easy-office/index` }
    ],

    sidebar: [
      {
        text: '运维经验',
        items: [
          { text: '推荐使用Markdown', link: `${base}/dev-exp/index` },
          { text: '运行API', link: `${base}/dev-exp/index` },
          { text: '网站背景', link: `${base}/dev-exp/index` }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xiaolinstar?tab=repositories' }
    ]
  }
})
