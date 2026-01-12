<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary'
}>()
</script>

<template>
  <button
    class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
    :class="variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-500'
      : 'bg-gray-700 text-white hover:bg-gray-600'"
  >
    <slot />
  </button>
</template>
