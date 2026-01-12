import type { WorkflowNode, WorkflowEdge, ViewportState } from './workflow'

// Types of actions that can be undone/redone
export type HistoryActionType =
  | 'ADD_NODE'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'UPDATE_NODE'
  | 'ADD_EDGE'
  | 'DELETE_EDGE'
  | 'UPDATE_EDGE'
  | 'BATCH'

// Snapshot of workflow state for history
export interface WorkflowSnapshot {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport: ViewportState
}

// History entry
export interface HistoryEntry {
  id: string
  timestamp: string
  actionType: HistoryActionType
  description: string
  snapshot: WorkflowSnapshot
}

// History state
export interface HistoryState {
  entries: HistoryEntry[]
  currentIndex: number
  maxEntries: number
}
