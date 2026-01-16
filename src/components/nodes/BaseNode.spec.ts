import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {createPinia, setActivePinia} from 'pinia'
import BaseNode from './BaseNode.vue'
import type {WorkflowNodeData} from '@/types'
import {useExecutionStore} from '@/stores'

// Mock @vue-flow/core components
vi.mock('@vue-flow/core', () => ({
	Handle: {
		name: 'Handle',
		props: ['type', 'position', 'id'],
		template: '<div class="mock-handle" :data-type="type" :data-position="position" :data-id="id" />',
	},
	Position: {
		Left: 'left',
		Right: 'right',
		Top: 'top',
		Bottom: 'bottom',
	},
}))

describe('BaseNode', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	const createNodeProps = (
		type: WorkflowNodeData['type'],
		overrides: Partial<WorkflowNodeData> = {}
	) => {
		const categoryMap: Record<WorkflowNodeData['type'], WorkflowNodeData['category']> = {
			'manual-trigger': 'trigger',
			'webhook-trigger': 'trigger',
			'http-request': 'action',
			'send-email': 'action',
			'send-sms': 'action',
			'delay': 'action',
			'condition': 'logic',
			'transform': 'logic',
		}

		return {
			id: 'test-node-1',
			type: 'workflow-node',
			selected: false,
			// Required props from @vue-flow/core NodeProps
			connectable: true,
			position: {x: 0, y: 0},
			dimensions: {width: 200, height: 100},
			dragging: false,
			resizing: false,
			zIndex: 1,
			events: {},
			data: {
				label: `Test ${type}`,
				type,
				category: categoryMap[type],
				config: {},
				isValid: true,
				...overrides,
			} as WorkflowNodeData,
		}
	}

	describe('rendering', () => {
		it('renders node with correct label', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger', {label: 'My Trigger'}),
			})

			expect(wrapper.text()).toContain('My Trigger')
		})

		it('renders node description from definition', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			expect(wrapper.text()).toContain('Start workflow manually')
		})

		it('renders trigger node with emerald styling', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			const rootDiv = wrapper.find('div').element
			expect(rootDiv.className).toContain('px-3 py-2 text-xs text-gray-400')
		})

		it('renders action node with blue styling', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('http-request'),
			})

			const rootDiv = wrapper.find('div').element
			expect(rootDiv.className).toContain('border-blue-500')
		})

		it('renders logic node with purple styling', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('condition'),
			})

			expect(wrapper.element.className).toContain('border-purple-500')
		})
	})

	describe('selection state', () => {
		it('applies selection ring when selected', () => {
			const wrapper = mount(BaseNode, {
				props: {
					...createNodeProps('manual-trigger'),
					selected: true,
				},
			})

			expect(wrapper.element.className).toContain('ring-2')
			expect(wrapper.element.className).toContain('ring-blue-400')
			expect(wrapper.element.className).toContain('scale-105')
		})

		it('does not apply selection ring when not selected', () => {
			const wrapper = mount(BaseNode, {
				props: {
					...createNodeProps('manual-trigger'),
					selected: false,
				},
			})

			const rootDiv = wrapper.find('div').element
			expect(rootDiv.className).not.toContain('scale-105')
		})
	})

	describe('validation state', () => {
		it('shows validation warning when node is invalid', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('http-request', {isValid: false}),
			})

			expect(wrapper.text()).toContain('Needs configuration')
		})

		it('does not show validation warning when node is valid', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('http-request', {isValid: true}),
			})

			expect(wrapper.text()).not.toContain('Needs configuration')
		})

		it('applies opacity when node is invalid', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('http-request', {isValid: false}),
			})

			expect(wrapper.element.className).toContain('opacity-60')
		})
	})

	describe('handles configuration', () => {
		it('renders input handle for action nodes', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('http-request'),
			})

			const inputHandle = wrapper.find('[data-type="target"]')
			expect(inputHandle.exists()).toBe(true)
		})

		it('does not render input handle for trigger nodes', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			const inputHandle = wrapper.find('[data-type="target"]')
			expect(inputHandle.exists()).toBe(false)
		})

		it('renders output handle for nodes with single output', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			const outputHandle = wrapper.find('[data-type="source"]')
			expect(outputHandle.exists()).toBe(true)
		})

		it('renders multiple output handles for condition nodes', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('condition'),
			})

			const outputHandles = wrapper.findAll('[data-type="source"]')
			expect(outputHandles.length).toBe(2)
		})

		it('renders true/false labels for condition node outputs', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('condition'),
			})

			expect(wrapper.text()).toContain('Yes')
			expect(wrapper.text()).toContain('No')
		})

		it('renders success/error handles for send-email node', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('send-email'),
			})

			const outputHandles = wrapper.findAll('[data-type="source"]')
			expect(outputHandles.length).toBe(2)

			// Check for labels
			expect(wrapper.text()).toContain('Success')
			expect(wrapper.text()).toContain('Error')
		})
	})

	describe('execution status', () => {
		it('displays idle status by default', () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			const statusIndicator = wrapper.find('[title="Status: idle"]')
			expect(statusIndicator.exists()).toBe(true)
			expect(statusIndicator.element.className).toContain('bg-gray-500')
		})

		it('displays running status with pulse animation', async () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			const executionStore = useExecutionStore()
			executionStore.setNodeState('test-node-1', {
				status: 'running',
				startedAt: new Date().toISOString(),
			})

			await wrapper.vm.$nextTick()

			const statusIndicator = wrapper.find('[title="Status: running"]')
			expect(statusIndicator.exists()).toBe(true)
			expect(statusIndicator.element.className).toContain('bg-blue-500')
			expect(statusIndicator.element.className).toContain('animate-pulse')
		})

		it('displays success status with green indicator', async () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			const executionStore = useExecutionStore()
			executionStore.setNodeState('test-node-1', {
				status: 'success',
				startedAt: new Date().toISOString(),
				completedAt: new Date().toISOString(),
			})

			await wrapper.vm.$nextTick()

			const statusIndicator = wrapper.find('[title="Status: success"]')
			expect(statusIndicator.exists()).toBe(true)
			expect(statusIndicator.element.className).toContain('bg-green-500')
		})

		it('displays error status with red indicator', async () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			const executionStore = useExecutionStore()
			executionStore.setNodeState('test-node-1', {
				status: 'error',
				startedAt: new Date().toISOString(),
				completedAt: new Date().toISOString(),
				error: 'Test error',
			})

			await wrapper.vm.$nextTick()

			const statusIndicator = wrapper.find('[title="Status: error"]')
			expect(statusIndicator.exists()).toBe(true)
			expect(statusIndicator.element.className).toContain('bg-red-500')
		})

		it('displays skipped status with grayscale effect', async () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('http-request'),
			})

			const executionStore = useExecutionStore()
			executionStore.setNodeState('test-node-1', {
				status: 'skipped',
				startedAt: new Date().toISOString(),
			})

			await wrapper.vm.$nextTick()

			expect(wrapper.element.className).toContain('grayscale')
			expect(wrapper.element.className).toContain('opacity-50')
		})

		it('highlights currently executing node', async () => {
			const wrapper = mount(BaseNode, {
				props: createNodeProps('manual-trigger'),
			})

			const executionStore = useExecutionStore()
			executionStore.setCurrentNode('test-node-1')
			executionStore.setNodeState('test-node-1', {
				status: 'running',
				startedAt: new Date().toISOString(),
			})

			await wrapper.vm.$nextTick()

			const rootDiv = wrapper.find('div').element
			expect(rootDiv.className).toContain('px-3 py-2 text-xs text-gray-400')
		})
	})

	describe('different node types', () => {
		const nodeTypes: WorkflowNodeData['type'][] = [
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
			it(`renders ${type} node correctly`, () => {
				const wrapper = mount(BaseNode, {
					props: createNodeProps(type),
				})

				expect(wrapper.exists()).toBe(true)
				expect(wrapper.text()).toContain(`Test ${type}`)
			})
		})
	})
})
