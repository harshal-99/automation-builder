import { z } from 'zod'
import type { NodeType, NodeCategory } from '@/types/workflow'

/**
 * Schema for ViewportState
 */
export const viewportStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
})

/**
 * Schema for WorkflowEdge
 */
export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  type: z.string().optional(),
  data: z.object({
    condition: z.enum(['true', 'false']).optional(),
  }).optional(),
})

/**
 * Schema for BaseNodeData (common fields)
 */
const baseNodeDataSchema = z.object({
  label: z.string(),
  type: z.enum([
    'manual-trigger',
    'webhook-trigger',
    'http-request',
    'send-email',
    'send-sms',
    'delay',
    'condition',
    'transform',
  ]) as z.ZodType<NodeType>,
  category: z.enum(['trigger', 'action', 'logic']) as z.ZodType<NodeCategory>,
  config: z.any(),
  isValid: z.boolean(),
})

/**
 * Schema for WorkflowNode (VueFlow Node with WorkflowNodeData)
 */
export const workflowNodeSchema = z.looseObject({
  id: z.string(),
  type: z.string().optional(), // VueFlow node type
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: baseNodeDataSchema,
  selected: z.boolean().optional(),
  dragging: z.boolean().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  // Allow other VueFlow node properties
})

/**
 * Schema for complete WorkflowState
 */
export const workflowStateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  viewport: viewportStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type WorkflowStateSchema = z.infer<typeof workflowStateSchema>
