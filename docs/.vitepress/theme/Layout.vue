<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import MarkdownSourceLink from './components/MarkdownSourceLink.vue'
import RecommendCard from './components/RecommendCard.vue'

const { Content } = DefaultTheme
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <MarkdownSourceLink />
    </template>
    <template #doc-after>
      <div class="footer-recommend">
        <RecommendCard />
      </div>
    </template>
  </DefaultTheme.Layout>
</template>

<style scoped>
.footer-recommend {
  margin: 3rem auto;
  max-width: 900px;
  padding: 0 1rem;
}

/* 适配 VitePress 文档布局 */
:global(.VPContent) .footer-recommend {
  margin-top: 4rem;
  margin-bottom: 2rem;
}

/* 确保在移动端也有良好显示 */
@media (max-width: 768px) {
  .footer-recommend {
    margin: 2rem 1rem;
  }
}
</style>
