<script setup lang="ts">
interface Props {
  id: string
  label: string
  required?: boolean
  type?: 'text' | 'email' | 'url' | 'tel' | 'number' | 'textarea' | 'select'
  value: string | number | undefined
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  rows?: number
  min?: number
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  rows: 4,
  min: undefined,
})

const emit = defineEmits<{
  'update:value': [value: string | number]
}>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  if (props.type === 'number') {
    const numValue = parseInt(target.value) || 0
    emit('update:value', numValue)
  } else {
    emit('update:value', target.value)
  }
}
</script>

<template>
  <div>
    <label :for="id" class="block text-xs font-medium text-gray-300 mb-1">
      {{ label }} <span v-if="required" class="text-red-400">*</span>
    </label>
    <input
      v-if="type !== 'textarea' && type !== 'select'"
      :id="id"
      :type="type"
      :value="value"
      @input="handleInput"
      :placeholder="placeholder"
      :min="min"
      :class="[
        'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500',
        (type === 'url' || placeholder?.includes('data.')) && 'font-mono',
        error && 'border-red-500'
      ]"
    />
    <textarea
      v-else-if="type === 'textarea'"
      :id="id"
      :value="value"
      @input="handleInput"
      :rows="rows"
      :placeholder="placeholder"
      :class="[
        'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500',
        placeholder?.includes('{') && 'font-mono',
        error && 'border-red-500'
      ]"
    ></textarea>
    <select
      v-else-if="type === 'select'"
      :id="id"
      :value="value"
      @change="handleInput"
      :class="[
        'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-blue-500',
        error && 'border-red-500'
      ]"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="text-xs text-red-400 mt-1">{{ error }}</p>
  </div>
</template>
