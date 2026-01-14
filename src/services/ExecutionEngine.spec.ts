import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'
import {ExecutionEngine} from './ExecutionEngine'
import {useWorkflowStore} from '@/stores/workflow'
import {useHistoryStore} from '@/stores/history'
import type {WorkflowEdge, WorkflowNode} from '@/types'

// Mock the persistence service
vi.mock('@/utils/persistence', () => ({
	PersistenceService: {
		saveWorkflow: vi.fn(),
		loadWorkflow: vi.fn(),
		exportWorkflow: vi.fn(),
		importWorkflow: vi.fn(),
	},
}))

// Mock useDebounceFn
vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core')
	return {
		...actual,
		useDebounceFn: (fn: Function) => fn,
	}
})

describe('ExecutionEngine', () => {
	let engine: ExecutionEngine

	beforeEach(() => {
		setActivePinia(createPinia())

		// Initialize stores
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

		engine = new ExecutionEngine()
	})

	const createNode = (
		id: string,
		type: 'manual-trigger' | 'http-request' | 'condition' | 'delay' | 'transform' = 'http-request'
	): Omit<WorkflowNode, 'id'> & { id: string } => ({
		id,
		position: {x: 0, y: 0},
		data: {
			label: `Node ${id}`,
			type,
			category: type === 'manual-trigger' ? 'trigger' : type === 'condition' || type === 'transform' ? 'logic' : 'action',
			config: getDefaultConfig(type),
			isValid: true,
		} as WorkflowNode['data'],
	})

	const getDefaultConfig = (type: string) => {
		switch (type) {
			case 'manual-trigger':
				return {name: 'Test'}
			case 'http-request':
				return {url: 'https://example.com', method: 'GET'}
			case 'condition':
				return {expression: 'status', operator: 'equals', value: 'active'}
			case 'delay':
				return {duration: 1, unit: 'seconds'}
			case 'transform':
				return {transformations: []}
			default:
				return {}
		}
	}

	const setupWorkflow = (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
		const workflowStore = useWorkflowStore()
		nodes.forEach((node) => workflowStore.addNode(node))
		edges.forEach((edge) => workflowStore.addEdge(edge))
		engine.initialize()
	}

	describe('topologicalSort', () => {
		it('returns empty array for empty workflow', () => {
			engine.initialize()
			const order = engine.getExecutionOrder()
			expect(order).toEqual([])
		})

		it('returns single node for workflow with one node', () => {
			setupWorkflow(
				[createNode('node-1', 'manual-trigger')],
				[]
			)

			const order = engine.getExecutionOrder()

			expect(order).toEqual(['node-1'])
		})

		it('returns correct order for linear workflow', () => {
			// node-1 -> node-2 -> node-3
			setupWorkflow(
				[
					createNode('node-1', 'manual-trigger'),
					createNode('node-2', 'http-request'),
					createNode('node-3', 'delay'),
				],
				[
					{id: 'edge-1', source: 'node-1', target: 'node-2'},
					{id: 'edge-2', source: 'node-2', target: 'node-3'},
				]
			)

			const order = engine.getExecutionOrder()

			expect(order).toEqual(['node-1', 'node-2', 'node-3'])
		})

		it('returns correct order for branching workflow', () => {
			// node-1 (trigger) -> node-2 (condition)
			//                      |-> node-3 (true branch)
			//                      |-> node-4 (false branch)
			setupWorkflow(
				[
					createNode('node-1', 'manual-trigger'),
					createNode('node-2', 'condition'),
					createNode('node-3', 'http-request'),
					createNode('node-4', 'delay'),
				],
				[
					{id: 'edge-1', source: 'node-1', target: 'node-2'},
					{id: 'edge-2', source: 'node-2', target: 'node-3', sourceHandle: 'true'},
					{id: 'edge-3', source: 'node-2', target: 'node-4', sourceHandle: 'false'},
				]
			)

			const order = engine.getExecutionOrder()

			// node-1 must come first
			expect(order[0]).toBe('node-1')
			// node-2 must come second (depends on node-1)
			expect(order[1]).toBe('node-2')
			// node-3 and node-4 can come in any order after node-2
			expect(order.slice(2).sort()).toEqual(['node-3', 'node-4'])
		})

		it('returns correct order for diamond workflow', () => {
			//         node-1
			//        /      \
			//    node-2    node-3
			//        \      /
			//         node-4
			setupWorkflow(
				[
					createNode('node-1', 'manual-trigger'),
					createNode('node-2', 'http-request'),
					createNode('node-3', 'delay'),
					createNode('node-4', 'transform'),
				],
				[
					{id: 'edge-1', source: 'node-1', target: 'node-2'},
					{id: 'edge-2', source: 'node-1', target: 'node-3'},
					{id: 'edge-3', source: 'node-2', target: 'node-4'},
					{id: 'edge-4', source: 'node-3', target: 'node-4'},
				]
			)

			const order = engine.getExecutionOrder()

			// node-1 must come first
			expect(order[0]).toBe('node-1')
			// node-4 must come last (depends on both node-2 and node-3)
			expect(order[3]).toBe('node-4')
			// node-2 and node-3 must come before node-4
			expect(order.indexOf('node-2')).toBeLessThan(order.indexOf('node-4'))
			expect(order.indexOf('node-3')).toBeLessThan(order.indexOf('node-4'))
		})

		it('handles multiple trigger nodes', () => {
			setupWorkflow(
				[
					createNode('trigger-1', 'manual-trigger'),
					createNode('trigger-2', 'manual-trigger'),
					createNode('node-3', 'http-request'),
				],
				[
					{id: 'edge-1', source: 'trigger-1', target: 'node-3'},
				]
			)

			const order = engine.getExecutionOrder()

			// Both triggers should be at the beginning (no incoming edges)
			expect(order).toHaveLength(3)
			// node-3 must come after trigger-1
			expect(order.indexOf('node-3')).toBeGreaterThan(order.indexOf('trigger-1'))
		})

		it('handles disconnected subgraphs', () => {
			// Two separate workflows: trigger-1 -> node-2, trigger-3 -> node-4
			setupWorkflow(
				[
					createNode('trigger-1', 'manual-trigger'),
					createNode('node-2', 'http-request'),
					createNode('trigger-3', 'manual-trigger'),
					createNode('node-4', 'delay'),
				],
				[
					{id: 'edge-1', source: 'trigger-1', target: 'node-2'},
					{id: 'edge-2', source: 'trigger-3', target: 'node-4'},
				]
			)

			const order = engine.getExecutionOrder()

			expect(order).toHaveLength(4)
			// Each node depends on its trigger
			expect(order.indexOf('node-2')).toBeGreaterThan(order.indexOf('trigger-1'))
			expect(order.indexOf('node-4')).toBeGreaterThan(order.indexOf('trigger-3'))
		})

		it('handles complex workflow with multiple paths', () => {
			//         trigger
			//            |
			//        condition
			//        /       \
			//    action1   action2
			//        \       /
			//        transform
			//            |
			//          delay
			setupWorkflow(
				[
					createNode('trigger', 'manual-trigger'),
					createNode('condition', 'condition'),
					createNode('action1', 'http-request'),
					createNode('action2', 'http-request'),
					createNode('transform', 'transform'),
					createNode('delay', 'delay'),
				],
				[
					{id: 'e1', source: 'trigger', target: 'condition'},
					{id: 'e2', source: 'condition', target: 'action1', sourceHandle: 'true'},
					{id: 'e3', source: 'condition', target: 'action2', sourceHandle: 'false'},
					{id: 'e4', source: 'action1', target: 'transform'},
					{id: 'e5', source: 'action2', target: 'transform'},
					{id: 'e6', source: 'transform', target: 'delay'},
				]
			)

			const order = engine.getExecutionOrder()

			expect(order).toHaveLength(6)
			// Verify ordering constraints
			expect(order.indexOf('trigger')).toBe(0)
			expect(order.indexOf('condition')).toBeLessThan(order.indexOf('action1'))
			expect(order.indexOf('condition')).toBeLessThan(order.indexOf('action2'))
			expect(order.indexOf('action1')).toBeLessThan(order.indexOf('transform'))
			expect(order.indexOf('action2')).toBeLessThan(order.indexOf('transform'))
			expect(order.indexOf('transform')).toBeLessThan(order.indexOf('delay'))
		})

		it('detects cycles and returns partial order', () => {
			// This should not happen in practice due to validation, but testing defensive code
			const workflowStore = useWorkflowStore()

			// Manually create nodes (bypassing validation)
			workflowStore.addNode(createNode('node-1', 'manual-trigger'))
			workflowStore.addNode(createNode('node-2', 'http-request'))
			workflowStore.addNode(createNode('node-3', 'delay'))

			// Create a cycle: 1 -> 2 -> 3 -> 2
			workflowStore.addEdge({id: 'e1', source: 'node-1', target: 'node-2'})
			workflowStore.addEdge({id: 'e2', source: 'node-2', target: 'node-3'})
			workflowStore.addEdge({id: 'e3', source: 'node-3', target: 'node-2'})

			engine.initialize()
			const order = engine.getExecutionOrder()

			// With a cycle, not all nodes can be included
			// Only node-1 has no incoming edges, so only it will be in the result
			expect(order.length).toBeLessThan(3)
		})
	})

	describe('initialize', () => {
		it('resets engine state', () => {
			setupWorkflow(
				[createNode('node-1', 'manual-trigger')],
				[]
			)

			// Reinitialize should reset
			engine.initialize()

			const order = engine.getExecutionOrder()
			expect(order).toHaveLength(1)
		})

		it('copies nodes and edges from workflow store', () => {
			const workflowStore = useWorkflowStore()
			workflowStore.addNode(createNode('node-1', 'manual-trigger'))
			workflowStore.addNode(createNode('node-2', 'http-request'))
			workflowStore.addEdge({id: 'edge-1', source: 'node-1', target: 'node-2'})

			engine.initialize()

			const order = engine.getExecutionOrder()
			expect(order).toEqual(['node-1', 'node-2'])
		})
	})

	describe('execution order correctness', () => {
		it('ensures all dependencies are satisfied in order', () => {
			// Create a workflow where order matters
			setupWorkflow(
				[
					createNode('a', 'manual-trigger'),
					createNode('b', 'http-request'),
					createNode('c', 'http-request'),
					createNode('d', 'http-request'),
					createNode('e', 'transform'),
				],
				[
					{id: 'e1', source: 'a', target: 'b'},
					{id: 'e2', source: 'a', target: 'c'},
					{id: 'e3', source: 'b', target: 'd'},
					{id: 'e4', source: 'c', target: 'd'},
					{id: 'e5', source: 'd', target: 'e'},
				]
			)

			const order = engine.getExecutionOrder()
			const workflowStore = useWorkflowStore()

			// Verify that for every edge, source comes before target
			workflowStore.edges.forEach((edge) => {
				const sourceIndex = order.indexOf(edge.source)
				const targetIndex = order.indexOf(edge.target)
				expect(sourceIndex).toBeLessThan(targetIndex)
			})
		})
	})
})
