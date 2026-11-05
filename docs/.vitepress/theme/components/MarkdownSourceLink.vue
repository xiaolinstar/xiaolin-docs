<script setup lang="ts">
import { useRoute, useData } from 'vitepress'
import { markdownSourceUrl } from '../../siteUrls'
import { computed } from 'vue'

const route = useRoute()

const { site } = useData()
const markdownUrl = computed(() => markdownSourceUrl(route.path, site.value.base))

</script>

<template>
  <div class="markdown-source-link">
    <span class="label">📄 Markdown 源文件：</span>
    <a :href="markdownUrl" class="url" target="_blank">{{ markdownUrl }}</a>
  </div>
</template>

<style scoped>
.markdown-source-link {
  padding: 8px 16px;
  margin-bottom: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  background-color: var(--vp-c-bg-soft);
}

.markdown-source-link .label {
  font-weight: 500;
  margin-right: 8px;
}

.markdown-source-link .url {
  color: var(--vp-c-brand);
  font-family: var(--vp-font-family-mono);
  word-break: break-all;
}

.markdown-source-link .url:hover {
  text-decoration: underline;
}
</style>
