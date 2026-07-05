<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import MarkdownSourceLink from './components/MarkdownSourceLink.vue'
import RecommendCard from './components/RecommendCard.vue'

const { Content } = DefaultTheme
const { frontmatter } = useData()
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <MarkdownSourceLink />
      <h1 v-if="frontmatter.title" class="vp-doc-title">
        {{ frontmatter.title }}
      </h1>
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

:global(.VPContent) .footer-recommend {
  margin-top: 4rem;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .footer-recommend {
    margin: 2rem 1rem;
  }
}

.vp-doc-title {
  margin-top: 0;
  margin-bottom: 1.25rem;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

@media (max-width: 768px) {
  .vp-doc-title {
    font-size: 1.5rem;
  }
}
</style>