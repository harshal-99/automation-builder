<script setup lang="ts">
import { ref, watch } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  show: boolean
  message?: string
  blur?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  message: 'Loading...',
  blur: true,
})

const dialogRef = ref<HTMLDialogElement | null>(null)

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    dialogRef.value?.showModal()
  } else {
    dialogRef.value?.close()
  }
})
</script>

<template>
  <Transition name="fade">
    <dialog
      v-if="show"
      ref="dialogRef"
      class="absolute inset-0 flex items-center justify-center z-50 bg-gray-900/50 backdrop:bg-gray-900/50"
      :class="{ 'backdrop-blur-sm backdrop:backdrop-blur-sm': blur }"
      :aria-label="message"
    >
      <div
        class="bg-gray-800/90 rounded-lg p-6 shadow-xl border border-gray-700"
      >
        <LoadingSpinner size="lg" :label="message" />
      </div>
    </dialog>
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
