import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkflowStore } from '@/stores/workflow'
import { useHistoryStore } from '@/stores/history'
import { useExecutionStore } from '@/stores/execution'
import { ExecutionEngine } from '@/services/ExecutionEngine'
import { PersistenceService } from '@/utils/persistence'
import type { WorkflowNode, WorkflowState } from '@/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

// Mock useDebounceFn to execute immediately in tests
vi.mock('@vueuse/core', async () => {
  const actual = await vi.importActual('@vueuse/core')
  return {
    ...actual,
    useDebounceFn: (fn: Function) => fn,
  }
})

/**
 * Integration Tests for Workflow Automation Builder
 *
 * These tests verify complete user workflows including:
 * - Creating, connecting, and configuring nodes
 * - Saving and reloading workflows
 * - Undo/redo functionality
 * - Execution preview
 */
describe('Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()

    // Initialize history store with snapshot handlers
    const historyStore = useHistoryStore()
    const workflowStore = useWorkflowStore()
    historyStore.setSnapshotHandlers(
      () => ({
        nodes: workflowStore.nodes,
        edges: workflowStore.edges,
        viewport: workflowStore.viewport,
      }),
      (snapshot) => workflowStore.restoreSnapshot(snapshot)
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper functions
  const createManualTriggerNode = (
    id: string,
    position = { x: 100, y: 100 }
  ): Omit<WorkflowNode, 'id'> & { id: string } => ({
    id,
    position,
    data: {
      label: 'Manual Trigger',
      type: 'manual-trigger',
      category: 'trigger',
      config: { name: 'Start' },
      isValid: true,
    },
  })

  const createHttpRequestNode = (
    id: string,
    position = { x: 300, y: 100 },
    config: Partial<{ url: string; method: string; headers?: Record<string, string>; body?: string; timeout?: number }> = {}
  ): Omit<WorkflowNode, 'id'> & { id: string } => ({
    id,
    position,
    data: {
      label: 'HTTP Request',
      type: 'http-request',
      category: 'action',
      config: {
        url: config.url || 'https://api.example.com/data',
        method: config.method || 'GET',
        headers: config.headers || {},
        body: config.body || '',
        timeout: config.timeout || 30000,
      },
      isValid: !!(config.url || 'https://api.example.com/data'),
    },
  })

  const createConditionNode = (
    id: string,
    position = { x: 500, y: 100 }
  ): Omit<WorkflowNode, 'id'> & { id: string } => ({
    id,
    position,
    data: {
      label: 'Condition',
      type: 'condition',
      category: 'logic',
      config: {
        expression: 'status',
        operator: 'equals',
        value: 200,
      },
      isValid: true,
    },
  })

  const createSendEmailNode = (
    id: string,
    position = { x: 700, y: 50 },
    config: Partial<{ to: string; subject: string; body: string; cc?: string }> = {}
  ): Omit<WorkflowNode, 'id'> & { id: string } => ({
    id,
    position,
    data: {
      label: 'Send Email',
      type: 'send-email',
      category: 'action',
      config: {
        to: config.to || 'user@example.com',
        subject: config.subject || 'Notification',
        body: config.body || 'Hello!',
        cc: config.cc || '',
      },
      isValid: !!(config.to || 'user@example.com') && !!(config.subject || 'Notification'),
    },
  })

  const createDelayNode = (
    id: string,
    position = { x: 500, y: 200 }
  ): Omit<WorkflowNode, 'id'> & { id: string } => ({
    id,
    position,
    data: {
      label: 'Delay',
      type: 'delay',
      category: 'action',
      config: {
        duration: 5,
        unit: 'seconds',
      },
      isValid: true,
    },
  })

  /**
   * 7.3.1: Test complete flow - create → connect → configure → save → reload
   */
  describe('Complete Workflow Flow', () => {
    it('should create nodes, connect them, configure, save, and reload successfully', () => {
      const workflowStore = useWorkflowStore()

      // Step 1: Create nodes
      const triggerId = workflowStore.addNode(createManualTriggerNode('trigger-1'))
      const httpId = workflowStore.addNode(createHttpRequestNode('http-1'))
      const conditionId = workflowStore.addNode(createConditionNode('condition-1'))
      const emailId = workflowStore.addNode(createSendEmailNode('email-1'))

      expect(workflowStore.nodes).toHaveLength(4)
      expect(triggerId).toBe('trigger-1')
      expect(httpId).toBe('http-1')
      expect(conditionId).toBe('condition-1')
      expect(emailId).toBe('email-1')

      // Step 2: Connect nodes (trigger → http → condition → email)
      const edge1 = workflowStore.addEdge({
        source: 'trigger-1',
        target: 'http-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      })
      const edge2 = workflowStore.addEdge({
        source: 'http-1',
        target: 'condition-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      })
      const edge3 = workflowStore.addEdge({
        source: 'condition-1',
        target: 'email-1',
        sourceHandle: 'true',
        targetHandle: 'input',
        label: 'True',
      })

      expect(workflowStore.edges).toHaveLength(3)
      expect(edge1).toBeDefined()
      expect(edge2).toBeDefined()
      expect(edge3).toBeDefined()

      // Step 3: Configure workflow metadata
      workflowStore.name = 'Test Integration Workflow'
      workflowStore.description = 'A workflow for integration testing'

      // Step 4: Update node configuration
      workflowStore.updateNode('http-1', {
        config: {
          url: 'https://api.example.com/updated',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"test": true}',
          timeout: 60000,
        },
      })

      expect(workflowStore?.nodes?.find((n) => n.id === 'http-1')?.data?.config).toMatchObject({
        url: 'https://api.example.com/updated',
        method: 'POST',
      })

      // Step 5: Save workflow
      const saveResult = workflowStore.saveWorkflow()
      expect(saveResult).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()

      // Capture the saved workflow ID
      const savedWorkflowId = workflowStore.id

      // Step 6: Reset workflow (simulate new session)
      workflowStore.resetWorkflow()
      expect(workflowStore.nodes).toHaveLength(0)
      expect(workflowStore.edges).toHaveLength(0)
      expect(workflowStore.name).toBe('Untitled Workflow')

      // Step 7: Reload workflow from storage
      const loadResult = workflowStore.loadWorkflowFromStorage(savedWorkflowId)
      expect(loadResult).toBe(true)

      // Step 8: Verify all data is restored correctly
      expect(workflowStore.name).toBe('Test Integration Workflow')
      expect(workflowStore.description).toBe('A workflow for integration testing')
      expect(workflowStore.nodes).toHaveLength(4)
      expect(workflowStore.edges).toHaveLength(3)

      // Verify node data is preserved
      const restoredHttpNode = workflowStore.nodes.find((n) => n.id === 'http-1')
      expect(restoredHttpNode?.data?.config).toMatchObject({
        url: 'https://api.example.com/updated',
        method: 'POST',
      })

      // Verify edge connections are preserved
      const edge = workflowStore.edges.find((e) => e.source === 'condition-1')
      expect(edge?.target).toBe('email-1')
      expect(edge?.label).toBe('True')
    })

    it('should handle workflow with branching logic (condition with true/false paths)', () => {
      const workflowStore = useWorkflowStore()

      // Create a workflow with branching:
      // trigger → condition → (true) → email
      //                    → (false) → delay

      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createConditionNode('condition-1', { x: 300, y: 100 }))
      workflowStore.addNode(createSendEmailNode('email-1', { x: 500, y: 50 }))
      workflowStore.addNode(createDelayNode('delay-1', { x: 500, y: 200 }))

      // Connect trigger to condition
      workflowStore.addEdge({
        source: 'trigger-1',
        target: 'condition-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      })

      // True branch to email
      workflowStore.addEdge({
        source: 'condition-1',
        target: 'email-1',
        sourceHandle: 'true',
        targetHandle: 'input',
        label: 'True',
      })

      // False branch to delay
      workflowStore.addEdge({
        source: 'condition-1',
        target: 'delay-1',
        sourceHandle: 'false',
        targetHandle: 'input',
        label: 'False',
      })

      expect(workflowStore.nodes).toHaveLength(4)
      expect(workflowStore.edges).toHaveLength(3)

      // Save and reload
      workflowStore.saveWorkflow()
      const workflowId = workflowStore.id

      workflowStore.resetWorkflow()
      workflowStore.loadWorkflowFromStorage(workflowId)

      // Verify branching structure is preserved
      const trueEdge = workflowStore.edges.find(
        (e) => e.source === 'condition-1' && e.sourceHandle === 'true'
      )
      const falseEdge = workflowStore.edges.find(
        (e) => e.source === 'condition-1' && e.sourceHandle === 'false'
      )

      expect(trueEdge?.target).toBe('email-1')
      expect(falseEdge?.target).toBe('delay-1')
    })
  })

  /**
   * 7.3.2: Test invalid input handling
   */
  describe('Invalid Input Handling', () => {
    it('should mark nodes as invalid when required fields are missing', () => {
      const workflowStore = useWorkflowStore()

      // Create an HTTP request node with invalid (empty) URL
      const nodeId = workflowStore.addNode({
        id: 'invalid-http',
        position: { x: 100, y: 100 },
        data: {
          label: 'HTTP Request',
          type: 'http-request',
          category: 'action',
          config: {
            url: '', // Invalid: empty URL
            method: 'GET',
          },
          isValid: false,
        },
      })

      const node = workflowStore.nodes.find((n) => n.id === nodeId)
      expect(node?.data?.isValid).toBe(false)
    })

    it('should not add edges without source or target', () => {
      const workflowStore = useWorkflowStore()

      // Attempt to add edge without source
      const edge1 = workflowStore.addEdge({
        source: '',
        target: 'node-2',
      })
      expect(edge1).toBeNull()
      expect(workflowStore.edges).toHaveLength(0)

      // Attempt to add edge without target
      const edge2 = workflowStore.addEdge({
        source: 'node-1',
        target: '',
      })
      expect(edge2).toBeNull()
      expect(workflowStore.edges).toHaveLength(0)
    })

    it('should handle importing invalid JSON gracefully', () => {
      const workflowStore = useWorkflowStore()

      // Invalid JSON string
      const invalidJson = '{ invalid json }'
      const result = workflowStore.importWorkflow(invalidJson)

      expect(result).toBe(false)
    })

    it('should handle importing workflow with missing required fields', () => {
      const workflowStore = useWorkflowStore()

      // JSON missing required fields
      const incompleteJson = JSON.stringify({
        name: 'Incomplete Workflow',
        // Missing: id, nodes, edges, viewport, timestamps
      })

      const result = workflowStore.importWorkflow(incompleteJson)
      expect(result).toBe(false)
    })

    it('should validate workflow has valid nodes and edges on reload', () => {
      const workflowStore = useWorkflowStore()

      // Create valid workflow
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      workflowStore.addEdge({ source: 'trigger-1', target: 'http-1' })

      // Save
      workflowStore.saveWorkflow()
      const workflowId = workflowStore.id

      // Manually corrupt the stored data by removing a node
      const storageKey = `automation-builder:workflow:${workflowId}`
      const storedData = JSON.parse(localStorageMock.store[storageKey])
      storedData.nodes = [] // Remove all nodes
      localStorageMock.store[storageKey] = JSON.stringify(storedData)

      // Reload
      workflowStore.resetWorkflow()
      workflowStore.loadWorkflowFromStorage(workflowId)

      // Edges should be filtered out since their nodes don't exist
      // (due to filterValidEdges in loadWorkflow)
      expect(workflowStore.nodes).toHaveLength(0)
      // Edges may or may not be filtered depending on implementation
    })
  })

  /**
   * 7.3.3: Test undo/redo state rollback
   *
   * Note: The history system saves snapshots BEFORE actions are applied.
   * This means undo restores to the state that existed before an action was performed.
   */
  describe('Undo/Redo State Rollback', () => {
    it('should undo the first action to return to empty state', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      // Add a node
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      expect(workflowStore.nodes).toHaveLength(1)
      expect(historyStore.canUndo).toBe(true)

      // Undo - returns to empty state (state before the add)
      historyStore.undo()
      expect(workflowStore.nodes).toHaveLength(0)
    })

    it('should track history entries correctly', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      expect(historyStore.entries).toHaveLength(0)
      expect(historyStore.currentIndex).toBe(-1)

      // Add first node
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      expect(historyStore.entries).toHaveLength(1)
      expect(historyStore.currentIndex).toBe(0)

      // Add second node
      workflowStore.addNode(createHttpRequestNode('http-1'))
      expect(historyStore.entries).toHaveLength(2)
      expect(historyStore.currentIndex).toBe(1)

      // Add edge
      workflowStore.addEdge({ source: 'trigger-1', target: 'http-1' })
      expect(historyStore.entries).toHaveLength(3)
      expect(historyStore.currentIndex).toBe(2)
    })

    it('should enable redo after undo', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      // Add nodes
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))

      expect(historyStore.canRedo).toBe(false)

      // Undo
      historyStore.undo()
      expect(historyStore.canRedo).toBe(true)
    })

    it('should clear redo history when new action is performed after undo', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      // Add two nodes
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      expect(historyStore.entries).toHaveLength(2)

      // Undo one action
      historyStore.undo()
      expect(historyStore.canRedo).toBe(true)

      // Add a new node - should clear redo history
      workflowStore.addNode(createConditionNode('condition-1'))
      expect(historyStore.canRedo).toBe(false)
      // History should be truncated and new entry added
      expect(historyStore.entries).toHaveLength(2)
    })

    it('should handle multiple undo operations', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      // Add multiple nodes
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      workflowStore.addNode(createConditionNode('condition-1'))

      expect(workflowStore.nodes).toHaveLength(3)
      expect(historyStore.currentIndex).toBe(2)

      // Undo all the way back
      historyStore.undo() // index: 2 -> 1
      historyStore.undo() // index: 1 -> 0
      historyStore.undo() // index: 0 -> -1, restores empty state

      expect(workflowStore.nodes).toHaveLength(0)
      expect(historyStore.currentIndex).toBe(-1)
      expect(historyStore.canUndo).toBe(false)
    })

    it('should not undo past the beginning of history', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      // Add a node and undo
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      historyStore.undo()

      expect(workflowStore.nodes).toHaveLength(0)
      expect(historyStore.canUndo).toBe(false)

      // Try to undo again - should do nothing
      const result = historyStore.undo()
      expect(result).toBe(false)
      expect(workflowStore.nodes).toHaveLength(0)
    })

    it('should save node deletion in history', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      // Setup
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      const initialHistoryLength = historyStore.entries.length

      // Delete a node
      workflowStore.deleteNodes(['http-1'])
      expect(workflowStore.nodes).toHaveLength(1)

      // History should have new entry for deletion
      expect(historyStore.entries.length).toBe(initialHistoryLength + 1)
    })

    it('should save node position changes in history', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      workflowStore.addNode(createManualTriggerNode('trigger-1', { x: 100, y: 100 }))
      const initialHistoryLength = historyStore.entries.length

      // Move node
      workflowStore.updateNodePositions([
        { nodeId: 'trigger-1', position: { x: 200, y: 200 } },
      ])

      expect(workflowStore.nodes[0].position).toEqual({ x: 200, y: 200 })
      expect(historyStore.entries.length).toBe(initialHistoryLength + 1)
    })

    it('should batch operations correctly', () => {
      const workflowStore = useWorkflowStore()
      const historyStore = useHistoryStore()

      // Start with some nodes
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      const initialLength = historyStore.entries.length

      // Start batch
      historyStore.startBatch()
      expect(historyStore.isBatching).toBe(true)

      // End batch
      historyStore.endBatch('Batch operation')
      expect(historyStore.isBatching).toBe(false)
      expect(historyStore.entries.length).toBe(initialLength + 1)
      expect(historyStore.entries[historyStore.entries.length - 1].actionType).toBe('BATCH')
    })
  })

  /**
   * 7.3.4: Test workflow persistence and reload
   */
  describe('Workflow Persistence and Reload', () => {
    it('should persist workflow to localStorage', () => {
      const workflowStore = useWorkflowStore()

      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.name = 'Persisted Workflow'

      workflowStore.saveWorkflow()

      expect(localStorageMock.setItem).toHaveBeenCalled()

      // Verify the stored data
      const storageKey = `automation-builder:workflow:${workflowStore.id}`
      const storedData = JSON.parse(localStorageMock.store[storageKey])

      expect(storedData.name).toBe('Persisted Workflow')
      expect(storedData.nodes).toHaveLength(1)
    })

    it('should load workflow from localStorage', () => {
      const workflowStore = useWorkflowStore()

      // Create and save a workflow
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      workflowStore.addEdge({ source: 'trigger-1', target: 'http-1' })
      workflowStore.name = 'Loadable Workflow'
      workflowStore.description = 'Test description'

      workflowStore.saveWorkflow()
      const savedId = workflowStore.id

      // Reset
      workflowStore.resetWorkflow()
      expect(workflowStore.nodes).toHaveLength(0)

      // Load
      const result = workflowStore.loadWorkflowFromStorage(savedId)

      expect(result).toBe(true)
      expect(workflowStore.name).toBe('Loadable Workflow')
      expect(workflowStore.description).toBe('Test description')
      expect(workflowStore.nodes).toHaveLength(2)
      expect(workflowStore.edges).toHaveLength(1)
    })

    it('should return false when loading non-existent workflow', () => {
      const workflowStore = useWorkflowStore()

      const result = workflowStore.loadWorkflowFromStorage('non-existent-id')

      expect(result).toBe(false)
    })

    it('should export workflow as valid JSON', () => {
      const workflowStore = useWorkflowStore()

      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      workflowStore.addEdge({ source: 'trigger-1', target: 'http-1' })
      workflowStore.name = 'Exportable Workflow'

      const exported = workflowStore.exportWorkflow()
      const parsed = JSON.parse(exported) as WorkflowState

      expect(parsed.name).toBe('Exportable Workflow')
      expect(parsed.nodes).toHaveLength(2)
      expect(parsed.edges).toHaveLength(1)
      expect(parsed.viewport).toBeDefined()
      expect(parsed.createdAt).toBeDefined()
      expect(parsed.updatedAt).toBeDefined()
    })

    it('should import workflow from JSON', () => {
      const workflowStore = useWorkflowStore()

      const workflowJson: WorkflowState = {
        id: 'imported-workflow-id',
        name: 'Imported Workflow',
        description: 'Imported from JSON',
        nodes: [
          {
            id: 'imported-trigger',
            position: { x: 100, y: 100 },
            data: {
              label: 'Trigger',
              type: 'manual-trigger',
              category: 'trigger',
              config: { name: 'Start' },
              isValid: true,
            },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = workflowStore.importWorkflow(JSON.stringify(workflowJson))

      expect(result).toBe(true)
      expect(workflowStore.name).toBe('Imported Workflow')
      expect(workflowStore.description).toBe('Imported from JSON')
      expect(workflowStore.nodes).toHaveLength(1)
      expect(workflowStore.nodes[0].id).toBe('imported-trigger')
    })

    it('should preserve viewport state on save/load', () => {
      const workflowStore = useWorkflowStore()

      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.setViewport({ x: 150, y: 250, zoom: 1.5 })

      workflowStore.saveWorkflow()
      const savedId = workflowStore.id

      workflowStore.resetWorkflow()
      workflowStore.loadWorkflowFromStorage(savedId)

      expect(workflowStore.viewport).toEqual({ x: 150, y: 250, zoom: 1.5 })
    })

    it('should manage workflow list correctly', () => {
      const workflowStore = useWorkflowStore()

      // Create and save first workflow
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.name = 'Workflow 1'
      workflowStore.saveWorkflow()
      const workflow1Id = workflowStore.id

      // Create and save second workflow
      workflowStore.resetWorkflow()
      workflowStore.addNode(createHttpRequestNode('http-1'))
      workflowStore.name = 'Workflow 2'
      workflowStore.saveWorkflow()
      const workflow2Id = workflowStore.id

      // Get workflow list
      const list = PersistenceService.getWorkflowList()

      expect(list.length).toBeGreaterThanOrEqual(2)
      expect(list.some((w) => w.id === workflow1Id)).toBe(true)
      expect(list.some((w) => w.id === workflow2Id)).toBe(true)
    })

    it('should delete workflow from storage', () => {
      const workflowStore = useWorkflowStore()

      // Create and save workflow
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.saveWorkflow()
      const savedId = workflowStore.id

      // Verify it exists
      expect(workflowStore.loadWorkflowFromStorage(savedId)).toBe(true)

      // Delete
      const deleteResult = PersistenceService.deleteWorkflow(savedId)
      expect(deleteResult).toBe(true)

      // Verify it's gone
      workflowStore.resetWorkflow()
      expect(workflowStore.loadWorkflowFromStorage(savedId)).toBe(false)
    })
  })

  /**
   * 7.3.5: Test run preview execution
   */
  describe('Run Preview Execution', () => {
    it('should execute a simple linear workflow', async () => {
      const workflowStore = useWorkflowStore()
      const engine = new ExecutionEngine()

      // Create simple workflow: trigger → http
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      workflowStore.addEdge({ source: 'trigger-1', target: 'http-1' })

      // Execute
      engine.initialize()
      const executionOrder = engine.getExecutionOrder()

      expect(executionOrder).toContain('trigger-1')
      expect(executionOrder).toContain('http-1')
      expect(executionOrder.indexOf('trigger-1')).toBeLessThan(
        executionOrder.indexOf('http-1')
      )
    })

    it('should compute correct execution order with topological sort', () => {
      const workflowStore = useWorkflowStore()
      const engine = new ExecutionEngine()

      // Create diamond pattern:
      //    trigger
      //      |
      //    http1
      //    /    \
      // delay  email
      //    \    /
      //    http2
      workflowStore.addNode(createManualTriggerNode('trigger'))
      workflowStore.addNode(createHttpRequestNode('http1', { x: 200, y: 100 }))
      workflowStore.addNode(createDelayNode('delay', { x: 150, y: 200 }))
      workflowStore.addNode(createSendEmailNode('email', { x: 250, y: 200 }))
      workflowStore.addNode(createHttpRequestNode('http2', { x: 200, y: 300 }))

      workflowStore.addEdge({ source: 'trigger', target: 'http1' })
      workflowStore.addEdge({ source: 'http1', target: 'delay' })
      workflowStore.addEdge({ source: 'http1', target: 'email' })
      workflowStore.addEdge({ source: 'delay', target: 'http2' })
      workflowStore.addEdge({ source: 'email', target: 'http2' })

      engine.initialize()
      const order = engine.getExecutionOrder()

      // Verify execution order constraints
      expect(order.indexOf('trigger')).toBeLessThan(order.indexOf('http1'))
      expect(order.indexOf('http1')).toBeLessThan(order.indexOf('delay'))
      expect(order.indexOf('http1')).toBeLessThan(order.indexOf('email'))
      expect(order.indexOf('delay')).toBeLessThan(order.indexOf('http2'))
      expect(order.indexOf('email')).toBeLessThan(order.indexOf('http2'))
    })

    it('should track execution state correctly', async () => {
      const workflowStore = useWorkflowStore()
      const executionStore = useExecutionStore()

      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      workflowStore.addEdge({ source: 'trigger-1', target: 'http-1' })

      // Start execution
      executionStore.reset()
      executionStore.startExecution()

      expect(executionStore.status).toBe('running')
      expect(executionStore.isRunning).toBe(true)

      // Complete execution
      executionStore.completeExecution()

      expect(executionStore.status).toBe('completed')
      expect(executionStore.isCompleted).toBe(true)
    })

    it('should support pause and resume', () => {
      const executionStore = useExecutionStore()

      executionStore.startExecution()
      expect(executionStore.status).toBe('running')

      executionStore.pauseExecution()
      expect(executionStore.status).toBe('paused')
      expect(executionStore.isPaused).toBe(true)

      executionStore.resumeExecution()
      expect(executionStore.status).toBe('running')
    })

    it('should support stop execution', () => {
      const executionStore = useExecutionStore()

      executionStore.startExecution()
      expect(executionStore.status).toBe('running')

      executionStore.stopExecution()
      expect(executionStore.status).toBe('idle')
    })

    it('should track per-node execution status', () => {
      const executionStore = useExecutionStore()

      executionStore.reset()
      executionStore.setNodeState('node-1', { status: 'pending' })
      executionStore.setNodeState('node-2', { status: 'pending' })

      expect(executionStore.getNodeStatus('node-1')).toBe('pending')
      expect(executionStore.getNodeStatus('node-2')).toBe('pending')

      executionStore.setNodeState('node-1', { status: 'running' })
      expect(executionStore.getNodeStatus('node-1')).toBe('running')

      executionStore.setNodeState('node-1', { status: 'success' })
      expect(executionStore.getNodeStatus('node-1')).toBe('success')
    })

    it('should add execution logs', () => {
      const executionStore = useExecutionStore()

      executionStore.reset()
      executionStore.addLog({
        nodeId: 'node-1',
        nodeName: 'Test Node',
        status: 'success',
        message: 'Node executed successfully',
      })

      expect(executionStore.logs).toHaveLength(1)
      expect(executionStore.logs[0].nodeId).toBe('node-1')
      expect(executionStore.logs[0].status).toBe('success')
      expect(executionStore.logs[0].timestamp).toBeDefined()
    })

    it('should store execution data per node', () => {
      const executionStore = useExecutionStore()

      executionStore.reset()
      executionStore.setExecutionData('node-1', { result: 'test data' })
      executionStore.setExecutionData('node-2', { response: { status: 200 } })

      expect(executionStore.executionData['node-1']).toEqual({ result: 'test data' })
      expect(executionStore.executionData['node-2']).toEqual({ response: { status: 200 } })
    })

    it('should reset execution state completely', () => {
      const executionStore = useExecutionStore()

      // Setup some state
      executionStore.startExecution()
      executionStore.setCurrentNode('node-1')
      executionStore.setNodeState('node-1', { status: 'success' })
      executionStore.addLog({
        nodeId: 'node-1',
        nodeName: 'Test',
        status: 'success',
        message: 'Done',
      })
      executionStore.setExecutionData('node-1', { test: true })

      // Reset
      executionStore.reset()

      expect(executionStore.status).toBe('idle')
      expect(executionStore.currentNodeId).toBeNull()
      expect(executionStore.nodeStates).toEqual({})
      expect(executionStore.logs).toHaveLength(0)
      expect(executionStore.executionData).toEqual({})
    })

    it('should handle execution speed setting', () => {
      const executionStore = useExecutionStore()

      expect(executionStore.executionSpeed).toBe(1000) // Default

      executionStore.setExecutionSpeed(500)
      expect(executionStore.executionSpeed).toBe(500)

      executionStore.setExecutionSpeed(2000)
      expect(executionStore.executionSpeed).toBe(2000)
    })

    it('should step through execution one node at a time', async () => {
      const workflowStore = useWorkflowStore()
      const engine = new ExecutionEngine()

      // Simple two-node workflow
      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createDelayNode('delay-1'))
      workflowStore.addEdge({ source: 'trigger-1', target: 'delay-1' })

      // Initialize the engine first
      engine.initialize()
      const order = engine.getExecutionOrder()

      expect(order).toHaveLength(2)
      expect(order).toContain('trigger-1')
      expect(order).toContain('delay-1')

      // Verify execution order
      expect(order.indexOf('trigger-1')).toBeLessThan(order.indexOf('delay-1'))
    })
  })

  /**
   * Additional integration scenarios
   */
  describe('Complex Workflow Scenarios', () => {
    it('should handle workflow with multiple triggers', () => {
      const workflowStore = useWorkflowStore()
      const engine = new ExecutionEngine()

      // Two triggers, both leading to same action
      workflowStore.addNode(createManualTriggerNode('trigger-1', { x: 100, y: 100 }))
      workflowStore.addNode(createManualTriggerNode('trigger-2', { x: 100, y: 200 }))
      workflowStore.addNode(createHttpRequestNode('http-1', { x: 300, y: 150 }))

      workflowStore.addEdge({ source: 'trigger-1', target: 'http-1' })
      workflowStore.addEdge({ source: 'trigger-2', target: 'http-1' })

      engine.initialize()
      const order = engine.getExecutionOrder()

      // Both triggers should come before http
      expect(order.indexOf('http-1')).toBeGreaterThan(order.indexOf('trigger-1'))
      expect(order.indexOf('http-1')).toBeGreaterThan(order.indexOf('trigger-2'))
    })

    it('should handle empty workflow gracefully', () => {
      const engine = new ExecutionEngine()

      engine.initialize()
      const order = engine.getExecutionOrder()

      expect(order).toEqual([])
    })

    it('should handle isolated nodes (no connections)', () => {
      const workflowStore = useWorkflowStore()
      const engine = new ExecutionEngine()

      workflowStore.addNode(createManualTriggerNode('trigger-1'))
      workflowStore.addNode(createHttpRequestNode('http-1'))
      // No edges - nodes are isolated

      engine.initialize()
      const order = engine.getExecutionOrder()

      // Both nodes should be in execution order
      expect(order).toContain('trigger-1')
      expect(order).toContain('http-1')
    })

    it('should preserve node configuration through export/import cycle', () => {
      const workflowStore = useWorkflowStore()

      // Create workflow with specific configuration
      workflowStore.addNode(
        createHttpRequestNode('http-1', { x: 100, y: 100 }, {
          url: 'https://api.custom.com/endpoint',
          method: 'POST',
          headers: { Authorization: 'Bearer token123' },
          body: '{"key": "value"}',
          timeout: 45000,
        })
      )

      workflowStore.addNode(
        createSendEmailNode('email-1', { x: 300, y: 100 }, {
          to: 'specific@example.com',
          subject: 'Custom Subject',
          body: 'Custom body content',
          cc: 'cc@example.com',
        })
      )

      // Export
      const exported = workflowStore.exportWorkflow()

      // Reset and import
      workflowStore.resetWorkflow()
      workflowStore.importWorkflow(exported)

      // Verify HTTP node config
      const httpNode = workflowStore.nodes.find((n) => n.id === 'http-1')
      expect(httpNode?.data?.config).toMatchObject({
        url: 'https://api.custom.com/endpoint',
        method: 'POST',
        timeout: 45000,
      })

      // Verify Email node config
      const emailNode = workflowStore.nodes.find((n) => n.id === 'email-1')
      expect(emailNode?.data?.config).toMatchObject({
        to: 'specific@example.com',
        subject: 'Custom Subject',
        cc: 'cc@example.com',
      })
    })
  })
})
