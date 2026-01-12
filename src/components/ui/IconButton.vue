<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <button
    class="w-8 h-8 flex items-center justify-center bg-transparent text-gray-400 hover:bg-gray-700 hover:text-white rounded cursor-pointer"
    :title="title"
  >
    <slot />
  </button>
</template>
