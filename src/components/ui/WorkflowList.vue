<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { PersistenceService, type WorkflowListItem } from '@/utils/persistence'
import { useWorkflowStore } from '@/stores/workflow'
import IconButton from './IconButton.vue'
import LoadingSpinner from './LoadingSpinner.vue'

const workflowStore = useWorkflowStore()

const workflows = ref<WorkflowListItem[]>([])
const isLoading = ref(false)
const selectedWorkflowId = ref<string | null>(null)

const hasWorkflows = computed(() => workflows.value.length > 0)

function loadWorkflowList() {
  isLoading.value = true
  try {
    workflows.value = PersistenceService.getWorkflowList()
  } catch (error) {
    console.error('[WorkflowList] Failed to load workflow list:', error)
  } finally {
    isLoading.value = false
  }
}

function handleLoadWorkflow(workflowId: string) {
  if (workflowStore.hasUnsavedChanges) {
    const confirmed = confirm('You have unsaved changes. Do you want to discard them and load this workflow?')
    if (!confirmed) {
      return
    }
  }

  const success = workflowStore.loadWorkflowFromStorage(workflowId)
  if (success) {
    selectedWorkflowId.value = workflowId
    // Close the list after loading
    handleClose()
  } else {
    alert('Failed to load workflow')
  }
}

function handleDeleteWorkflow(workflowId: string) {
  const workflow = workflows.value.find(w => w.id === workflowId)
  const confirmed = confirm(`Are you sure you want to delete "${workflow?.name || 'this workflow'}"?`)

  if (!confirmed) {
    return
  }

  const success = PersistenceService.deleteWorkflow(workflowId)
  if (success) {
    loadWorkflowList()
    if (selectedWorkflowId.value === workflowId) {
      selectedWorkflowId.value = null
    }
  } else {
    alert('Failed to delete workflow')
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const emit = defineEmits<{
  close: []
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)

function handleClose() {
  dialogRef.value?.close()
  emit('close')
}

onMounted(() => {
  loadWorkflowList()
  selectedWorkflowId.value = workflowStore.id
  dialogRef.value?.showModal()
})
</script>

<template>
  <dialog ref="dialogRef" class="flex flex-col h-full" aria-labelledby="workflow-list-title">
    <div class="flex items-center justify-between p-4 border-b border-gray-700">
      <h2 id="workflow-list-title" class="text-lg font-semibold text-white">Saved Workflows</h2>
      <IconButton title="Close" aria-label="Close workflow list" @click="handleClose">×</IconButton>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="isLoading" class="flex justify-center py-8">
        <LoadingSpinner size="md" label="Loading workflows..." />
      </div>
      <output v-else-if="!hasWorkflows" class="text-center text-gray-400 py-8" aria-live="polite">
        <p>No saved workflows yet.</p>
        <p class="text-sm mt-2">Create a workflow and save it to see it here.</p>
      </output>
      <ul v-else class="space-y-2">
        <li
          v-for="workflow in workflows"
          :key="workflow.id"
          :aria-label="`Workflow: ${workflow.name}, ${workflow.nodeCount} nodes, ${workflow.edgeCount} connections`"
          :aria-selected="selectedWorkflowId === workflow.id"
          class="p-3 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
          :class="{
            'bg-gray-800 border-blue-500': selectedWorkflowId === workflow.id,
            'bg-gray-900': selectedWorkflowId !== workflow.id,
          }"
          @click="handleLoadWorkflow(workflow.id)"
          @keydown.enter="handleLoadWorkflow(workflow.id)"
          @keydown.space.prevent="handleLoadWorkflow(workflow.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-white truncate">{{ workflow.name }}</h3>
              <p v-if="workflow.description" class="text-sm text-gray-400 mt-1 line-clamp-2">
                {{ workflow.description }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{{ workflow.nodeCount }} node{{ workflow.nodeCount !== 1 ? 's' : '' }}</span>
                <span>{{ workflow.edgeCount }} connection{{ workflow.edgeCount !== 1 ? 's' : '' }}</span>
                <span>Updated: {{ formatDate(workflow.updatedAt) }}</span>
              </div>
            </div>
            <IconButton
              title="Delete workflow"
              class="ml-2 text-red-400 hover:text-red-300"
              @click.stop="handleDeleteWorkflow(workflow.id)"
            >
              🗑
            </IconButton>
          </div>
        </li>
      </ul>
    </div>
  </dialog>
</template>
