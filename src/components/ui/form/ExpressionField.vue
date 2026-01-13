<script setup lang="ts">
import { ref } from 'vue'
import type { ExpressionFieldDef } from '@/schemas/formTypes'

interface Props {
  id: string
  fieldDef: ExpressionFieldDef
  modelValue: string
  error?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function insertVariable(variable: string) {
  const currentValue = props.modelValue || ''
  // If there's already content, append with a dot separator
  const newValue = currentValue ? `${currentValue}.${variable}` : variable
  emit('update:modelValue', newValue)
  // Focus back on input
  inputRef.value?.focus()
}
</script>

<template>
  <div>
    <label :for="id" class="block text-xs font-medium text-gray-300 mb-1">
      {{ fieldDef.label }}
      <span v-if="fieldDef.required" class="text-red-400">*</span>
    </label>

    <input
      ref="inputRef"
      :id="id"
      type="text"
      :value="modelValue"
      @input="handleInput"
      :placeholder="fieldDef.placeholder"
      :disabled="disabled"
      :class="[
        'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono',
        error && 'border-red-500',
        disabled && 'opacity-50 cursor-not-allowed',
      ]"
    />

    <!-- Variable pills for quick insertion -->
    <div
      v-if="fieldDef.variables?.length"
      class="flex flex-wrap gap-1 mt-2"
    >
      <button
        v-for="variable in fieldDef.variables"
        :key="variable"
        type="button"
        @click="insertVariable(variable)"
        :disabled="disabled"
        class="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ variable }}
      </button>
    </div>

    <p v-if="fieldDef.helpText" class="text-xs text-gray-500 mt-1">
      {{ fieldDef.helpText }}
    </p>
    <p v-if="error" class="text-xs text-red-400 mt-1">{{ error }}</p>
  </div>
</template>
