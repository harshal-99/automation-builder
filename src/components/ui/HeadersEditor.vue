<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  headers: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:headers': [headers: Record<string, string>]
}>()

// Get headers as array for editing (include temporary keys for new headers)
const headersArray = computed(() => {
  return Object.entries(props.headers).map(([key, value]) => ({ key, value: String(value) }))
})

function updateHeader(key: string, value: string, index: number) {
  const headers = { ...props.headers }
  const keys = Object.keys(headers)
  const oldKey = keys[index]
  
  if (oldKey && oldKey !== key) {
    delete headers[oldKey]
  }
  
  if (key && value) {
    headers[key] = value
  } else if (!key || !value) {
    delete headers[key]
  }
  
  emit('update:headers', headers)
}

function removeHeader(key: string) {
  const headers = { ...props.headers }
  delete headers[key]
  emit('update:headers', headers)
}

function addNewHeader() {
  const headers = { ...props.headers }
  const tempKey = `__new_${Date.now()}__`
  headers[tempKey] = ''
  emit('update:headers', headers)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <div class="block text-xs font-medium text-gray-300">
        Headers
      </div>
      <button
        @click="addNewHeader"
        class="text-xs text-blue-400 hover:text-blue-300"
      >
        + Add Header
      </button>
    </div>
    <div v-for="(header, index) in headersArray" :key="index" class="flex gap-2 mb-2">
      <input
        type="text"
        :value="header.key"
        @input="updateHeader(($event.target as HTMLInputElement).value, header.value, index)"
        class="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        placeholder="Header name"
      />
      <input
        type="text"
        :value="header.value"
        @input="updateHeader(header.key, ($event.target as HTMLInputElement).value, index)"
        class="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        placeholder="Header value"
      />
      <button
        @click="removeHeader(header.key)"
        class="px-2 text-red-400 hover:text-red-300"
        title="Remove header"
      >
        ×
      </button>
    </div>
    <div v-if="headersArray.length === 0" class="text-xs text-gray-500 italic">
      No headers configured
    </div>
  </div>
</template>
