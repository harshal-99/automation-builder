<script setup lang="ts">
interface Props {
  path: string
  class?: string
  size?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'w-4 h-4',
})
</script>

<template>
  <svg
    :class="[size, 'shrink-0', props.class]"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    viewBox="0 0 24 24"
  >
    <path :d="path" />
  </svg>
</template>
