import { z } from 'zod'

/**
 * Manual Trigger Node Schema
 * Schema: { name: string }
 * Single output port
 */
export const manualTriggerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export type ManualTriggerConfig = z.infer<typeof manualTriggerSchema>

/**
 * Webhook Trigger Node Schema
 * Schema: { url: string, method: 'GET'|'POST', headers?: Record<string, string> }
 * Single output port
 */
export const webhookTriggerSchema = z.object({
  url: z.url('Must be a valid URL').min(1, 'URL is required'),
  method: z.enum(['GET', 'POST']),
  headers: z.record(z.string(), z.string()).optional(),
})

export type WebhookTriggerConfig = z.infer<typeof webhookTriggerSchema>

/**
 * HTTP Request Node Schema
 * Schema: { url: string, method: string, headers?: object, body?: string, timeout?: number }
 * Input port, output port, error port
 */
export const httpRequestSchema = z.object({
  url: z.url('Must be a valid URL').min(1, 'URL is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().int().positive().optional(),
})

export type HttpRequestConfig = z.infer<typeof httpRequestSchema>

/**
 * Send Email Node Schema
 * Schema: { to: string, subject: string, body: string, cc?: string }
 * Input port, success/error outputs
 */
export const sendEmailSchema = z.object({
  to: z.string().min(1, 'Recipient email is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  cc: z.string().optional().or(z.literal('')),
})

export type SendEmailConfig = z.infer<typeof sendEmailSchema>

/**
 * Send SMS Node Schema
 * Schema: { phoneNumber: string, message: string }
 * Input port, success/error outputs
 */
export const sendSmsSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
  message: z.string().min(1, 'Message is required'),
})

export type SendSmsConfig = z.infer<typeof sendSmsSchema>

/**
 * Delay Node Schema
 * Schema: { duration: number, unit: 'seconds'|'minutes'|'hours' }
 * Input port, output port
 */
export const delaySchema = z.object({
  duration: z.number().int().positive('Duration must be a positive number'),
  unit: z.enum(['seconds', 'minutes', 'hours']),
})

export type DelayConfig = z.infer<typeof delaySchema>

/**
 * Condition Node Schema
 * Schema: { expression: string, operator: string, value: any }
 * Input port, true/false output ports (labeled)
 */
export const conditionSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
  operator: z.union([
    z.enum([
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'greater_than',
      'less_than',
      'greater_than_or_equal',
      'less_than_or_equal',
      'starts_with',
      'ends_with',
      'is_empty',
      'is_not_empty',
    ]),
    z.string().min(1, 'Operator is required'), // Allow custom operators
  ]),
  value: z.any(), // value can be any type (string, number, boolean, etc.)
})

export type ConditionConfig = z.infer<typeof conditionSchema>

/**
 * Transform Node Schema
 * Schema: { transformations: Array<{ field: string, operation: string, value: any }> }
 * Input port, output port
 */
export const transformSchema = z.object({
  transformations: z.array(
    z.object({
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
        z.string().min(1, 'Operation is required'), // Allow custom operations
      ]),
      value: z.any().optional(), // value is optional and can be any type
    })
  ),
})

export type TransformConfig = z.infer<typeof transformSchema>
