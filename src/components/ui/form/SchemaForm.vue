<script setup lang="ts">
import { computed } from 'vue'
import type {
  FormSchema,
  FieldDef,
  TextFieldDef,
  NumberFieldDef,
  TextareaFieldDef,
  SelectFieldDef,
  ToggleFieldDef,
  HeadersFieldDef,
  ExpressionFieldDef,
  ArrayFieldDef,
} from '@/schemas/formTypes'
import FormField from '../FormField.vue'
import HeadersEditor from '../HeadersEditor.vue'
import ArrayField from './ArrayField.vue'
import ExpressionField from './ExpressionField.vue'
import ToggleField from './ToggleField.vue'

interface Props {
  schema: FormSchema
  modelValue: Record<string, unknown>
  errors?: Record<string, string>
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  errors: () => ({}),
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  validate: [isValid: boolean, errors: Record<string, string>]
}>()

// Ordered fields based on fieldOrder
const orderedFields = computed(() => {
  return props.schema.fieldOrder.map((key) => ({
    key,
    def: props.schema.fields[key],
  }))
})

// Check if a field should be visible
function isFieldVisible(
  fieldDef: FieldDef,
  values: Record<string, unknown>
): boolean {
  if (typeof fieldDef.hidden === 'function') {
    return !fieldDef.hidden(values)
  }
  return !fieldDef.hidden
}

// Update a single field
function updateField(key: string, value: unknown) {
  const newValue = { ...props.modelValue, [key]: value }
  emit('update:modelValue', newValue)
}

// Generate unique field ID
function getFieldId(key: string): string {
  return `schema-form-${key}`
}

// Validate form using Zod schema
function validate(): { isValid: boolean; errors: Record<string, string> } {
  const result = props.schema.zodSchema.safeParse(props.modelValue)

  if (result.success) {
    return { isValid: true, errors: {} }
  }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    errors[path] = issue.message
  }

  return { isValid: false, errors }
}

// Type guards for field definitions
function isTextFieldDef(def: FieldDef): def is TextFieldDef {
  return ['text', 'email', 'url', 'tel'].includes(def.type)
}

function isNumberFieldDef(def: FieldDef): def is NumberFieldDef {
  return def.type === 'number'
}

function isTextareaFieldDef(def: FieldDef): def is TextareaFieldDef {
  return def.type === 'textarea'
}

function isSelectFieldDef(def: FieldDef): def is SelectFieldDef {
  return def.type === 'select'
}

function isToggleFieldDef(def: FieldDef): def is ToggleFieldDef {
  return def.type === 'toggle'
}

function isHeadersFieldDef(def: FieldDef): def is HeadersFieldDef {
  return def.type === 'headers'
}

function isExpressionFieldDef(def: FieldDef): def is ExpressionFieldDef {
  return def.type === 'expression'
}

function isArrayFieldDef(def: FieldDef): def is ArrayFieldDef {
  return def.type === 'array'
}

// Expose validate method
defineExpose({ validate })
</script>

<template>
  <div class="space-y-4">
    <template v-for="{ key, def } in orderedFields" :key="key">
      <div v-if="isFieldVisible(def, modelValue)">
        <!-- Text, Email, URL, Tel fields -->
        <template v-if="isTextFieldDef(def)">
          <FormField
            :id="getFieldId(key)"
            :label="def.label"
            :type="def.type"
            :value="(modelValue[key] as string) ?? def.defaultValue ?? ''"
            :placeholder="def.placeholder"
            :required="def.required"
            :error="errors[key]"
            @update:value="updateField(key, $event)"
          />
          <p v-if="def.helpText && !errors[key]" class="text-xs text-gray-500 -mt-3">
            {{ def.helpText }}
          </p>
        </template>

        <!-- Number field -->
        <template v-else-if="isNumberFieldDef(def)">
          <FormField
            :id="getFieldId(key)"
            :label="def.label"
            type="number"
            :value="(modelValue[key] as number) ?? def.defaultValue ?? ''"
            :placeholder="def.placeholder"
            :required="def.required"
            :min="def.min"
            :error="errors[key]"
            @update:value="updateField(key, $event)"
          />
          <p v-if="def.helpText && !errors[key]" class="text-xs text-gray-500 -mt-3">
            {{ def.helpText }}
          </p>
        </template>

        <!-- Textarea field -->
        <template v-else-if="isTextareaFieldDef(def)">
          <FormField
            :id="getFieldId(key)"
            :label="def.label"
            type="textarea"
            :value="(modelValue[key] as string) ?? ''"
            :placeholder="def.placeholder"
            :required="def.required"
            :rows="def.rows || 4"
            :error="errors[key]"
            @update:value="updateField(key, $event)"
          />
          <p v-if="def.helpText && !errors[key]" class="text-xs text-gray-500 -mt-3">
            {{ def.helpText }}
          </p>
        </template>

        <!-- Select field -->
        <template v-else-if="isSelectFieldDef(def)">
          <FormField
            :id="getFieldId(key)"
            :label="def.label"
            type="select"
            :value="(modelValue[key] as string) ?? def.options?.[0]?.value ?? ''"
            :options="def.options"
            :required="def.required"
            :error="errors[key]"
            @update:value="updateField(key, $event)"
          />
          <p v-if="def.helpText && !errors[key]" class="text-xs text-gray-500 -mt-3">
            {{ def.helpText }}
          </p>
        </template>

        <!-- Toggle field -->
        <ToggleField
          v-else-if="isToggleFieldDef(def)"
          :id="getFieldId(key)"
          :field-def="def"
          :model-value="!!modelValue[key]"
          :error="errors[key]"
          :disabled="disabled"
          @update:model-value="updateField(key, $event)"
        />

        <!-- Headers (key-value) field -->
        <template v-else-if="isHeadersFieldDef(def)">
          <div class="space-y-1">
            <div class="block text-xs font-medium text-gray-300">
              {{ def.label }}
              <span v-if="def.required" class="text-red-400">*</span>
            </div>
            <HeadersEditor
              :headers="(modelValue[key] as Record<string, string>) || {}"
              @update:headers="updateField(key, $event)"
            />
            <p v-if="def.helpText" class="text-xs text-gray-500">
              {{ def.helpText }}
            </p>
          </div>
        </template>

        <!-- Expression builder field -->
        <ExpressionField
          v-else-if="isExpressionFieldDef(def)"
          :id="getFieldId(key)"
          :field-def="def"
          :model-value="(modelValue[key] as string) ?? ''"
          :error="errors[key]"
          :disabled="disabled"
          @update:model-value="updateField(key, $event)"
        />

        <!-- Array field (nested forms) -->
        <ArrayField
          v-else-if="isArrayFieldDef(def)"
          :field-def="def"
          :model-value="(modelValue[key] as unknown[]) || []"
          :errors="errors"
          :disabled="disabled"
          @update:model-value="updateField(key, $event)"
        />
      </div>
    </template>
  </div>
</template>
