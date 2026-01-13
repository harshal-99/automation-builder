<script setup lang="ts">
import IconButton from './IconButton.vue'
</script>

<template>
  <footer class="flex items-center justify-between h-12 px-4 bg-gray-800 border-t border-gray-700">
    <div class="flex items-center gap-1">
      <IconButton title="Play">▶</IconButton>
      <IconButton title="Pause">⏸</IconButton>
      <IconButton title="Step">⏭</IconButton>
      <IconButton title="Stop">⏹</IconButton>
    </div>
    <div>
      <span class="text-xs text-gray-500">Ready</span>
    </div>
  </footer>
</template>
