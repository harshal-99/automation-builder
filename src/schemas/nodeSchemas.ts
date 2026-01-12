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
