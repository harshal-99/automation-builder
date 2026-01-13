<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useWorkflowStore, useHistoryStore } from '@/stores'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Sidebar from '@/components/ui/Sidebar.vue'
import NodePalette from '@/components/ui/NodePalette.vue'
import ConfigPanel from '@/components/ui/ConfigPanel.vue'
import { WorkflowCanvas } from '@/components/canvas'
import { createWorkflowNode } from '@/utils/nodeDefinitions'

const workflowStore = useWorkflowStore()
const historyStore = useHistoryStore()

// Keyboard shortcuts handler
function handleKeyDown(event: KeyboardEvent) {
  // Check if user is typing in an input field
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    // Don't intercept shortcuts when typing in inputs
    // But still allow undo/redo in text inputs (browser default)
    if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
      // Allow browser's undo in text inputs
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey) {
      // Allow browser's redo in text inputs
      return
    }
    return
  }

  // Undo: Ctrl/Cmd + Z
  if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    historyStore.undo()
    return
  }

  // Redo: Ctrl/Cmd + Shift + Z
  if ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey) {
    event.preventDefault()
    historyStore.redo()
    return
  }
}

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

  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyDown)

  // Add sample nodes for testing (remove in production)
  if (workflowStore.nodes.length === 0) {
    const triggerId = workflowStore.addNode(
      createWorkflowNode('manual-trigger', { x: 100, y: 150 })
    )
    const conditionId = workflowStore.addNode(
      createWorkflowNode('condition', { x: 350, y: 150 })
    )
    const emailId = workflowStore.addNode(
      createWorkflowNode('send-email', { x: 600, y: 80 })
    )
    const smsId = workflowStore.addNode(
      createWorkflowNode('send-sms', { x: 600, y: 220 })
    )

    // Connect nodes
    workflowStore.addEdge({ source: triggerId, target: conditionId })
    workflowStore.addEdge({
      source: conditionId,
      target: emailId,
      sourceHandle: 'true',
      label: 'Yes',
    })
    workflowStore.addEdge({
      source: conditionId,
      target: smsId,
      sourceHandle: 'false',
      label: 'No',
    })
  }
})

onUnmounted(() => {
  // Remove keyboard event listener
  window.removeEventListener('keydown', handleKeyDown)
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
        <!-- Undo/Redo buttons -->
        <div class="flex items-center gap-1 mr-2 border-r border-gray-700 pr-2">
          <IconButton
            title="Undo (Ctrl/Cmd+Z)"
            :disabled="!historyStore.canUndo"
            @click="historyStore.undo()"
          >
            ↶
          </IconButton>
          <IconButton
            title="Redo (Ctrl/Cmd+Shift+Z)"
            :disabled="!historyStore.canRedo"
            @click="historyStore.redo()"
          >
            ↷
          </IconButton>
        </div>
        <Button>Save</Button>
        <Button variant="primary">Run</Button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar - Node Palette -->
      <Sidebar title="Nodes" side="left">
        <NodePalette />
      </Sidebar>

      <!-- Canvas -->
      <div class="flex-1 relative bg-gray-900">
        <WorkflowCanvas />
      </div>

      <!-- Right Sidebar - Config Panel -->
      <Sidebar title="Configuration" side="right">
        <ConfigPanel />
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
