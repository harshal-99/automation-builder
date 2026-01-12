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
  to: z.email('Must be a valid email address').min(1, 'Recipient email is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  cc: z.email('Must be a valid email address').optional().or(z.literal('')),
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
