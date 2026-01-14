import { describe, it, expect } from 'vitest'
import {
  validateConnection,
  getValidSourceHandles,
  getValidTargetHandles,
  createEdgeWithLabel,
  wouldCreateCycle,
  getNodeEdges,
} from './edgeUtils'
import type { WorkflowNode, WorkflowEdge } from '@/types'
import type { Connection } from '@vue-flow/core'

describe('edgeUtils', () => {
  const createNode = (id: string, type: 'manual-trigger' | 'http-request' | 'condition' | 'delay' = 'http-request'): WorkflowNode => ({
    id,
    position: { x: 0, y: 0 },
    data: {
      label: `Node ${id}`,
      type,
      category: type === 'manual-trigger' ? 'trigger' : type === 'condition' ? 'logic' : 'action',
      config: {},
      isValid: true,
    } as WorkflowNode['data'],
  })

  describe('validateConnection', () => {
    it('accepts valid connection', () => {
      const nodes = [
        createNode('node-1', 'manual-trigger'),
        createNode('node-2', 'http-request'),
      ]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(true)
    })

    it('rejects connection without source', () => {
      const nodes = [createNode('node-1'), createNode('node-2')]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: null as unknown as string,
        target: 'node-2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('source and target')
    })

    it('rejects connection without target', () => {
      const nodes = [createNode('node-1'), createNode('node-2')]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: null as unknown as string,
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('source and target')
    })

    it('rejects self-connection', () => {
      const nodes = [createNode('node-1')]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: 'node-1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('itself')
    })

    it('rejects connection to non-existent source node', () => {
      const nodes = [createNode('node-2')]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not found')
    })

    it('rejects connection to non-existent target node', () => {
      const nodes = [createNode('node-1')]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not found')
    })

    it('rejects incoming connection to trigger node', () => {
      const nodes = [
        createNode('node-1', 'http-request'),
        createNode('node-2', 'manual-trigger'),
      ]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Trigger nodes')
    })

    it('rejects duplicate connection', () => {
      const nodes = [
        createNode('node-1', 'manual-trigger'),
        createNode('node-2', 'http-request'),
      ]
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ]
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('already exists')
    })

    it('rejects connection when target already has incoming connection', () => {
      const nodes = [
        createNode('node-1', 'manual-trigger'),
        createNode('node-2', 'manual-trigger'),
        createNode('node-3', 'http-request'),
      ]
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-3' },
      ]
      const connection: Connection = {
        source: 'node-2',
        target: 'node-3',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('already has an incoming connection')
    })

    it('rejects connection with invalid source handle', () => {
      const nodes = [
        createNode('node-1', 'manual-trigger'),
        createNode('node-2', 'http-request'),
      ]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'invalid-handle',
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Invalid source handle')
    })

    it('accepts valid source handle', () => {
      const nodes = [
        createNode('node-1', 'condition'),
        createNode('node-2', 'http-request'),
      ]
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'true',
        targetHandle: null,
      }

      const result = validateConnection(connection, nodes, edges)

      expect(result.valid).toBe(true)
    })
  })

  describe('getValidSourceHandles', () => {
    it('returns output for trigger nodes', () => {
      const handles = getValidSourceHandles('manual-trigger')
      expect(handles).toContain('output')
    })

    it('returns true and false for condition nodes', () => {
      const handles = getValidSourceHandles('condition')
      expect(handles).toContain('true')
      expect(handles).toContain('false')
    })

    it('returns output and error for http-request', () => {
      const handles = getValidSourceHandles('http-request')
      expect(handles).toContain('output')
      expect(handles).toContain('error')
    })

    it('returns success and error for send-email', () => {
      const handles = getValidSourceHandles('send-email')
      expect(handles).toContain('success')
      expect(handles).toContain('error')
    })

    it('returns output for delay', () => {
      const handles = getValidSourceHandles('delay')
      expect(handles).toContain('output')
    })
  })

  describe('getValidTargetHandles', () => {
    it('returns empty for trigger nodes', () => {
      const handles = getValidTargetHandles('manual-trigger')
      expect(handles).toEqual([])
    })

    it('returns input for action nodes', () => {
      const handles = getValidTargetHandles('http-request')
      expect(handles).toContain('input')
    })

    it('returns input for condition nodes', () => {
      const handles = getValidTargetHandles('condition')
      expect(handles).toContain('input')
    })
  })

  describe('createEdgeWithLabel', () => {
    it('creates edge without label for regular connection', () => {
      const nodes = [
        createNode('node-1', 'manual-trigger'),
        createNode('node-2', 'http-request'),
      ]
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: null,
        targetHandle: null,
      }

      const edge = createEdgeWithLabel(connection, nodes)

      expect(edge.source).toBe('node-1')
      expect(edge.target).toBe('node-2')
      expect(edge.label).toBeUndefined()
    })

    it('creates edge with Yes label for condition true branch', () => {
      const nodes = [
        createNode('node-1', 'condition'),
        createNode('node-2', 'http-request'),
      ]
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'true',
        targetHandle: null,
      }

      const edge = createEdgeWithLabel(connection, nodes)

      expect(edge.label).toBe('Yes')
      expect(edge.data?.condition).toBe('true')
    })

    it('creates edge with No label for condition false branch', () => {
      const nodes = [
        createNode('node-1', 'condition'),
        createNode('node-2', 'http-request'),
      ]
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'false',
        targetHandle: null,
      }

      const edge = createEdgeWithLabel(connection, nodes)

      expect(edge.label).toBe('No')
      expect(edge.data?.condition).toBe('false')
    })

    it('creates edge with Success label for action success port', () => {
      const nodes = [
        createNode('node-1', 'http-request'),
        createNode('node-2', 'delay'),
      ]
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'success',
        targetHandle: null,
      }

      const edge = createEdgeWithLabel(connection, nodes)

      expect(edge.label).toBe('Success')
    })

    it('creates edge with Error label for action error port', () => {
      const nodes = [
        createNode('node-1', 'http-request'),
        createNode('node-2', 'delay'),
      ]
      const connection: Connection = {
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'error',
        targetHandle: null,
      }

      const edge = createEdgeWithLabel(connection, nodes)

      expect(edge.label).toBe('Error')
    })
  })

  describe('wouldCreateCycle', () => {
    it('returns false for valid acyclic connection', () => {
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
      ]
      const connection: Connection = {
        source: 'node-3',
        target: 'node-4',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = wouldCreateCycle(connection, edges)

      expect(result).toBe(false)
    })

    it('returns true for self-loop', () => {
      const edges: WorkflowEdge[] = []
      const connection: Connection = {
        source: 'node-1',
        target: 'node-1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = wouldCreateCycle(connection, edges)

      expect(result).toBe(true)
    })

    it('returns true for direct cycle (A -> B -> A)', () => {
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ]
      const connection: Connection = {
        source: 'node-2',
        target: 'node-1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = wouldCreateCycle(connection, edges)

      expect(result).toBe(true)
    })

    it('returns true for indirect cycle (A -> B -> C -> A)', () => {
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
      ]
      const connection: Connection = {
        source: 'node-3',
        target: 'node-1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = wouldCreateCycle(connection, edges)

      expect(result).toBe(true)
    })

    it('returns true for long cycle', () => {
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
        { id: 'edge-3', source: 'node-3', target: 'node-4' },
        { id: 'edge-4', source: 'node-4', target: 'node-5' },
      ]
      const connection: Connection = {
        source: 'node-5',
        target: 'node-1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = wouldCreateCycle(connection, edges)

      expect(result).toBe(true)
    })

    it('returns false for parallel paths without cycle', () => {
      // node-1 -> node-2 -> node-4
      // node-1 -> node-3 -> node-4
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-1', target: 'node-3' },
        { id: 'edge-3', source: 'node-2', target: 'node-4' },
      ]
      const connection: Connection = {
        source: 'node-3',
        target: 'node-4',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = wouldCreateCycle(connection, edges)

      expect(result).toBe(false)
    })

    it('returns false for connection without source or target', () => {
      const edges: WorkflowEdge[] = []

      expect(wouldCreateCycle({ source: null as unknown as string, target: 'node-2', sourceHandle: null, targetHandle: null }, edges)).toBe(false)
      expect(wouldCreateCycle({ source: 'node-1', target: null as unknown as string, sourceHandle: null, targetHandle: null }, edges)).toBe(false)
    })

    it('handles complex graph structures', () => {
      // Diamond pattern: 1 -> 2, 1 -> 3, 2 -> 4, 3 -> 4
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-1', target: 'node-3' },
        { id: 'edge-3', source: 'node-2', target: 'node-4' },
        { id: 'edge-4', source: 'node-3', target: 'node-4' },
      ]

      // Adding 4 -> 5 should not create cycle
      expect(wouldCreateCycle({ source: 'node-4', target: 'node-5', sourceHandle: null, targetHandle: null }, edges)).toBe(false)

      // Adding 4 -> 1 would create cycle
      expect(wouldCreateCycle({ source: 'node-4', target: 'node-1', sourceHandle: null, targetHandle: null }, edges)).toBe(true)
    })
  })

  describe('getNodeEdges', () => {
    it('returns incoming and outgoing edges', () => {
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
        { id: 'edge-3', source: 'node-2', target: 'node-4' },
      ]

      const result = getNodeEdges('node-2', edges)

      expect(result.incoming).toHaveLength(1)
      expect(result.incoming[0].id).toBe('edge-1')
      expect(result.outgoing).toHaveLength(2)
    })

    it('returns empty arrays for node with no edges', () => {
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ]

      const result = getNodeEdges('node-3', edges)

      expect(result.incoming).toHaveLength(0)
      expect(result.outgoing).toHaveLength(0)
    })

    it('handles node with only incoming edges', () => {
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-3', target: 'node-2' },
      ]

      const result = getNodeEdges('node-2', edges)

      expect(result.incoming).toHaveLength(2)
      expect(result.outgoing).toHaveLength(0)
    })

    it('handles node with only outgoing edges', () => {
      const edges: WorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-1', target: 'node-3' },
      ]

      const result = getNodeEdges('node-1', edges)

      expect(result.incoming).toHaveLength(0)
      expect(result.outgoing).toHaveLength(2)
    })
  })
})
