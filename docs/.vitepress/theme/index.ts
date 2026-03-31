import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'

declare global {
  interface Window {
    _hmt?: any[]
  }
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    if (typeof window !== 'undefined') {
      router.onAfterRouteChanged = (to: string) => {
        if (typeof window._hmt !== 'undefined') {
          window._hmt.push(['_trackPageview', to])
        }
      }
    }
  }
} satisfies Theme
