import type { WorkflowState } from '@/types'
import { workflowStateSchema } from '@/schemas/workflowSchemas'

const STORAGE_KEY_PREFIX = 'automation-builder:workflow:'
const WORKFLOW_LIST_KEY = 'automation-builder:workflow-list'

export interface WorkflowMetadata {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowListItem extends WorkflowMetadata {
  nodeCount: number
  edgeCount: number
}

/**
 * Persistence service for managing workflow storage in LocalStorage
 */
export class PersistenceService {
  /**
   * Save a workflow to LocalStorage
   */
  static saveWorkflow(workflow: WorkflowState): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${workflow.id}`
      localStorage.setItem(key, JSON.stringify(workflow))

      // Update workflow list
      this.updateWorkflowList(workflow)
    } catch (error) {
      console.error('[PersistenceService] Failed to save workflow:', error)
      throw new Error('Failed to save workflow to storage')
    }
  }

  /**
   * Load a workflow from LocalStorage by ID
   */
  static loadWorkflow(id: string): WorkflowState | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${id}`
      const data = localStorage.getItem(key)

      if (!data) {
        return null
      }

      const parsed = JSON.parse(data)

      // Validate workflow structure using Zod
      const result = workflowStateSchema.safeParse(parsed)

      if (!result.success) {
        console.error('[PersistenceService] Invalid workflow structure:', result.error)
        console.error('[PersistenceService] Validation errors:', result.error.errors)
        return null
      }

      return result.data
    } catch (error) {
      console.error('[PersistenceService] Failed to load workflow:', error)
      return null
    }
  }

  /**
   * Delete a workflow from LocalStorage
   */
  static deleteWorkflow(id: string): boolean {
    try {
      const key = `${STORAGE_KEY_PREFIX}${id}`
      localStorage.removeItem(key)

      // Update workflow list
      this.removeFromWorkflowList(id)

      return true
    } catch (error) {
      console.error('[PersistenceService] Failed to delete workflow:', error)
      return false
    }
  }

  /**
   * Get list of all saved workflows
   */
  static getWorkflowList(): WorkflowListItem[] {
    try {
      const data = localStorage.getItem(WORKFLOW_LIST_KEY)
      if (!data) {
        return []
      }

      const list = JSON.parse(data) as WorkflowMetadata[]

      // Load full workflow data to get node/edge counts
      return list
        .map((metadata) => {
          const workflow = this.loadWorkflow(metadata.id)
          if (!workflow) {
            return null
          }

          return {
            ...metadata,
            nodeCount: workflow.nodes.length,
            edgeCount: workflow.edges.length,
          }
        })
        .filter((item): item is WorkflowListItem => item !== null)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } catch (error) {
      console.error('[PersistenceService] Failed to get workflow list:', error)
      return []
    }
  }

  /**
   * Export workflow as JSON string
   */
  static exportWorkflow(workflow: WorkflowState): string {
    return JSON.stringify(workflow, null, 2)
  }

  /**
   * Import workflow from JSON string
   */
  static importWorkflow(json: string): WorkflowState | null {
    try {
      const parsed = JSON.parse(json)

      // Validate workflow structure using Zod
      const result = workflowStateSchema.safeParse(parsed)

      if (!result.success) {
        console.error('[PersistenceService] Invalid workflow structure:', result.error)
        console.error('[PersistenceService] Validation errors:', result.error.errors)
        throw new Error(`Invalid workflow structure: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`)
      }

      const workflow = result.data

      // Generate new ID and timestamps for imported workflow
      const imported: WorkflowState = {
        ...workflow,
        id: workflow.id || crypto.randomUUID(),
        createdAt: workflow.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      return imported
    } catch (error) {
      console.error('[PersistenceService] Failed to import workflow:', error)
      if (error instanceof Error) {
        throw error
      }
      return null
    }
  }

  /**
   * Update workflow list metadata
   */
  private static updateWorkflowList(workflow: WorkflowState): void {
    try {
      const data = localStorage.getItem(WORKFLOW_LIST_KEY)
      let list: WorkflowMetadata[] = data ? JSON.parse(data) : []

      const metadata: WorkflowMetadata = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }

      const index = list.findIndex((w) => w.id === workflow.id)
      if (index >= 0) {
        list[index] = metadata
      } else {
        list.push(metadata)
      }

      localStorage.setItem(WORKFLOW_LIST_KEY, JSON.stringify(list))
    } catch (error) {
      console.error('[PersistenceService] Failed to update workflow list:', error)
    }
  }

  /**
   * Remove workflow from list
   */
  private static removeFromWorkflowList(id: string): void {
    try {
      const data = localStorage.getItem(WORKFLOW_LIST_KEY)
      if (!data) {
        return
      }

      const list = JSON.parse(data) as WorkflowMetadata[]
      const filtered = list.filter((w) => w.id !== id)
      localStorage.setItem(WORKFLOW_LIST_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('[PersistenceService] Failed to remove from workflow list:', error)
    }
  }

}
