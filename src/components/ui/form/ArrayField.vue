<script setup lang="ts">
import { computed } from 'vue'
import type { ArrayFieldDef, FormSchema, SelectFieldDef } from '@/schemas/formTypes'

interface Props {
  fieldDef: ArrayFieldDef
  modelValue: unknown[]
  errors?: Record<string, string>
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  errors: () => ({}),
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: unknown[]]
}>()

const items = computed(() => props.modelValue || [])

const canAddMore = computed(() => {
  if (!props.fieldDef.maxItems) return true
  return items.value.length < props.fieldDef.maxItems
})

const canRemove = computed(() => {
  const minItems = props.fieldDef.minItems ?? 0
  return items.value.length > minItems
})

function getDefaultValues(schema: FormSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(schema.fields)) {
    if (field.defaultValue !== undefined) {
      defaults[key] = field.defaultValue
    } else if (field.type === 'select' && (field as SelectFieldDef).options?.length) {
      defaults[key] = (field as SelectFieldDef).options[0].value
    } else if (field.type === 'number') {
      defaults[key] = 0
    } else if (field.type === 'toggle') {
      defaults[key] = false
    } else {
      defaults[key] = ''
    }
  }
  return defaults
}

function addItem() {
  if (!canAddMore.value || props.disabled) return
  const newItem = getDefaultValues(props.fieldDef.itemSchema)
  emit('update:modelValue', [...items.value, newItem])
}

function removeItem(index: number) {
  if (!canRemove.value || props.disabled) return
  const newItems = [...items.value]
  newItems.splice(index, 1)
  emit('update:modelValue', newItems)
}

function updateItem(index: number, key: string, value: unknown) {
  const newItems = [...items.value]
  newItems[index] = {
    ...(newItems[index] as Record<string, unknown>),
    [key]: value,
  }
  emit('update:modelValue', newItems)
}

function isFieldVisible(
  fieldDef: { hidden?: boolean | ((values: Record<string, unknown>) => boolean) },
  values: Record<string, unknown>
): boolean {
  if (typeof fieldDef.hidden === 'function') {
    return !fieldDef.hidden(values)
  }
  return !fieldDef.hidden
}

function getFieldError(index: number, key: string): string | undefined {
  return props.errors?.[`${index}.${key}`]
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <label class="block text-xs font-medium text-gray-300">
        {{ fieldDef.label }}
        <span v-if="fieldDef.required" class="text-red-400">*</span>
      </label>
      <button
        type="button"
        @click="addItem"
        :disabled="!canAddMore || disabled"
        class="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ fieldDef.addLabel || '+ Add Item' }}
      </button>
    </div>

    <div v-if="items.length === 0" class="text-xs text-gray-500 italic py-2">
      No items configured. Click "{{ fieldDef.addLabel || '+ Add Item' }}" to add one.
    </div>

    <div
      v-for="(item, index) in items"
      :key="index"
      class="relative p-3 bg-gray-800/50 rounded border border-gray-700"
    >
      <!-- Remove button -->
      <button
        type="button"
        @click="removeItem(index)"
        :disabled="!canRemove || disabled"
        class="absolute top-2 right-2 text-red-400 hover:text-red-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Remove item"
      >
        &times;
      </button>

      <!-- Nested form fields -->
      <div class="space-y-3 pr-6">
        <template
          v-for="fieldKey in fieldDef.itemSchema.fieldOrder"
          :key="`${index}-${fieldKey}`"
        >
          <div
            v-if="isFieldVisible(fieldDef.itemSchema.fields[fieldKey], item as Record<string, unknown>)"
          >
            <!-- Text, Email, URL, Tel inputs -->
            <div
              v-if="['text', 'email', 'url', 'tel'].includes(fieldDef.itemSchema.fields[fieldKey].type)"
            >
              <label
                :for="`array-${index}-${fieldKey}`"
                class="block text-xs font-medium text-gray-300 mb-1"
              >
                {{ fieldDef.itemSchema.fields[fieldKey].label }}
                <span v-if="fieldDef.itemSchema.fields[fieldKey].required" class="text-red-400">*</span>
              </label>
              <input
                :id="`array-${index}-${fieldKey}`"
                :type="fieldDef.itemSchema.fields[fieldKey].type"
                :value="(item as Record<string, unknown>)[fieldKey]"
                @input="(e) => updateItem(index, fieldKey, (e.target as HTMLInputElement).value)"
                :placeholder="fieldDef.itemSchema.fields[fieldKey].placeholder"
                :disabled="disabled"
                :class="[
                  'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500',
                  fieldDef.itemSchema.fields[fieldKey].type === 'url' && 'font-mono',
                  getFieldError(index, fieldKey) && 'border-red-500',
                  disabled && 'opacity-50 cursor-not-allowed',
                ]"
              />
              <p v-if="getFieldError(index, fieldKey)" class="text-xs text-red-400 mt-1">
                {{ getFieldError(index, fieldKey) }}
              </p>
            </div>

            <!-- Select dropdown -->
            <div v-else-if="fieldDef.itemSchema.fields[fieldKey].type === 'select'">
              <label
                :for="`array-${index}-${fieldKey}`"
                class="block text-xs font-medium text-gray-300 mb-1"
              >
                {{ fieldDef.itemSchema.fields[fieldKey].label }}
                <span v-if="fieldDef.itemSchema.fields[fieldKey].required" class="text-red-400">*</span>
              </label>
              <select
                :id="`array-${index}-${fieldKey}`"
                :value="(item as Record<string, unknown>)[fieldKey]"
                @change="(e) => updateItem(index, fieldKey, (e.target as HTMLSelectElement).value)"
                :disabled="disabled"
                :class="[
                  'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-blue-500',
                  getFieldError(index, fieldKey) && 'border-red-500',
                  disabled && 'opacity-50 cursor-not-allowed',
                ]"
              >
                <option
                  v-for="option in (fieldDef.itemSchema.fields[fieldKey] as SelectFieldDef).options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <p v-if="getFieldError(index, fieldKey)" class="text-xs text-red-400 mt-1">
                {{ getFieldError(index, fieldKey) }}
              </p>
            </div>

            <!-- Number input -->
            <div v-else-if="fieldDef.itemSchema.fields[fieldKey].type === 'number'">
              <label
                :for="`array-${index}-${fieldKey}`"
                class="block text-xs font-medium text-gray-300 mb-1"
              >
                {{ fieldDef.itemSchema.fields[fieldKey].label }}
                <span v-if="fieldDef.itemSchema.fields[fieldKey].required" class="text-red-400">*</span>
              </label>
              <input
                :id="`array-${index}-${fieldKey}`"
                type="number"
                :value="(item as Record<string, unknown>)[fieldKey]"
                @input="(e) => updateItem(index, fieldKey, parseInt((e.target as HTMLInputElement).value) || 0)"
                :placeholder="fieldDef.itemSchema.fields[fieldKey].placeholder"
                :disabled="disabled"
                :class="[
                  'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500',
                  getFieldError(index, fieldKey) && 'border-red-500',
                  disabled && 'opacity-50 cursor-not-allowed',
                ]"
              />
              <p v-if="getFieldError(index, fieldKey)" class="text-xs text-red-400 mt-1">
                {{ getFieldError(index, fieldKey) }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <p v-if="fieldDef.helpText" class="text-xs text-gray-500">
      {{ fieldDef.helpText }}
    </p>
  </div>
</template>
