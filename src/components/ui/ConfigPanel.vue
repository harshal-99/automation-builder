<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue'
import {useWorkflowStore} from '@/stores/workflow'
import {useUIStore} from '@/stores/ui'
import {getNodeDefinition} from '@/utils/nodeDefinitions'
import {getFormSchema} from '@/schemas/formSchemas'
import type {WorkflowNode} from '@/types'
import {SchemaForm} from './form'
import NodeMetadata from './NodeMetadata.vue'

const workflowStore = useWorkflowStore()
const uiStore = useUIStore()

// Get the selected node (only show panel if exactly one node is selected)
const selectedNode = computed<WorkflowNode | null>(() => {
  if (workflowStore.selectedNodes.length === 1) {
    return workflowStore.selectedNodes[0]
  }
  return null
})

// Get node definition for metadata
const nodeDefinition = computed(() => {
  if (!selectedNode?.value?.data) return null
  return getNodeDefinition(selectedNode.value.data.type)
})

// Get the form schema for current node type
const formSchema = computed(() => {
  if (!selectedNode?.value?.data?.type) return null
  return getFormSchema(selectedNode.value.data.type)
})

// Local form state - create a reactive copy of the config
const formConfig = ref<Record<string, unknown>>({})
const formErrors = ref<Record<string, string>>({})
const isFormValid = ref(true)
const schemaFormRef = ref<InstanceType<typeof SchemaForm> | null>(null)

// Computed property for error count
const errorCount = computed(() => Object.keys(formErrors.value).length)

// Initialize form when node changes (watch only node ID to avoid infinite loop)
watch(
    () => selectedNode.value?.id,
    (nodeId, oldNodeId) => {
      // Only initialize if node ID actually changed
      if (nodeId && nodeId !== oldNodeId) {
        const node = selectedNode.value
        if (node?.data?.config) {
          formConfig.value = structuredClone(node.data.config)
          formErrors.value = {}
          isFormValid.value = true
          // Validate after DOM updates
          nextTick(() => {
            validateForm()
          })
        }
      }
    },
    {immediate: true}
)

// Watch for selection changes and open/close panel accordingly
watch(
    () => workflowStore.selectedNodes.length,
    (count) => {
      if (count === 1) {
        uiStore.openConfigPanel()
      } else {
        uiStore.closeConfigPanel()
      }
    },
    {immediate: true}
)

// Validate form and update node's isValid property
function validateForm(): boolean {
  if (!schemaFormRef.value || !selectedNode.value) {
    return true
  }

  const {isValid, errors} = schemaFormRef.value.validate()
  formErrors.value = errors
  isFormValid.value = isValid

  // Update node's isValid property in store
  workflowStore.updateNode(selectedNode.value.id, {
    isValid,
  } as any)

  return isValid
}

// Handle node deletion
function handleDeleteNode() {
  if (selectedNode.value) {
    workflowStore.deleteNodes([selectedNode.value.id])
    uiStore.closeConfigPanel()
  }
}

// Handle form updates from SchemaForm
function handleFormUpdate(newConfig: Record<string, unknown>) {
  if (!selectedNode.value) return

  formConfig.value = newConfig

  // Validate and update errors in real-time
  const isValid = validateForm()

  // Update node config and validation state in store
  workflowStore.updateNode(selectedNode.value.id, {
    config: {...newConfig},
    isValid,
  } as any)
}
</script>

<template>
  <div
      v-if="selectedNode?.data?.label && nodeDefinition"
      class="p-4 space-y-4 overflow-y-auto max-h-full"
  >
    <!-- Node Header -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-white">
          {{ selectedNode.data.label }}
        </h3>
        <button
            @click="handleDeleteNode"
            class="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
            title="Delete node"
        >
          Delete
        </button>
      </div>
      <p class="text-xs text-gray-400">{{ nodeDefinition.description }}</p>
    </div>

    <!-- Validation Status Banner -->
    <div
        v-if="!isFormValid && errorCount > 0"
        class="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300"
    >
      <svg
          class="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
      >
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>{{ errorCount }} validation {{ errorCount === 1 ? 'error' : 'errors' }}</span>
    </div>

    <!-- Schema-Driven Configuration Form -->
    <div class="pt-2 border-t border-gray-700 space-y-4">
      <div
          class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3"
      >
        Configuration
      </div>

      <SchemaForm
          v-if="formSchema"
          ref="schemaFormRef"
          :schema="formSchema"
          :model-value="formConfig"
          :errors="formErrors"
          @update:model-value="handleFormUpdate"
      />

      <!-- Fallback for unknown node types -->
      <div v-else class="text-xs text-gray-500 italic">
        No configuration schema available for this node type.
      </div>
    </div>

    <!-- Node Metadata -->
    <NodeMetadata v-if="selectedNode" :node="selectedNode"/>
  </div>

  <div v-else class="p-4">
    <p class="text-xs text-gray-500">Select a node to configure</p>
  </div>
</template>
