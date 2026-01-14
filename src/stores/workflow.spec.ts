import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'
import {useWorkflowStore} from './workflow'
import {useHistoryStore} from './history'
import type {WorkflowNode} from '@/types'

// Mock the persistence service
vi.mock('@/utils/persistence', () => ({
	PersistenceService: {
		saveWorkflow: vi.fn(),
		loadWorkflow: vi.fn(),
		exportWorkflow: vi.fn((state) => JSON.stringify(state)),
		importWorkflow: vi.fn((json) => JSON.parse(json)),
	},
}))

// Mock useDebounceFn to execute immediately in tests
vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core')
	return {
		...actual,
		useDebounceFn: (fn: Function) => fn,
	}
})

describe('workflowStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		// Initialize history store with handlers
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

	const createTestNode = (id: string, type: 'manual-trigger' | 'http-request' = 'manual-trigger'): Omit<WorkflowNode, 'id'> & {
		id?: string
	} => ({
		id,
		position: {x: 100, y: 100},
		data: {
			label: `Node ${id}`,
			type,
			category: type === 'manual-trigger' ? 'trigger' : 'action',
			config: type === 'manual-trigger' ? {name: 'Test'} : {url: '', method: 'GET'},
			isValid: true,
		} as WorkflowNode['data'],
	})

	describe('initial state', () => {
		it('has default values', () => {
			const store = useWorkflowStore()
			expect(store.nodes).toEqual([])
			expect(store.edges).toEqual([])
			expect(store.viewport).toEqual({x: 0, y: 0, zoom: 1})
			expect(store.selectedNodeIds).toEqual([])
			expect(store.selectedEdgeIds).toEqual([])
			expect(store.name).toBe('Untitled Workflow')
		})
	})

	describe('addNode', () => {
		it('adds a node to the store', () => {
			const store = useWorkflowStore()
			const node = createTestNode('node-1')

			const nodeId = store.addNode(node)

			expect(nodeId).toBe('node-1')
			expect(store.nodes).toHaveLength(1)
			expect(store.nodes[0].id).toBe('node-1')
		})

		it('generates an id if not provided', () => {
			const store = useWorkflowStore()
			const node = createTestNode('')
			delete (node as any).id

			const nodeId = store.addNode(node)

			expect(nodeId).toBeDefined()
			expect(store.nodes).toHaveLength(1)
			expect(store.nodes[0].id).toBe(nodeId)
		})

		it('adds multiple nodes', () => {
			const store = useWorkflowStore()

			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.addNode(createTestNode('node-3', 'http-request'))

			expect(store.nodes).toHaveLength(3)
		})
	})

	describe('updateNode', () => {
		it('updates node data', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))

			store.updateNode('node-1', {label: 'Updated Label'})

			expect(store.nodes[0].data.label).toBe('Updated Label')
		})

		it('preserves other node data when updating', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			const originalConfig = store.nodes[0].data.config

			store.updateNode('node-1', {label: 'Updated'})

			expect(store.nodes[0].data.config).toEqual(originalConfig)
		})
	})

	describe('updateNodePosition', () => {
		it('updates node position', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))

			store.updateNodePosition('node-1', {x: 200, y: 300})

			expect(store.nodes[0].position).toEqual({x: 200, y: 300})
		})
	})

	describe('updateNodePositions', () => {
		it('updates multiple node positions', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))

			store.updateNodePositions([
				{nodeId: 'node-1', position: {x: 200, y: 200}},
				{nodeId: 'node-2', position: {x: 300, y: 300}},
			])

			expect(store.nodes[0].position).toEqual({x: 200, y: 200})
			expect(store.nodes[1].position).toEqual({x: 300, y: 300})
		})
	})

	describe('deleteNodes', () => {
		it('deletes a single node', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))

			store.deleteNodes(['node-1'])

			expect(store.nodes).toHaveLength(1)
			expect(store.nodes[0].id).toBe('node-2')
		})

		it('deletes multiple nodes', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.addNode(createTestNode('node-3', 'http-request'))

			store.deleteNodes(['node-1', 'node-3'])

			expect(store.nodes).toHaveLength(1)
			expect(store.nodes[0].id).toBe('node-2')
		})

		it('deletes connected edges when node is deleted', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.addEdge({source: 'node-1', target: 'node-2'})

			store.deleteNodes(['node-1'])

			expect(store.edges).toHaveLength(0)
		})

		it('clears selection for deleted nodes', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.setSelection(['node-1', 'node-2'])

			store.deleteNodes(['node-1'])

			expect(store.selectedNodeIds).toEqual(['node-2'])
		})
	})

	describe('addEdge', () => {
		it('adds an edge between nodes', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))

			const edgeId = store.addEdge({
				source: 'node-1',
				target: 'node-2',
			})

			expect(edgeId).toBeDefined()
			expect(store.edges).toHaveLength(1)
			expect(store.edges[0].source).toBe('node-1')
			expect(store.edges[0].target).toBe('node-2')
		})

		it('returns null for edge without source', () => {
			const store = useWorkflowStore()

			const edgeId = store.addEdge({
				source: '',
				target: 'node-2',
			})

			expect(edgeId).toBeNull()
			expect(store.edges).toHaveLength(0)
		})

		it('returns null for edge without target', () => {
			const store = useWorkflowStore()

			const edgeId = store.addEdge({
				source: 'node-1',
				target: '',
			})

			expect(edgeId).toBeNull()
			expect(store.edges).toHaveLength(0)
		})
	})

	describe('deleteEdges', () => {
		it('deletes edges by id', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.addNode(createTestNode('node-3', 'http-request'))
			store.addEdge({id: 'edge-1', source: 'node-1', target: 'node-2'})
			store.addEdge({id: 'edge-2', source: 'node-2', target: 'node-3'})

			store.deleteEdges(['edge-1'])

			expect(store.edges).toHaveLength(1)
			expect(store.edges[0].id).toBe('edge-2')
		})
	})

	describe('selection', () => {
		it('sets node selection', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))

			store.setSelection(['node-1', 'node-2'])

			expect(store.selectedNodeIds).toEqual(['node-1', 'node-2'])
		})

		it('sets edge selection', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.addEdge({id: 'edge-1', source: 'node-1', target: 'node-2'})

			store.setSelection([], ['edge-1'])

			expect(store.selectedEdgeIds).toEqual(['edge-1'])
		})

		it('clears selection', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.setSelection(['node-1'])

			store.clearSelection()

			expect(store.selectedNodeIds).toEqual([])
			expect(store.selectedEdgeIds).toEqual([])
		})

		it('selects all nodes and edges', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.addEdge({id: 'edge-1', source: 'node-1', target: 'node-2'})

			store.selectAll()

			expect(store.selectedNodeIds).toEqual(['node-1', 'node-2'])
			expect(store.selectedEdgeIds).toEqual(['edge-1'])
		})
	})

	describe('getters', () => {
		it('returns selected node objects', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.setSelection(['node-1'])

			expect(store.selectedNodeObjects).toHaveLength(1)
			expect(store.selectedNodeObjects[0].id).toBe('node-1')
		})

		it('returns node by id', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))

			const node = store.nodeById.get('node-1')

			expect(node?.id).toBe('node-1')
		})
	})

	describe('clipboard operations', () => {
		it('copies nodes to clipboard', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))

			store.copyNodes(['node-1'])

			// Clipboard is internal state, verify by pasting
			const beforeCount = store.nodes.length
			store.pasteNodes()
			expect(store.nodes.length).toBe(beforeCount + 1)
		})

		it('copies nodes with internal edges', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addNode(createTestNode('node-2', 'http-request'))
			store.addEdge({id: 'edge-1', source: 'node-1', target: 'node-2'})

			store.copyNodes(['node-1', 'node-2'])
			store.pasteNodes()

			// Should have 4 nodes (2 original + 2 pasted)
			expect(store.nodes.length).toBe(4)
			// Should have 2 edges (1 original + 1 pasted)
			expect(store.edges.length).toBe(2)
		})

		it('paste does nothing with empty clipboard', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))

			store.pasteNodes()

			expect(store.nodes.length).toBe(1)
		})

		it('duplicates nodes', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))

			store.duplicateNodes(['node-1'])

			expect(store.nodes.length).toBe(2)
		})
	})

	describe('nudge operations', () => {
		it('nudges selected nodes up', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.setSelection(['node-1'])
			const originalY = store.nodes[0].position.y

			store.nudgeNodes('up', 10)

			expect(store.nodes[0].position.y).toBe(originalY - 10)
		})

		it('nudges selected nodes down', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.setSelection(['node-1'])
			const originalY = store.nodes[0].position.y

			store.nudgeNodes('down', 10)

			expect(store.nodes[0].position.y).toBe(originalY + 10)
		})

		it('nudges selected nodes left', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.setSelection(['node-1'])
			const originalX = store.nodes[0].position.x

			store.nudgeNodes('left', 10)

			expect(store.nodes[0].position.x).toBe(originalX - 10)
		})

		it('nudges selected nodes right', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.setSelection(['node-1'])
			const originalX = store.nodes[0].position.x

			store.nudgeNodes('right', 10)

			expect(store.nodes[0].position.x).toBe(originalX + 10)
		})

		it('does nothing with no selection', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			const originalPosition = {...store.nodes[0].position}

			store.nudgeNodes('up', 10)

			expect(store.nodes[0].position).toEqual(originalPosition)
		})
	})

	describe('viewport', () => {
		it('sets viewport state', () => {
			const store = useWorkflowStore()

			store.setViewport({x: 100, y: 200, zoom: 1.5})

			expect(store.viewport).toEqual({x: 100, y: 200, zoom: 1.5})
		})
	})

	describe('workflow management', () => {
		it('resets workflow to initial state', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))
			store.addEdge({source: 'node-1', target: 'node-2'})

			store.resetWorkflow()

			expect(store.nodes).toEqual([])
			expect(store.edges).toEqual([])
			expect(store.name).toBe('Untitled Workflow')
		})

		it('exports workflow as JSON', () => {
			const store = useWorkflowStore()
			store.addNode(createTestNode('node-1'))

			const json = store.exportWorkflow()
			const parsed = JSON.parse(json)

			expect(parsed.nodes).toHaveLength(1)
			expect(parsed.nodes[0].id).toBe('node-1')
		})

		it('imports workflow from JSON', () => {
			const store = useWorkflowStore()
			const workflowJson = JSON.stringify({
				id: 'test-workflow',
				name: 'Imported Workflow',
				description: 'Test',
				nodes: [createTestNode('imported-node')],
				edges: [],
				viewport: {x: 0, y: 0, zoom: 1},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})

			const result = store.importWorkflow(workflowJson)

			expect(result).toBe(true)
			expect(store.name).toBe('Imported Workflow')
			expect(store.nodes).toHaveLength(1)
		})
	})
})
