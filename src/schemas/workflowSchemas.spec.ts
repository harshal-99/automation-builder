import {describe, expect, it} from 'vitest'
import {viewportStateSchema, workflowEdgeSchema, workflowNodeSchema, workflowStateSchema,} from './workflowSchemas'

describe('workflowSchemas', () => {
	describe('viewportStateSchema', () => {
		it('accepts valid viewport state', () => {
			const result = viewportStateSchema.safeParse({
				x: 100,
				y: 200,
				zoom: 1.5,
			})
			expect(result.success).toBe(true)
		})

		it('accepts negative coordinates', () => {
			const result = viewportStateSchema.safeParse({
				x: -100,
				y: -200,
				zoom: 0.5,
			})
			expect(result.success).toBe(true)
		})

		it('accepts zero values', () => {
			const result = viewportStateSchema.safeParse({
				x: 0,
				y: 0,
				zoom: 0,
			})
			expect(result.success).toBe(true)
		})

		it('rejects missing x', () => {
			const result = viewportStateSchema.safeParse({
				y: 200,
				zoom: 1,
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing y', () => {
			const result = viewportStateSchema.safeParse({
				x: 100,
				zoom: 1,
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing zoom', () => {
			const result = viewportStateSchema.safeParse({
				x: 100,
				y: 200,
			})
			expect(result.success).toBe(false)
		})

		it('rejects non-numeric values', () => {
			const result = viewportStateSchema.safeParse({
				x: '100',
				y: 200,
				zoom: 1,
			})
			expect(result.success).toBe(false)
		})
	})

	describe('workflowEdgeSchema', () => {
		it('accepts valid edge with required fields', () => {
			const result = workflowEdgeSchema.safeParse({
				id: 'edge-1',
				source: 'node-1',
				target: 'node-2',
			})
			expect(result.success).toBe(true)
		})

		it('accepts edge with all optional fields', () => {
			const result = workflowEdgeSchema.safeParse({
				id: 'edge-1',
				source: 'node-1',
				target: 'node-2',
				sourceHandle: 'true',
				targetHandle: 'input',
				label: 'Yes',
				type: 'labeled',
				data: {condition: 'true'},
			})
			expect(result.success).toBe(true)
		})

		it('accepts edge with false condition', () => {
			const result = workflowEdgeSchema.safeParse({
				id: 'edge-1',
				source: 'node-1',
				target: 'node-2',
				data: {condition: 'false'},
			})
			expect(result.success).toBe(true)
		})

		it('rejects missing id', () => {
			const result = workflowEdgeSchema.safeParse({
				source: 'node-1',
				target: 'node-2',
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing source', () => {
			const result = workflowEdgeSchema.safeParse({
				id: 'edge-1',
				target: 'node-2',
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing target', () => {
			const result = workflowEdgeSchema.safeParse({
				id: 'edge-1',
				source: 'node-1',
			})
			expect(result.success).toBe(false)
		})

		it('rejects invalid condition value', () => {
			const result = workflowEdgeSchema.safeParse({
				id: 'edge-1',
				source: 'node-1',
				target: 'node-2',
				data: {condition: 'maybe'},
			})
			expect(result.success).toBe(false)
		})
	})

	describe('workflowNodeSchema', () => {
		const validNodeData = {
			label: 'My Node',
			type: 'manual-trigger',
			category: 'trigger',
			config: {name: 'Test'},
			isValid: true,
		}

		it('accepts valid node with required fields', () => {
			const result = workflowNodeSchema.safeParse({
				id: 'node-1',
				position: {x: 100, y: 200},
				data: validNodeData,
			})
			expect(result.success).toBe(true)
		})

		it('accepts node with all optional fields', () => {
			const result = workflowNodeSchema.safeParse({
				id: 'node-1',
				type: 'workflow-node',
				position: {x: 100, y: 200},
				data: validNodeData,
				selected: true,
				dragging: false,
				width: 200,
				height: 100,
			})
			expect(result.success).toBe(true)
		})

		it('accepts all node types', () => {
			const nodeTypes = [
				'manual-trigger',
				'webhook-trigger',
				'http-request',
				'send-email',
				'send-sms',
				'delay',
				'condition',
				'transform',
			]
			nodeTypes.forEach((type) => {
				const result = workflowNodeSchema.safeParse({
					id: 'node-1',
					position: {x: 100, y: 200},
					data: {...validNodeData, type},
				})
				expect(result.success).toBe(true)
			})
		})

		it('accepts all node categories', () => {
			const categories = ['trigger', 'action', 'logic']
			categories.forEach((category) => {
				const result = workflowNodeSchema.safeParse({
					id: 'node-1',
					position: {x: 100, y: 200},
					data: {...validNodeData, category},
				})
				expect(result.success).toBe(true)
			})
		})

		it('rejects missing id', () => {
			const result = workflowNodeSchema.safeParse({
				position: {x: 100, y: 200},
				data: validNodeData,
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing position', () => {
			const result = workflowNodeSchema.safeParse({
				id: 'node-1',
				data: validNodeData,
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing data', () => {
			const result = workflowNodeSchema.safeParse({
				id: 'node-1',
				position: {x: 100, y: 200},
			})
			expect(result.success).toBe(false)
		})

		it('rejects invalid node type', () => {
			const result = workflowNodeSchema.safeParse({
				id: 'node-1',
				position: {x: 100, y: 200},
				data: {...validNodeData, type: 'invalid-type'},
			})
			expect(result.success).toBe(false)
		})

		it('rejects invalid category', () => {
			const result = workflowNodeSchema.safeParse({
				id: 'node-1',
				position: {x: 100, y: 200},
				data: {...validNodeData, category: 'invalid'},
			})
			expect(result.success).toBe(false)
		})
	})

	describe('workflowStateSchema', () => {
		const validWorkflowState = {
			id: 'workflow-1',
			name: 'My Workflow',
			description: 'Test workflow',
			nodes: [],
			edges: [],
			viewport: {x: 0, y: 0, zoom: 1},
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
		}

		it('accepts valid empty workflow', () => {
			const result = workflowStateSchema.safeParse(validWorkflowState)
			expect(result.success).toBe(true)
		})

		it('accepts workflow with nodes and edges', () => {
			const result = workflowStateSchema.safeParse({
				...validWorkflowState,
				nodes: [
					{
						id: 'node-1',
						position: {x: 100, y: 100},
						data: {
							label: 'Start',
							type: 'manual-trigger',
							category: 'trigger',
							config: {name: 'Start'},
							isValid: true,
						},
					},
				],
				edges: [
					{
						id: 'edge-1',
						source: 'node-1',
						target: 'node-2',
					},
				],
			})
			expect(result.success).toBe(true)
		})

		it('accepts workflow without description', () => {
			const {description, ...stateWithoutDescription} = validWorkflowState
			const result = workflowStateSchema.safeParse(stateWithoutDescription)
			expect(result.success).toBe(true)
		})

		it('rejects missing id', () => {
			const {id, ...stateWithoutId} = validWorkflowState
			const result = workflowStateSchema.safeParse(stateWithoutId)
			expect(result.success).toBe(false)
		})

		it('rejects empty name', () => {
			const result = workflowStateSchema.safeParse({
				...validWorkflowState,
				name: '',
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing name', () => {
			const {name, ...stateWithoutName} = validWorkflowState
			const result = workflowStateSchema.safeParse(stateWithoutName)
			expect(result.success).toBe(false)
		})

		it('rejects missing viewport', () => {
			const {viewport, ...stateWithoutViewport} = validWorkflowState
			const result = workflowStateSchema.safeParse(stateWithoutViewport)
			expect(result.success).toBe(false)
		})

		it('rejects missing timestamps', () => {
			const {createdAt, ...stateWithoutCreatedAt} = validWorkflowState
			const result = workflowStateSchema.safeParse(stateWithoutCreatedAt)
			expect(result.success).toBe(false)
		})
	})
})
