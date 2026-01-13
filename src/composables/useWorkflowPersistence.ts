import { ref, computed } from 'vue'
import { useWorkflowStore } from '@/stores'

/**
 * Composable for workflow persistence operations (save, load, export, import)
 */
export function useWorkflowPersistence() {
  const workflowStore = useWorkflowStore()

  const showWorkflowList = ref(false)
  const showExportDialog = ref(false)
  const showImportDialog = ref(false)
  const importJson = ref('')
  const importError = ref<string | null>(null)

  const saveStatus = computed(() => {
    if (workflowStore.isSaving) {
      return 'Saving...'
    }
    if (workflowStore.lastSavedAt) {
      return 'Saved'
    }
    if (workflowStore.hasUnsavedChanges) {
      return 'Unsaved changes'
    }
    return 'Saved'
  })

  function handleSave() {
    const success = workflowStore.saveWorkflow()
    if (success) {
      console.log('Workflow saved successfully')
    } else {
      alert('Failed to save workflow')
    }
  }

  function handleLoad() {
    showWorkflowList.value = true
  }

  function handleExport() {
    const json = workflowStore.exportWorkflow()
    showExportDialog.value = true

    // Copy to clipboard
    navigator.clipboard.writeText(json).then(() => {
      console.log('Workflow exported to clipboard')
    }).catch((err) => {
      console.error('Failed to copy to clipboard:', err)
    })
  }

  function handleImport() {
    showImportDialog.value = true
    importJson.value = ''
    importError.value = null
  }

  function confirmImport() {
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
        showImportDialog.value = false
        importJson.value = ''
        importError.value = null
      } else {
        importError.value = 'Failed to import workflow. Please check the JSON format.'
      }
    } catch (error) {
      importError.value = error instanceof Error ? error.message : 'Failed to import workflow. Please check the JSON format.'
    }
  }

  function downloadExport() {
    const json = workflowStore.exportWorkflow()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowStore.name || 'workflow'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  return {
    showWorkflowList,
    showExportDialog,
    showImportDialog,
    importJson,
    importError,
    saveStatus,
    handleSave,
    handleLoad,
    handleExport,
    handleImport,
    confirmImport,
    downloadExport,
    handleFileImport,
  }
}
