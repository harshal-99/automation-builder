<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue'
import {useWorkflowStore} from '@/stores/workflow'
import {useUIStore} from '@/stores/ui'
import {getNodeDefinition} from '@/utils/nodeDefinitions'
import {getFormSchema} from '@/schemas/formSchemas'
import type {WorkflowNode} from '@/types'
import {SchemaForm} from './form'
import NodeMetadata from './NodeMetadata.vue'
import {WarningIcon} from './icons'

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
const originalFormConfig = ref<Record<string, unknown>>({}) // Track original state for dirty checking
const formErrors = ref<Record<string, string>>({})
const isFormValid = ref(true)
const schemaFormRef = ref<InstanceType<typeof SchemaForm> | null>(null)

// Computed property for error count
const errorCount = computed(() => Object.keys(formErrors.value).length)

// Deep equality check for form configs
function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true
  if (obj1 == null || obj2 == null) return obj1 === obj2
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2

  const keys1 = Object.keys(obj1 as Record<string, unknown>)
  const keys2 = Object.keys(obj2 as Record<string, unknown>)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (!deepEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])) {
      return false
    }
  }

  return true
}

// Check if form is dirty (has unsaved changes)
const isFormDirty = computed(() => {
  if (!selectedNode.value) return false
  return !deepEqual(formConfig.value, originalFormConfig.value)
})

// Save current form state before switching nodes
function saveFormBeforeSwitch(): boolean {
  if (!selectedNode.value || !isFormDirty.value) return true

  // Auto-save if form is valid
  if (isFormValid.value) {
    cancelAutoSave() // Cancel pending debounce
    workflowStore.updateNode(selectedNode.value.id, {
      config: {...formConfig.value},
      isValid: isFormValid.value,
    } as any)
    originalFormConfig.value = structuredClone(formConfig.value)
    return true
  } else {
    // Form has errors, warn user
    const confirmed = window.confirm(
      'You have unsaved changes with validation errors. Do you want to discard them?'
    )
    return confirmed
  }
}

// Initialize form when node changes (watch only node ID to avoid infinite loop)
watch(
    () => selectedNode.value?.id,
    (nodeId, oldNodeId) => {
      // Only initialize if node ID actually changed
      if (nodeId && nodeId !== oldNodeId) {
        // Save current form before switching (if needed)
        if (oldNodeId && !saveFormBeforeSwitch()) {
          // User cancelled, prevent switch by restoring previous selection
          // Note: This is a limitation - we can't easily prevent the selection change
          // The form will be re-initialized with the new node, but we'll show the warning
          return
        }
        initializeFormForNode(nodeId)
      }
    },
    {immediate: true}
)

// Initialize form for a specific node
function initializeFormForNode(nodeId: string | undefined) {
  if (!nodeId) return
  const node = workflowStore.nodes.find((n) => n.id === nodeId)
  if (node?.data?.config) {
    const clonedConfig = structuredClone(node.data.config)
    formConfig.value = clonedConfig
    originalFormConfig.value = structuredClone(clonedConfig) // Store original for dirty checking
    formErrors.value = {}
    isFormValid.value = true
    // Validate after DOM updates
    nextTick(() => {
      validateForm()
    })
  } else {
    formConfig.value = {}
    originalFormConfig.value = {}
    formErrors.value = {}
    isFormValid.value = true
  }
}

// Watch for external changes to node config (e.g., from undo/redo)
watch(
    () => selectedNode.value?.data?.config,
    (newConfig) => {
      // Only update if form is not dirty (to avoid overwriting user's unsaved changes)
      // and if the config actually changed externally
      if (!isFormDirty.value && selectedNode.value?.id) {
        const nodeConfig = newConfig || {}
        const currentConfig = formConfig.value || {}
        
        // Check if config changed externally
        if (!deepEqual(nodeConfig, currentConfig)) {
          initializeFormForNode(selectedNode.value.id)
        }
      }
    },
    {deep: true}
)

// Watch for selection changes and open/close panel accordingly
watch(
    () => workflowStore.selectedNodes.length,
    (count, oldCount) => {
      if (count === 1) {
        uiStore.openConfigPanel()
      } else {
        // Closing panel - save if valid and dirty
        if (oldCount === 1 && isFormDirty.value && selectedNode.value && isFormValid.value) {
          cancelAutoSave() // Cancel pending debounce
          workflowStore.updateNode(selectedNode.value.id, {
            config: {...formConfig.value},
            isValid: isFormValid.value,
          } as any)
          originalFormConfig.value = structuredClone(formConfig.value)
        }
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

// Debounced auto-save with manual timeout management
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedAutoSave(nodeId: string, config: Record<string, unknown>, isValid: boolean) {
  // Clear any pending save
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }

  // Set new timeout
  autoSaveTimeout = setTimeout(() => {
    workflowStore.updateNode(nodeId, {
      config: {...config},
      isValid,
    } as any)
    // Update original config after save to reset dirty state
    originalFormConfig.value = structuredClone(config)
    autoSaveTimeout = null
  }, 500)
}

function cancelAutoSave() {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }
}

// Handle form updates from SchemaForm
function handleFormUpdate(newConfig: Record<string, unknown>) {
  if (!selectedNode.value) return

  formConfig.value = newConfig

  // Validate and update errors in real-time
  const isValid = validateForm()

  // Auto-save with debouncing
  debouncedAutoSave(selectedNode.value.id, newConfig, isValid)
}

// Reset form to original state
function resetForm() {
  if (!selectedNode.value) return

  const confirmed = isFormDirty.value
    ? window.confirm('Are you sure you want to reset all changes?')
    : true

  if (confirmed) {
    formConfig.value = structuredClone(originalFormConfig.value)
    formErrors.value = {}
    isFormValid.value = true

    // Validate after reset
    nextTick(() => {
      validateForm()
    })

    // Update node immediately on reset (no debounce)
    workflowStore.updateNode(selectedNode.value.id, {
      config: {...formConfig.value},
      isValid: isFormValid.value,
    } as any)
  }
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
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-white">
            {{ selectedNode.data.label }}
          </h3>
          <span
              v-if="isFormDirty"
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-300 bg-amber-900/30 border border-amber-700/50 rounded"
              title="Unsaved changes"
          >
            <WarningIcon size="w-3 h-3" />
            Unsaved
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
              v-if="isFormDirty"
              @click="resetForm"
              class="text-gray-400 hover:text-gray-300 text-xs font-medium transition-colors"
              title="Reset changes"
          >
            Reset
          </button>
          <button
              @click="handleDeleteNode"
              class="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
              title="Delete node"
          >
            Delete
          </button>
        </div>
      </div>
      <p class="text-xs text-gray-400">{{ nodeDefinition.description }}</p>
    </div>

    <!-- Validation Status Banner -->
    <div
        v-if="!isFormValid && errorCount > 0"
        class="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300"
    >
      <WarningIcon />
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
