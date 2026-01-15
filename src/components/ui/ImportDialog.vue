<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWorkflowStore } from '@/stores'
import Button from './Button.vue'
import IconButton from './IconButton.vue'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'import', success: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const workflowStore = useWorkflowStore()
const importJson = ref('')
const importError = ref<string | null>(null)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    importJson.value = ''
    importError.value = null
  }
})

function close() {
  emit('update:modelValue', false)
}

function handleImport() {
  if (!importJson.value.trim()) {
    importError.value = 'Please paste a valid workflow JSON'
    return
  }

  if (workflowStore.hasUnsavedChanges) {
    const confirmed = confirm('You have unsaved changes. Do you want to discard them and import this workflow?')
    if (!confirmed) {
      return
    }
  }

  try {
    const success = workflowStore.importWorkflow(importJson.value)
    if (success) {
      importJson.value = ''
      importError.value = null
      emit('import', true)
      close()
    } else {
      importError.value = 'Failed to import workflow. Please check the JSON format.'
      emit('import', false)
    }
  } catch (error) {
    importError.value = error instanceof Error ? error.message : 'Failed to import workflow. Please check the JSON format.'
    emit('import', false)
  }
}

function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    importJson.value = content
  }
  reader.readAsText(file)
}
</script>

<template>
  <dialog
    v-if="modelValue"
    :open="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop:bg-black backdrop:bg-opacity-50"
    aria-labelledby="import-dialog-title"
    @click.self="close"
  >
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col border border-gray-700">
      <div class="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 id="import-dialog-title" class="text-lg font-semibold text-white">Import Workflow</h2>
        <IconButton title="Close" aria-label="Close import dialog" @click="close">×</IconButton>
      </div>
      <div class="flex-1 overflow-auto p-4">
        <div class="mb-4">
          <label for="import-file" class="block text-sm font-medium text-gray-300 mb-2">
            Paste workflow JSON or upload a file:
          </label>
          <input
            id="import-file"
            type="file"
            accept=".json"
            aria-label="Upload workflow JSON file"
            class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            @change="handleFileImport"
          />
        </div>
        <label for="import-json" class="sr-only">Paste workflow JSON</label>
        <textarea
          id="import-json"
          v-model="importJson"
          placeholder="Paste workflow JSON here..."
          aria-label="Paste workflow JSON"
          :aria-invalid="!!importError"
          :aria-describedby="importError ? 'import-error' : undefined"
          class="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded border border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          :class="{ 'border-red-500': importError }"
        />
        <div v-if="importError" id="import-error" class="mt-2 text-sm text-red-400" role="alert" aria-live="polite">
          {{ importError }}
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
        <Button @click="handleImport" aria-label="Import workflow from JSON">Import</Button>
        <Button @click="close" aria-label="Cancel import">Cancel</Button>
      </div>
    </div>
  </dialog>
</template>
