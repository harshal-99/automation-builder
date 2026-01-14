<script setup lang="ts">
defineProps<{
  title: string
  side?: 'left' | 'right'
}>()
</script>

<template>
  <aside
    :aria-label="title"
    class="w-65 bg-gray-800 flex flex-col"
    :class="side === 'right' ? 'border-l border-gray-700' : 'border-r border-gray-700'"
  >
    <div class="py-3 px-4 border-b border-gray-700">
      <h2 class="text-sm font-medium text-gray-400">{{ title }}</h2>
    </div>
    <div class="flex-1 overflow-y-auto">
      <slot />
    </div>
  </aside>
</template>
