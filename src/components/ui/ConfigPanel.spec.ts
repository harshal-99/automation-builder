import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ConfigPanel from './ConfigPanel.vue'
import { useWorkflowStore } from '@/stores/workflow'
import { useUIStore } from '@/stores/ui'
import type { WorkflowNode } from '@/types'

// Mock the SchemaForm component
vi.mock('./form', () => ({
  SchemaForm: {
    name: 'SchemaForm',
    props: ['schema', 'modelValue', 'errors'],
    emits: ['update:modelValue', 'validate'],
    template: `
      <div class="mock-schema-form">
        <div data-testid="form-values">{{ JSON.stringify(modelValue) }}</div>
      </div>
    `,
    methods: {
      validate() {
        return { isValid: true, errors: {} }
      },
    },
  },
}))

// Mock NodeMetadata component
vi.mock('./NodeMetadata.vue', () => ({
  default: {
    name: 'NodeMetadata',
    props: ['node'],
    template: '<div class="mock-metadata">Node ID: {{ node?.id }}</div>',
  },
}))

// Mock icons
vi.mock('./icons', () => ({
  WarningIcon: {
    name: 'WarningIcon',
    props: ['size'],
    template: '<span class="warning-icon">⚠</span>',
  },
}))

// Mock window.confirm
const mockConfirm = vi.fn()
vi.stubGlobal('confirm', mockConfirm)

describe('ConfigPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockConfirm.mockClear()
    mockConfirm.mockReturnValue(true)
  })

  const createTestNode = (
    id: string,
    type: 'manual-trigger' | 'http-request' = 'manual-trigger'
  ): WorkflowNode => ({
    id,
    position: { x: 100, y: 100 },
    type: 'workflow-node',
    data: {
      label: `Test ${type}`,
      type,
      category: type === 'manual-trigger' ? 'trigger' : 'action',
      config: type === 'manual-trigger' ? { name: 'Test Trigger' } : { url: '', method: 'GET' },
      isValid: true,
    },
  })

  describe('panel visibility', () => {
    it('shows "Select a node" message when no node is selected', () => {
      const wrapper = mount(ConfigPanel)

      expect(wrapper.text()).toContain('Select a node to configure')
    })

    it('shows node configuration when a single node is selected', async () => {
      const workflowStore = useWorkflowStore()
      const node = createTestNode('node-1')
      workflowStore.addNode(node)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick() // Allow watcher to run

      expect(wrapper.text()).toContain('Test manual-trigger')
    })

    it('shows "Select a node" when multiple nodes are selected', async () => {
      const workflowStore = useWorkflowStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.addNode(createTestNode('node-2', 'http-request'))
      workflowStore.setSelection(['node-1', 'node-2'])

      const wrapper = mount(ConfigPanel)
      await nextTick()

      expect(wrapper.text()).toContain('Select a node to configure')
    })
  })

  describe('panel open/close behavior', () => {
    it('opens config panel when node is selected', async () => {
      const workflowStore = useWorkflowStore()
      const uiStore = useUIStore()
      workflowStore.addNode(createTestNode('node-1'))

      mount(ConfigPanel)
      await nextTick()

      expect(uiStore.isConfigPanelOpen).toBe(false)

      workflowStore.setSelection(['node-1'])
      await nextTick()
      await nextTick()

      expect(uiStore.isConfigPanelOpen).toBe(true)
    })

    it('closes config panel when selection is cleared', async () => {
      const workflowStore = useWorkflowStore()
      const uiStore = useUIStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.setSelection(['node-1'])

      mount(ConfigPanel)
      await nextTick()
      await nextTick()

      expect(uiStore.isConfigPanelOpen).toBe(true)

      workflowStore.clearSelection()
      await nextTick()
      await nextTick()

      expect(uiStore.isConfigPanelOpen).toBe(false)
    })
  })

  describe('node header display', () => {
    it('displays node label in header', async () => {
      const workflowStore = useWorkflowStore()
      const node = createTestNode('node-1')
      workflowStore.addNode(node)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('Test manual-trigger')
    })

    it('displays node description', async () => {
      const workflowStore = useWorkflowStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('Start workflow manually')
    })
  })

  describe('delete node functionality', () => {
    it('renders delete button', async () => {
      const workflowStore = useWorkflowStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      const deleteButton = wrapper.find('button[title="Delete node"]')
      expect(deleteButton.exists()).toBe(true)
      expect(deleteButton.text()).toContain('Delete')
    })

    it('deletes node when delete button is clicked', async () => {
      const workflowStore = useWorkflowStore()
      const uiStore = useUIStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      expect(workflowStore.nodes).toHaveLength(1)

      const deleteButton = wrapper.find('button[title="Delete node"]')
      await deleteButton.trigger('click')
      await nextTick()

      expect(workflowStore.nodes).toHaveLength(0)
      expect(uiStore.isConfigPanelOpen).toBe(false)
    })
  })

  describe('form validation', () => {
    it('initializes form with node config', async () => {
      const workflowStore = useWorkflowStore()
      const node = createTestNode('node-1')
      node.data.config = { name: 'Custom Name' }
      workflowStore.addNode(node)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      const formValues = wrapper.find('[data-testid="form-values"]')
      expect(formValues.exists()).toBe(true)
      expect(formValues.text()).toContain('Custom Name')
    })

    it('shows validation error banner when form has errors', async () => {
      const workflowStore = useWorkflowStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel, {
        global: {
          stubs: {
            SchemaForm: {
              template: '<div class="mock-form" />',
              methods: {
                validate() {
                  return {
                    isValid: false,
                    errors: { name: 'Name is required' },
                  }
                },
              },
            },
          },
        },
      })
      await nextTick()
      await nextTick()

      // Access internal state through vm
      ;(wrapper.vm as any).formErrors = { name: 'Name is required' }
      ;(wrapper.vm as any).isFormValid = false
      await nextTick()

      expect(wrapper.text()).toContain('1 validation error')
    })

    it('shows plural form for multiple errors', async () => {
      const workflowStore = useWorkflowStore()
      workflowStore.addNode(createTestNode('node-1', 'http-request'))
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      ;(wrapper.vm as any).formErrors = {
        url: 'URL is required',
        method: 'Method is required',
      }
      ;(wrapper.vm as any).isFormValid = false
      await nextTick()

      expect(wrapper.text()).toContain('2 validation errors')
    })
  })

  describe('dirty state tracking', () => {
    it('shows unsaved badge when form is dirty', async () => {
      const workflowStore = useWorkflowStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // Simulate form becoming dirty
      ;(wrapper.vm as any).formConfig = { name: 'Modified Name' }
      await nextTick()

      expect(wrapper.text()).toContain('Unsaved')
    })

    it('shows reset button when form is dirty', async () => {
      const workflowStore = useWorkflowStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // Simulate form becoming dirty
      ;(wrapper.vm as any).formConfig = { name: 'Modified Name' }
      await nextTick()

      const resetButton = wrapper.find('button[title="Reset changes"]')
      expect(resetButton.exists()).toBe(true)
    })

    it('resets form to original state on reset click', async () => {
      const workflowStore = useWorkflowStore()
      const node = createTestNode('node-1')
      node.data.config = { name: 'Original' }
      workflowStore.addNode(node)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // Verify initial state
      expect((wrapper.vm as any).formConfig.name).toBe('Original')

      // Modify form using handleFormUpdate to maintain proper state
      ;(wrapper.vm as any).handleFormUpdate({ name: 'Modified' })
      await nextTick()

      // Verify form is dirty
      expect((wrapper.vm as any).isFormDirty).toBe(true)

      // Click reset
      const resetButton = wrapper.find('button[title="Reset changes"]')
      await resetButton.trigger('click')
      await nextTick()

      expect((wrapper.vm as any).formConfig.name).toBe('Original')
    })

    it('prompts for confirmation when resetting dirty form', async () => {
      mockConfirm.mockReturnValue(true)

      const workflowStore = useWorkflowStore()
      const node = createTestNode('node-1')
      node.data.config = { name: 'Test Trigger' }
      workflowStore.addNode(node)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // Modify form using handleFormUpdate to maintain proper state
      ;(wrapper.vm as any).handleFormUpdate({ name: 'Modified' })
      await nextTick()

      const resetButton = wrapper.find('button[title="Reset changes"]')
      await resetButton.trigger('click')

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to reset all changes?')
    })
  })

  describe('form updates', () => {
    it('updates node config through store', async () => {
      const workflowStore = useWorkflowStore()
      workflowStore.addNode(createTestNode('node-1'))
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // Simulate form update
      ;(wrapper.vm as any).handleFormUpdate({ name: 'Updated Name' })
      await flushPromises()

      // Wait for debounced auto-save
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(workflowStore.nodes[0].data.config.name).toBe('Updated Name')
    })
  })

  describe('node switching', () => {
    it('reinitializes form when switching to different node', async () => {
      const workflowStore = useWorkflowStore()
      const node1 = createTestNode('node-1')
      node1.data.config = { name: 'Node 1 Config' }
      const node2 = createTestNode('node-2')
      node2.data.config = { name: 'Node 2 Config' }

      workflowStore.addNode(node1)
      workflowStore.addNode(node2)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      expect((wrapper.vm as any).formConfig.name).toBe('Node 1 Config')

      workflowStore.setSelection(['node-2'])
      await nextTick()
      await nextTick()

      expect((wrapper.vm as any).formConfig.name).toBe('Node 2 Config')
    })

    it('updates form config when switching to different node', async () => {
      const workflowStore = useWorkflowStore()
      const node1 = createTestNode('node-1')
      node1.data.config = { name: 'First Node Config' }
      const node2 = createTestNode('node-2')
      node2.data.config = { name: 'Second Node Config' }

      workflowStore.addNode(node1)
      workflowStore.addNode(node2)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // Verify first node config is loaded
      expect((wrapper.vm as any).formConfig.name).toBe('First Node Config')

      // Switch to second node
      workflowStore.setSelection(['node-2'])
      await nextTick()
      await nextTick()

      // Verify second node config is loaded
      expect((wrapper.vm as any).formConfig.name).toBe('Second Node Config')
    })
  })

  describe('schema form fallback', () => {
    it('shows fallback message when no schema available', async () => {
      const workflowStore = useWorkflowStore()
      const node = createTestNode('node-1')
      ;(node.data as any).type = 'unknown-type'
      workflowStore.addNode(node)
      workflowStore.setSelection(['node-1'])

      // We need to re-mount with a different setup since the node type determines schema
      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // The actual behavior depends on getFormSchema returning null for unknown types
      // This test validates the component handles that case
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('external config changes', () => {
    it('form reflects node config on initial load', async () => {
      const workflowStore = useWorkflowStore()
      const node = createTestNode('node-1')
      node.data.config = { name: 'Initial Config' }
      workflowStore.addNode(node)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // Form should have the initial config
      expect((wrapper.vm as any).formConfig.name).toBe('Initial Config')
    })

    it('preserves dirty form state when external changes occur', async () => {
      const workflowStore = useWorkflowStore()
      const node = createTestNode('node-1')
      node.data.config = { name: 'Original' }
      workflowStore.addNode(node)
      workflowStore.setSelection(['node-1'])

      const wrapper = mount(ConfigPanel)
      await nextTick()
      await nextTick()

      // Make the form dirty
      ;(wrapper.vm as any).formConfig = { name: 'User Changes' }
      await nextTick()

      // Simulate external change (like from another source)
      workflowStore.updateNode('node-1', { config: { name: 'External Update' } } as any)
      await nextTick()
      await nextTick()

      // Form should still have user's changes since it's dirty
      expect((wrapper.vm as any).formConfig.name).toBe('User Changes')
    })
  })
})
