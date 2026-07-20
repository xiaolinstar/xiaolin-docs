<script setup lang="ts">
import { ref, onMounted, onUnmounted, useId } from 'vue'

defineProps<{ term: string; definition: string }>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const tipId = `glossary-tip-${useId()}`

/** Fine pointer + hover: desktop hover mode; otherwise click + outside. */
const fineHover = ref(false)

function syncPointerMode() {
  fineHover.value =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function onMouseEnter() {
  if (!fineHover.value) return
  open.value = true
}

function onMouseLeave() {
  if (!fineHover.value) return
  open.value = false
}

function onClick(e: MouseEvent) {
  e.stopPropagation()
  // Fine-hover desktops use hover; keyboard users toggle via Enter/Space.
  // detail===0 ≈ keyboard-activated click (progressive enhancement).
  if (fineHover.value && e.detail !== 0) return
  open.value = !open.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  e.stopPropagation()
  open.value = !open.value
}

function onDocumentClick(e: MouseEvent) {
  if (!open.value) return
  const el = rootRef.value
  if (el && !el.contains(e.target as Node)) {
    open.value = false
  }
}

let mq: MediaQueryList | null = null

function onMqChange() {
  syncPointerMode()
  if (fineHover.value) open.value = false
}

onMounted(() => {
  syncPointerMode()
  mq = window.matchMedia('(hover: hover) and (pointer: fine)')
  mq.addEventListener('change', onMqChange)
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  mq?.removeEventListener('change', onMqChange)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <span
    ref="rootRef"
    class="glossary-term"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @click="onClick"
  >
    <button
      type="button"
      class="glossary-term__label"
      :aria-describedby="tipId"
      :aria-expanded="open"
      @keydown="onKeydown"
    >
      <slot />
    </button>
    <span
      v-show="open"
      :id="tipId"
      role="tooltip"
      class="glossary-term__tip"
    >{{ definition }}</span>
  </span>
</template>

<style scoped>
.glossary-term {
  position: relative;
  display: inline;
}

.glossary-term__label {
  display: inline;
  padding: 0;
  margin: 0;
  border: none;
  border-bottom: 1px dashed var(--vp-c-brand-1);
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: help;
}

.glossary-term__tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  z-index: 30;
  transform: translateX(-50%);
  min-width: 12em;
  max-width: min(20em, 80vw);
  padding: 0.5em 0.75em;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font-size: 0.85em;
  font-weight: 400;
  line-height: 1.5;
  white-space: normal;
  text-align: left;
  box-shadow: var(--vp-shadow-2);
  pointer-events: none;
}
</style>
