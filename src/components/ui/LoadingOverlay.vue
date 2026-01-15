<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  show: boolean
  message?: string
  blur?: boolean
}

withDefaults(defineProps<Props>(), {
  message: 'Loading...',
  blur: true,
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="absolute inset-0 flex items-center justify-center z-50 bg-gray-900/50"
      :class="{ 'backdrop-blur-sm': blur }"
      role="dialog"
      aria-modal="true"
      :aria-label="message"
    >
      <div
        class="bg-gray-800/90 rounded-lg p-6 shadow-xl border border-gray-700"
      >
        <LoadingSpinner size="lg" :label="message" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
