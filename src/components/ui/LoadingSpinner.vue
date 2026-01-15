<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  label: '',
})

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-2"
    role="status"
    aria-live="polite"
  >
    <div
      :class="[
        sizeClasses[size],
        'spinner rounded-full border-gray-600 border-t-blue-500',
      ]"
      :aria-label="label || 'Loading'"
    />
    <span v-if="label" class="text-sm text-gray-400">{{ label }}</span>
    <span class="sr-only">{{ label || 'Loading' }}</span>
  </div>
</template>

<style scoped>
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    border-top-color: var(--color-blue-500);
    opacity: 0.7;
  }
}
</style>
