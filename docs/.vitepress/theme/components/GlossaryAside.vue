<script setup lang="ts">
defineProps<{ term: string; definition: string }>()
</script>

<template>
  <aside class="glossary-aside" role="note">
    <p><strong>{{ term }}</strong>：{{ definition }}</p>
  </aside>
</template>

<style scoped>
.glossary-aside {
  margin: 1em 0;
  padding: 0.75em 1em;
  border-left: 4px solid var(--vp-c-brand-1);
  border-radius: 0 6px 6px 0;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.glossary-aside p {
  margin: 0;
  line-height: 1.6;
}

.glossary-aside strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
}
</style>
