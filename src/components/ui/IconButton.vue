<script setup lang="ts">
defineProps<{
  title?: string
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    :disabled="disabled"
    :class="[
      'w-8 h-8 flex items-center justify-center bg-transparent text-gray-400 hover:bg-gray-700 hover:text-white rounded cursor-pointer',
      disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-400'
    ]"
    :title="title"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
