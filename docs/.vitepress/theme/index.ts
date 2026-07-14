import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import RecommendCard from './components/RecommendCard.vue'
import 'katex/dist/katex.min.css'

declare global {
  interface Window {
    _hmt?: any[]
  }
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    // 注册推荐卡片组件
    app.component('RecommendCard', RecommendCard)
    
    if (typeof window !== 'undefined') {
      router.onAfterRouteChanged = (to: string) => {
        if (typeof window._hmt !== 'undefined') {
          window._hmt.push(['_trackPageview', to])
        }
      }
    }
  }
} satisfies Theme
