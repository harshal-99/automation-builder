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
}

defineProps<Props>()

const workflowStore = useWorkflowStore()
const historyStore = useHistoryStore()
</script>

<template>
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
      <!-- Save status indicator -->
      <span class="text-xs text-gray-400 mr-2">{{ saveStatus }}</span>
      <Button @click="onSave" :disabled="isSaving">
        {{ isSaving ? 'Saving...' : 'Save' }}
      </Button>
      <Button @click="onLoad">Load</Button>
      <div class="flex items-center gap-1 border-l border-gray-700 pl-2 ml-1">
        <IconButton title="Export workflow" @click="onExport">📤</IconButton>
        <IconButton title="Import workflow" @click="onImport">📥</IconButton>
      </div>
      <Button variant="primary">Run</Button>
    </div>
  </header>
</template>
