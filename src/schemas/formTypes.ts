import type { ZodSchema } from 'zod'

/**
 * Supported field types for schema-driven forms
 */
export type FieldType =
  | 'text'
  | 'email'
  | 'url'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'toggle'
  | 'headers' // key-value pairs
  | 'expression' // expression builder with variable suggestions
  | 'array' // array of nested objects

/**
 * Base field definition with common properties
 */
export interface BaseFieldDef {
  type: FieldType
  label: string
  placeholder?: string
  required?: boolean
  helpText?: string
  defaultValue?: unknown
  /** Hide field conditionally based on other field values */
  hidden?: boolean | ((values: Record<string, unknown>) => boolean)
}

/**
 * Text-based field (text, email, url, tel)
 */
export interface TextFieldDef extends BaseFieldDef {
  type: 'text' | 'email' | 'url' | 'tel'
  minLength?: number
  maxLength?: number
  pattern?: string
}

/**
 * Number input field
 */
export interface NumberFieldDef extends BaseFieldDef {
  type: 'number'
  min?: number
  max?: number
  step?: number
}

/**
 * Multi-line text area field
 */
export interface TextareaFieldDef extends BaseFieldDef {
  type: 'textarea'
  rows?: number
  monospace?: boolean
}

/**
 * Dropdown select field
 */
export interface SelectFieldDef extends BaseFieldDef {
  type: 'select'
  options: Array<{ value: string; label: string }>
}

/**
 * Toggle/checkbox field
 */
export interface ToggleFieldDef extends BaseFieldDef {
  type: 'toggle'
  onLabel?: string
  offLabel?: string
}

/**
 * Key-value pairs field (for HTTP headers)
 */
export interface HeadersFieldDef extends BaseFieldDef {
  type: 'headers'
  keyPlaceholder?: string
  valuePlaceholder?: string
}

/**
 * Expression builder field with variable suggestions
 */
export interface ExpressionFieldDef extends BaseFieldDef {
  type: 'expression'
  variables?: string[] // Available variables for autocomplete/pills
}

/**
 * Array field for nested form items
 */
export interface ArrayFieldDef extends BaseFieldDef {
  type: 'array'
  itemSchema: FormSchema // Nested form schema for each item
  minItems?: number
  maxItems?: number
  addLabel?: string
}

/**
 * Union of all field definition types
 */
export type FieldDef =
  | TextFieldDef
  | NumberFieldDef
  | TextareaFieldDef
  | SelectFieldDef
  | ToggleFieldDef
  | HeadersFieldDef
  | ExpressionFieldDef
  | ArrayFieldDef

/**
 * Form schema combining Zod validation with UI metadata
 */
export interface FormSchema {
  /** Zod schema for validation */
  zodSchema: ZodSchema
  /** Field definitions with UI metadata */
  fields: Record<string, FieldDef>
  /** Explicit field ordering for display */
  fieldOrder: string[]
}

/**
 * Registry mapping node types to their form schemas
 */
export type NodeFormSchemaRegistry = Record<string, FormSchema>
