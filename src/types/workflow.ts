import type { Node } from '@vue-flow/core'

// Node type categories
export type NodeCategory = 'trigger' | 'action' | 'logic'

// Specific node types
export type NodeType =
  | 'manual-trigger'
  | 'webhook-trigger'
  | 'http-request'
  | 'send-email'
  | 'send-sms'
  | 'delay'
  | 'condition'
  | 'transform'

// Node execution status
export type NodeExecutionStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped'

// Base node data interface
export interface BaseNodeData {
  label: string
  type: NodeType
  category: NodeCategory
  config: Record<string, unknown>
  isValid: boolean
}

// Trigger node data
export interface ManualTriggerData extends BaseNodeData {
  type: 'manual-trigger'
  config: {
    name: string
  }
}

export interface WebhookTriggerData extends BaseNodeData {
  type: 'webhook-trigger'
  config: {
    url: string
    method: 'GET' | 'POST'
    headers?: Record<string, string>
  }
}

// Action node data
export interface HttpRequestData extends BaseNodeData {
  type: 'http-request'
  config: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: Record<string, string>
    body?: string
    timeout?: number
  }
}

export interface SendEmailData extends BaseNodeData {
  type: 'send-email'
  config: {
    to: string
    subject: string
    body: string
    cc?: string
  }
}

export interface SendSmsData extends BaseNodeData {
  type: 'send-sms'
  config: {
    phoneNumber: string
    message: string
  }
}

export interface DelayData extends BaseNodeData {
  type: 'delay'
  config: {
    duration: number
    unit: 'seconds' | 'minutes' | 'hours'
  }
}

// Logic node data
export interface ConditionData extends BaseNodeData {
  type: 'condition'
  config: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: string
  }
}

export interface TransformData extends BaseNodeData {
  type: 'transform'
  config: {
    transformations: Array<{
      field: string
      operation: 'set' | 'delete' | 'rename' | 'uppercase' | 'lowercase'
      value?: string
    }>
  }
}

// Union type for all node data
export type WorkflowNodeData =
  | ManualTriggerData
  | WebhookTriggerData
  | HttpRequestData
  | SendEmailData
  | SendSmsData
  | DelayData
  | ConditionData
  | TransformData

// Workflow node (extends VueFlow Node)
export type WorkflowNode = Node<WorkflowNodeData>

// Edge with optional label for conditional branches
export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  type?: string
  data?: {
    condition?: 'true' | 'false'
  }
}

// Viewport state
export interface ViewportState {
  x: number
  y: number
  zoom: number
}

// Complete workflow state
export interface WorkflowState {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport: ViewportState
  createdAt: string
  updatedAt: string
}

// Node definition for palette
export interface NodeDefinition {
  type: NodeType
  category: NodeCategory
  label: string
  description: string
  icon: string
  defaultConfig: Record<string, unknown>
  inputs: number
  outputs: number | { true: number; false: number }
}
