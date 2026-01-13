<script setup lang="ts">
import type { ToggleFieldDef } from '@/schemas/formTypes'

interface Props {
  id: string
  fieldDef: ToggleFieldDef
  modelValue: boolean
  error?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <label :for="id" class="block text-xs font-medium text-gray-300">
        {{ fieldDef.label }}
        <span v-if="fieldDef.required" class="text-red-400">*</span>
      </label>
      <button
        :id="id"
        type="button"
        role="switch"
        :aria-checked="modelValue"
        @click="toggle"
        :disabled="disabled"
        :class="[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
          modelValue ? 'bg-blue-600' : 'bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
        ]"
      >
        <span
          :class="[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            modelValue ? 'translate-x-5' : 'translate-x-0',
          ]"
        />
      </button>
    </div>
    <div
      v-if="fieldDef.onLabel || fieldDef.offLabel"
      class="mt-1 text-xs text-gray-400"
    >
      {{ modelValue ? fieldDef.onLabel : fieldDef.offLabel }}
    </div>
    <p v-if="fieldDef.helpText" class="text-xs text-gray-500 mt-1">
      {{ fieldDef.helpText }}
    </p>
    <p v-if="error" class="text-xs text-red-400 mt-1">{{ error }}</p>
  </div>
</template>
