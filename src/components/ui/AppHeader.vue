<script setup lang="ts">
import { useWorkflowStore, useHistoryStore } from '@/stores'
import Button from './Button.vue'
import IconButton from './IconButton.vue'

interface Props {
  saveStatus: string
  isSaving: boolean
  onSave: () => void
  onLoad: () => void
  onExport: () => void
  onImport: () => void
  onTemplates: () => void
}

defineProps<Props>()

const workflowStore = useWorkflowStore()
const historyStore = useHistoryStore()
</script>

<template>
  <header class="flex items-center justify-between h-14 px-4 bg-gray-800 border-b border-gray-700" role="banner">
    <div class="flex items-center gap-2">
      <h1 class="text-lg font-semibold text-white">Automation Builder</h1>
    </div>
    <div class="flex-1 flex justify-center">
      <label for="workflow-name" class="sr-only">Workflow name</label>
      <input
        id="workflow-name"
        v-model="workflowStore.name"
        type="text"
        aria-label="Workflow name"
        class="bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 text-white py-1.5 px-3 rounded text-sm text-center min-w-50"
        placeholder="Workflow name"
      />
    </div>
    <div class="flex items-center gap-2">
      <!-- Undo/Redo buttons -->
      <div class="flex items-center gap-1 mr-2 border-r border-gray-700 pr-2" aria-label="History controls">
        <IconButton
          title="Undo (Ctrl/Cmd+Z)"
          aria-label="Undo last action"
          :disabled="!historyStore.canUndo"
          @click="historyStore.undo()"
        >
          ↶
        </IconButton>
        <IconButton
          title="Redo (Ctrl/Cmd+Shift+Z)"
          aria-label="Redo last undone action"
          :disabled="!historyStore.canRedo"
          @click="historyStore.redo()"
        >
          ↷
        </IconButton>
      </div>
      <!-- Save status indicator -->
      <output class="text-xs text-gray-400 mr-2" aria-live="polite">{{ saveStatus }}</output>
      <Button @click="onSave" :disabled="isSaving">
        {{ isSaving ? 'Saving...' : 'Save' }}
      </Button>
      <Button @click="onLoad" aria-label="Load workflow">Load</Button>
      <Button @click="onTemplates" aria-label="Open templates">Templates</Button>
      <div class="flex items-center gap-1 border-l border-gray-700 pl-2 ml-1" aria-label="Import and export controls">
        <IconButton title="Export workflow" aria-label="Export workflow to JSON" @click="onExport">📤</IconButton>
        <IconButton title="Import workflow" aria-label="Import workflow from JSON" @click="onImport">📥</IconButton>
      </div>
      <Button variant="primary" aria-label="Run workflow">Run</Button>
    </div>
  </header>
</template>
