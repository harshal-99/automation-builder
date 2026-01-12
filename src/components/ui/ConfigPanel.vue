<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useWorkflowStore } from '@/stores/workflow'
import { useUIStore } from '@/stores/ui'
import { getNodeDefinition } from '@/utils/nodeDefinitions'
import type { WorkflowNode } from '@/types'
import FormField from './FormField.vue'
import HeadersEditor from './HeadersEditor.vue'
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

// Local form state - create a reactive copy of the config
const formConfig = ref<Record<string, any>>({})
const formErrors = ref<Record<string, string>>({})

// Initialize form when node changes
watch(
  selectedNode,
  (node) => {
    if (node?.data?.config) {
      formConfig.value = JSON.parse(JSON.stringify(node.data.config))
      formErrors.value = {}
    }
  },
  { immediate: true, deep: true }
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
  { immediate: true }
)

// Handle node deletion
function handleDeleteNode() {
  if (selectedNode.value) {
    workflowStore.deleteNodes([selectedNode.value.id])
    uiStore.closeConfigPanel()
  }
}

// Update config field
function updateConfigField(key: string, value: any) {
  if (!selectedNode.value) return

  formConfig.value[key] = value
  delete formErrors.value[key]

  // Update node config in store
  workflowStore.updateNode(selectedNode.value.id, {
    config: { ...formConfig.value },
  } as any)
}

// Update headers
function updateHeaders(headers: Record<string, string>) {
  if (!selectedNode.value) return
  formConfig.value.headers = headers
  workflowStore.updateNode(selectedNode.value.id, {
    config: { ...formConfig.value },
  } as any)
}

// Generate unique field ID
function getFieldId(fieldName: string): string {
  return selectedNode.value ? `config-${selectedNode.value.id}-${fieldName}` : `config-${fieldName}`
}

// Select options
const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
]

const httpMethodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
]

const unitOptions = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
]

const operatorOptions = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_than_or_equal', label: 'Greater Than Or Equal' },
  { value: 'less_than_or_equal', label: 'Less Than Or Equal' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
]
</script>

<template>
  <div v-if="selectedNode?.data?.label && nodeDefinition" class="p-4 space-y-4 overflow-y-auto max-h-full">
    <!-- Node Header -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-white">{{ selectedNode.data.label }}</h3>
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

    <!-- Configuration Form -->
    <div class="pt-2 border-t border-gray-700 space-y-4">
      <div class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
        Configuration
      </div>

      <!-- Manual Trigger -->
      <template v-if="selectedNode.data.type === 'manual-trigger'">
        <FormField
          :id="getFieldId('name')"
          label="Name"
          type="text"
          :value="formConfig.name || ''"
          placeholder="Enter trigger name"
          required
          :error="formErrors.name"
          @update:value="updateConfigField('name', $event)"
        />
      </template>

      <!-- Webhook Trigger -->
      <template v-if="selectedNode.data.type === 'webhook-trigger'">
        <FormField
          :id="getFieldId('url')"
          label="URL"
          type="url"
          :value="formConfig.url || ''"
          placeholder="https://example.com/webhook"
          required
          @update:value="updateConfigField('url', $event)"
        />
        <FormField
          :id="getFieldId('method')"
          label="Method"
          type="select"
          :value="formConfig.method || 'POST'"
          :options="httpMethodOptions"
          required
          @update:value="updateConfigField('method', $event)"
        />
        <HeadersEditor
          :headers="formConfig.headers || {}"
          @update:headers="updateHeaders"
        />
      </template>

      <!-- HTTP Request -->
      <template v-if="selectedNode.data.type === 'http-request'">
        <FormField
          :id="getFieldId('url')"
          label="URL"
          type="url"
          :value="formConfig.url || ''"
          placeholder="https://api.example.com/endpoint"
          required
          @update:value="updateConfigField('url', $event)"
        />
        <FormField
          :id="getFieldId('method')"
          label="Method"
          type="select"
          :value="formConfig.method || 'GET'"
          :options="methodOptions"
          required
          @update:value="updateConfigField('method', $event)"
        />
        <HeadersEditor
          :headers="formConfig.headers || {}"
          @update:headers="updateHeaders"
        />
        <FormField
          :id="getFieldId('body')"
          label="Body"
          type="textarea"
          :value="formConfig.body || ''"
          placeholder='{"key": "value"}'
          @update:value="updateConfigField('body', $event)"
        />
        <FormField
          :id="getFieldId('timeout')"
          label="Timeout (ms)"
          type="number"
          :value="formConfig.timeout || 30000"
          placeholder="30000"
          :min="1"
          @update:value="updateConfigField('timeout', $event)"
        />
      </template>

      <!-- Send Email -->
      <template v-if="selectedNode.data.type === 'send-email'">
        <FormField
          :id="getFieldId('to')"
          label="To"
          type="email"
          :value="formConfig.to || ''"
          placeholder="recipient@example.com"
          required
          @update:value="updateConfigField('to', $event)"
        />
        <FormField
          :id="getFieldId('subject')"
          label="Subject"
          type="text"
          :value="formConfig.subject || ''"
          placeholder="Email subject"
          required
          @update:value="updateConfigField('subject', $event)"
        />
        <FormField
          :id="getFieldId('body-email')"
          label="Body"
          type="textarea"
          :value="formConfig.body || ''"
          placeholder="Email body content"
          required
          @update:value="updateConfigField('body', $event)"
        />
        <FormField
          :id="getFieldId('cc')"
          label="CC"
          type="email"
          :value="formConfig.cc || ''"
          placeholder="cc@example.com"
          @update:value="updateConfigField('cc', $event)"
        />
      </template>

      <!-- Send SMS -->
      <template v-if="selectedNode.data.type === 'send-sms'">
        <FormField
          :id="getFieldId('phoneNumber')"
          label="Phone Number"
          type="tel"
          :value="formConfig.phoneNumber || ''"
          placeholder="+1234567890"
          required
          @update:value="updateConfigField('phoneNumber', $event)"
        />
        <FormField
          :id="getFieldId('message')"
          label="Message"
          type="textarea"
          :value="formConfig.message || ''"
          placeholder="SMS message content"
          required
          @update:value="updateConfigField('message', $event)"
        />
      </template>

      <!-- Delay -->
      <template v-if="selectedNode.data.type === 'delay'">
        <FormField
          :id="getFieldId('duration')"
          label="Duration"
          type="number"
          :value="formConfig.duration || 1"
          placeholder="1"
          :min="1"
          required
          @update:value="updateConfigField('duration', $event)"
        />
        <FormField
          :id="getFieldId('unit')"
          label="Unit"
          type="select"
          :value="formConfig.unit || 'minutes'"
          :options="unitOptions"
          required
          @update:value="updateConfigField('unit', $event)"
        />
      </template>

      <!-- Condition -->
      <template v-if="selectedNode.data.type === 'condition'">
        <FormField
          :id="getFieldId('expression')"
          label="Expression"
          type="text"
          :value="formConfig.expression || ''"
          placeholder="data.field"
          required
          @update:value="updateConfigField('expression', $event)"
        />
        <FormField
          :id="getFieldId('operator')"
          label="Operator"
          type="select"
          :value="formConfig.operator || 'equals'"
          :options="operatorOptions"
          required
          @update:value="updateConfigField('operator', $event)"
        />
        <FormField
          :id="getFieldId('value')"
          label="Value"
          type="text"
          :value="formConfig.value !== undefined ? String(formConfig.value) : ''"
          placeholder="Comparison value"
          @update:value="updateConfigField('value', $event)"
        />
      </template>

      <!-- Transform -->
      <template v-if="selectedNode.data.type === 'transform'">
        <div>
          <div class="block text-xs font-medium text-gray-300 mb-2">
            Transformations
          </div>
          <div class="text-xs text-gray-500 italic mb-2">
            Transform configuration will be available in a future update
          </div>
          <div class="bg-gray-900 rounded p-3 text-xs font-mono text-gray-400 overflow-auto max-h-32">
            <pre>{{ JSON.stringify(formConfig.transformations || [], null, 2) }}</pre>
          </div>
        </div>
      </template>
    </div>

    <!-- Node Metadata -->
    <NodeMetadata v-if="selectedNode" :node="selectedNode" />
  </div>

  <div v-else class="p-4">
    <p class="text-xs text-gray-500">Select a node to configure</p>
  </div>
</template>
