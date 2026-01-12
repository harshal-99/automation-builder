import type { NodeExecutionStatus } from './workflow'

// Execution state
export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error'

// Log entry for execution
export interface ExecutionLog {
  id: string
  timestamp: string
  nodeId: string
  nodeName: string
  status: NodeExecutionStatus
  message: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  duration?: number
}

// Per-node execution state
export interface NodeExecutionState {
  status: NodeExecutionStatus
  startedAt?: string
  completedAt?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
}

// Complete execution state
export interface ExecutionState {
  status: ExecutionStatus
  currentNodeId: string | null
  nodeStates: Record<string, NodeExecutionState>
  logs: ExecutionLog[]
  executionData: Record<string, unknown>
  startedAt?: string
  completedAt?: string
}
