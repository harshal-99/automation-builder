<script setup lang="ts">
import { onMounted } from 'vue'
import { useWorkflowStore, useHistoryStore } from '@/stores'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Sidebar from '@/components/ui/Sidebar.vue'

const workflowStore = useWorkflowStore()
const historyStore = useHistoryStore()

// Set up history snapshot handlers
onMounted(() => {
  historyStore.setSnapshotHandlers(
    () => ({
      nodes: workflowStore.nodes,
      edges: workflowStore.edges,
      viewport: workflowStore.viewport,
    }),
    (snapshot) => workflowStore.restoreSnapshot(snapshot)
  )
})
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden">
    <!-- Header -->
    <header class="flex items-center justify-between h-14 px-4 bg-gray-800 border-b border-gray-700">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold text-white">Automation Builder</h1>
      </div>
      <div class="flex-1 flex justify-center">
        <input
          v-model="workflowStore.name"
          type="text"
          class="bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none text-white py-1.5 px-3 rounded text-sm text-center min-w-50"
          placeholder="Workflow name"
        />
      </div>
      <div class="flex items-center gap-2">
        <Button>Save</Button>
        <Button variant="primary">Run</Button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar - Node Palette -->
      <Sidebar title="Nodes" side="left">
        <p class="text-xs text-gray-500 p-4">Node palette coming soon...</p>
      </Sidebar>

      <!-- Canvas -->
      <div class="flex-1 relative bg-gray-900">
        <!-- VueFlow canvas will be added in Phase 2 -->
        <div class="flex items-center justify-center h-full">
          <p class="text-gray-500">Canvas ready for Phase 2</p>
        </div>
      </div>

      <!-- Right Sidebar - Config Panel -->
      <Sidebar title="Configuration" side="right">
        <p class="text-xs text-gray-500 p-4">Select a node to configure</p>
      </Sidebar>
    </main>

    <!-- Footer - Execution Controls -->
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
  </div>
</template>
