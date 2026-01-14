<script setup lang="ts">
import { useWorkflowStore } from '@/stores'
import Button from './Button.vue'
import IconButton from './IconButton.vue'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'download'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const workflowStore = useWorkflowStore()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-dialog-title"
    @click.self="close"
  >
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col border border-gray-700">
      <div class="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 id="export-dialog-title" class="text-lg font-semibold text-white">Export Workflow</h2>
        <IconButton title="Close" aria-label="Close export dialog" @click="close">×</IconButton>
      </div>
      <div class="flex-1 overflow-auto p-4">
        <label for="export-json" class="sr-only">Exported workflow JSON</label>
        <textarea
          id="export-json"
          :value="workflowStore.exportWorkflow()"
          readonly
          aria-label="Exported workflow JSON"
          class="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded border border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        />
      </div>
      <div class="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
        <Button @click="$emit('download')" aria-label="Download workflow as JSON file">Download JSON</Button>
        <Button @click="close" aria-label="Close export dialog">Close</Button>
      </div>
    </div>
  </div>
</template>
