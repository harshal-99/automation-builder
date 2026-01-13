<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { PersistenceService, type WorkflowListItem } from '@/utils/persistence'
import { useWorkflowStore } from '@/stores/workflow'
import IconButton from './IconButton.vue'

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
    emit('close')
  } else {
    alert('Failed to load workflow')
  }
}

function handleDeleteWorkflow(workflowId: string, event: Event) {
  event?.stopPropagation()

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

onMounted(() => {
  loadWorkflowList()
  selectedWorkflowId.value = workflowStore.id
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between p-4 border-b border-gray-700">
      <h2 class="text-lg font-semibold text-white">Saved Workflows</h2>
      <IconButton title="Close" @click="emit('close')">×</IconButton>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="isLoading" class="text-center text-gray-400 py-8">
        Loading...
      </div>
      <div v-else-if="!hasWorkflows" class="text-center text-gray-400 py-8">
        <p>No saved workflows yet.</p>
        <p class="text-sm mt-2">Create a workflow and save it to see it here.</p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="workflow in workflows"
          :key="workflow.id"
          class="p-3 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
          :class="{
            'bg-gray-800 border-blue-500': selectedWorkflowId === workflow.id,
            'bg-gray-900': selectedWorkflowId !== workflow.id,
          }"
          @click="handleLoadWorkflow(workflow.id)"
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
              @click="handleDeleteWorkflow(workflow.id, $event)"
            >
              🗑
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
