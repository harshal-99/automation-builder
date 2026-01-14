<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  ariaLabel?: string
}>()
</script>

<template>
  <button
    :disabled="disabled"
    :aria-label="ariaLabel"
    class="px-3 py-1.5 rounded text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
    :class="variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
      : 'bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'"
  >
    <slot />
  </button>
</template>
