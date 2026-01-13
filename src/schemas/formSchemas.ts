import type { FormSchema, NodeFormSchemaRegistry } from './formTypes'
import {
  manualTriggerSchema,
  webhookTriggerSchema,
  httpRequestSchema,
  sendEmailSchema,
  sendSmsSchema,
  delaySchema,
  conditionSchema,
  transformSchema,
} from './nodeSchemas'
import { z } from 'zod'

/**
 * Manual Trigger Form Schema
 * Simple form with just a name field
 */
export const manualTriggerFormSchema: FormSchema = {
  zodSchema: manualTriggerSchema,
  fields: {
    name: {
      type: 'text',
      label: 'Trigger Name',
      placeholder: 'Enter trigger name',
      required: true,
      helpText: 'A descriptive name for this manual trigger',
    },
  },
  fieldOrder: ['name'],
}

/**
 * Webhook Trigger Form Schema
 * URL, HTTP method, and optional headers
 */
export const webhookTriggerFormSchema: FormSchema = {
  zodSchema: webhookTriggerSchema,
  fields: {
    url: {
      type: 'url',
      label: 'Webhook URL',
      placeholder: 'https://example.com/webhook',
      required: true,
      helpText: 'The URL that will receive webhook requests',
    },
    method: {
      type: 'select',
      label: 'HTTP Method',
      required: true,
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
      ],
    },
    headers: {
      type: 'headers',
      label: 'Headers',
      keyPlaceholder: 'Header name',
      valuePlaceholder: 'Header value',
      helpText: 'Optional HTTP headers to include',
    },
  },
  fieldOrder: ['url', 'method', 'headers'],
}

/**
 * HTTP Request Form Schema
 * Full HTTP request configuration with conditional body field
 */
export const httpRequestFormSchema: FormSchema = {
  zodSchema: httpRequestSchema,
  fields: {
    url: {
      type: 'url',
      label: 'Request URL',
      placeholder: 'https://api.example.com/endpoint',
      required: true,
    },
    method: {
      type: 'select',
      label: 'Method',
      required: true,
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
      ],
    },
    headers: {
      type: 'headers',
      label: 'Headers',
      keyPlaceholder: 'Header name',
      valuePlaceholder: 'Header value',
    },
    body: {
      type: 'textarea',
      label: 'Request Body',
      placeholder: '{"key": "value"}',
      rows: 4,
      monospace: true,
      // Hide body field for GET requests
      hidden: (values) => values.method === 'GET',
    },
    timeout: {
      type: 'number',
      label: 'Timeout (ms)',
      placeholder: '30000',
      min: 1,
      max: 300000,
      helpText: 'Request timeout in milliseconds',
    },
  },
  fieldOrder: ['url', 'method', 'headers', 'body', 'timeout'],
}

/**
 * Send Email Form Schema
 * Email recipient, subject, body, and optional CC
 */
export const sendEmailFormSchema: FormSchema = {
  zodSchema: sendEmailSchema,
  fields: {
    to: {
      type: 'email',
      label: 'To',
      placeholder: 'recipient@example.com',
      required: true,
    },
    cc: {
      type: 'email',
      label: 'CC',
      placeholder: 'cc@example.com',
      helpText: 'Optional carbon copy recipient',
    },
    subject: {
      type: 'text',
      label: 'Subject',
      placeholder: 'Email subject',
      required: true,
    },
    body: {
      type: 'textarea',
      label: 'Body',
      placeholder: 'Email body content...',
      rows: 6,
      required: true,
    },
  },
  fieldOrder: ['to', 'cc', 'subject', 'body'],
}

/**
 * Send SMS Form Schema
 * Phone number and message
 */
export const sendSmsFormSchema: FormSchema = {
  zodSchema: sendSmsSchema,
  fields: {
    phoneNumber: {
      type: 'tel',
      label: 'Phone Number',
      placeholder: '+1234567890',
      required: true,
    },
    message: {
      type: 'textarea',
      label: 'Message',
      placeholder: 'SMS message content...',
      rows: 3,
      required: true,
    },
  },
  fieldOrder: ['phoneNumber', 'message'],
}

/**
 * Delay Form Schema
 * Duration and time unit
 */
export const delayFormSchema: FormSchema = {
  zodSchema: delaySchema,
  fields: {
    duration: {
      type: 'number',
      label: 'Duration',
      required: true,
      min: 1,
      defaultValue: 1,
    },
    unit: {
      type: 'select',
      label: 'Unit',
      required: true,
      options: [
        { value: 'seconds', label: 'Seconds' },
        { value: 'minutes', label: 'Minutes' },
        { value: 'hours', label: 'Hours' },
      ],
    },
  },
  fieldOrder: ['duration', 'unit'],
}

/**
 * Condition Form Schema
 * Expression, operator, and comparison value
 */
export const conditionFormSchema: FormSchema = {
  zodSchema: conditionSchema,
  fields: {
    expression: {
      type: 'expression',
      label: 'Expression',
      placeholder: 'data.field',
      required: true,
      helpText: 'The data field or expression to evaluate',
      variables: ['data', 'input', 'env'],
    },
    operator: {
      type: 'select',
      label: 'Operator',
      required: true,
      options: [
        { value: 'equals', label: 'Equals (==)' },
        { value: 'not_equals', label: 'Not Equals (!=)' },
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Not Contains' },
        { value: 'greater_than', label: 'Greater Than (>)' },
        { value: 'less_than', label: 'Less Than (<)' },
        { value: 'greater_than_or_equal', label: 'Greater Or Equal (>=)' },
        { value: 'less_than_or_equal', label: 'Less Or Equal (<=)' },
        { value: 'starts_with', label: 'Starts With' },
        { value: 'ends_with', label: 'Ends With' },
        { value: 'is_empty', label: 'Is Empty' },
        { value: 'is_not_empty', label: 'Is Not Empty' },
      ],
    },
    value: {
      type: 'text',
      label: 'Value',
      placeholder: 'Comparison value',
      helpText: 'The value to compare against',
      // Hide value field for is_empty and is_not_empty operators
      hidden: (values) =>
        values.operator === 'is_empty' || values.operator === 'is_not_empty',
    },
  },
  fieldOrder: ['expression', 'operator', 'value'],
}

// Transformation item schema for array field
const transformationItemSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  operation: z.union([
    z.enum([
      'set',
      'delete',
      'rename',
      'uppercase',
      'lowercase',
      'trim',
      'concat',
      'split',
      'replace',
      'increment',
      'decrement',
      'multiply',
      'divide',
    ]),
    z.string().min(1, 'Operation is required'),
  ]),
  value: z.any().optional(),
})

/**
 * Transform Form Schema
 * Array of transformations with nested field/operation/value
 */
export const transformFormSchema: FormSchema = {
  zodSchema: transformSchema,
  fields: {
    transformations: {
      type: 'array',
      label: 'Transformations',
      addLabel: '+ Add Transformation',
      minItems: 0,
      itemSchema: {
        zodSchema: transformationItemSchema,
        fields: {
          field: {
            type: 'text',
            label: 'Field',
            placeholder: 'data.fieldName',
            required: true,
          },
          operation: {
            type: 'select',
            label: 'Operation',
            required: true,
            options: [
              { value: 'set', label: 'Set Value' },
              { value: 'delete', label: 'Delete' },
              { value: 'rename', label: 'Rename' },
              { value: 'uppercase', label: 'Uppercase' },
              { value: 'lowercase', label: 'Lowercase' },
              { value: 'trim', label: 'Trim' },
              { value: 'concat', label: 'Concatenate' },
              { value: 'split', label: 'Split' },
              { value: 'replace', label: 'Replace' },
              { value: 'increment', label: 'Increment' },
              { value: 'decrement', label: 'Decrement' },
              { value: 'multiply', label: 'Multiply' },
              { value: 'divide', label: 'Divide' },
            ],
          },
          value: {
            type: 'text',
            label: 'Value',
            placeholder: 'Value or expression',
            // Hide value for operations that don't need it
            hidden: (values) =>
              ['delete', 'uppercase', 'lowercase', 'trim'].includes(
                values.operation as string
              ),
          },
        },
        fieldOrder: ['field', 'operation', 'value'],
      },
    },
  },
  fieldOrder: ['transformations'],
}

/**
 * Registry mapping node types to their form schemas
 */
export const nodeFormSchemas: NodeFormSchemaRegistry = {
  'manual-trigger': manualTriggerFormSchema,
  'webhook-trigger': webhookTriggerFormSchema,
  'http-request': httpRequestFormSchema,
  'send-email': sendEmailFormSchema,
  'send-sms': sendSmsFormSchema,
  delay: delayFormSchema,
  condition: conditionFormSchema,
  transform: transformFormSchema,
}

/**
 * Get form schema for a node type
 * @param nodeType The node type identifier
 * @returns The form schema or null if not found
 */
export function getFormSchema(nodeType: string): FormSchema | null {
  return nodeFormSchemas[nodeType] ?? null
}
