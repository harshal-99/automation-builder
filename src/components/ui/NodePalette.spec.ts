import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NodePalette from './NodePalette.vue'

// Mock node definitions
vi.mock('@/utils/nodeDefinitions', () => ({
  nodesByCategory: {
    trigger: [
      {
        type: 'manual-trigger',
        label: 'Manual Trigger',
        description: 'Start workflow manually',
        category: 'trigger',
        icon: 'play',
      },
      {
        type: 'webhook-trigger',
        label: 'Webhook',
        description: 'Start workflow via HTTP webhook',
        category: 'trigger',
        icon: 'webhook',
      },
    ],
    action: [
      {
        type: 'http-request',
        label: 'HTTP Request',
        description: 'Make an HTTP request',
        category: 'action',
        icon: 'globe',
      },
      {
        type: 'send-email',
        label: 'Send Email',
        description: 'Send an email message',
        category: 'action',
        icon: 'mail',
      },
      {
        type: 'send-sms',
        label: 'Send SMS',
        description: 'Send an SMS message',
        category: 'action',
        icon: 'message',
      },
      {
        type: 'delay',
        label: 'Delay',
        description: 'Wait for a specified time',
        category: 'action',
        icon: 'clock',
      },
    ],
    logic: [
      {
        type: 'condition',
        label: 'Condition',
        description: 'Branch based on a condition',
        category: 'logic',
        icon: 'git-branch',
      },
      {
        type: 'transform',
        label: 'Transform',
        description: 'Transform data fields',
        category: 'logic',
        icon: 'shuffle',
      },
    ],
  },
}))

describe('NodePalette', () => {
  describe('rendering', () => {
    it('renders search input', () => {
      const wrapper = mount(NodePalette)

      const input = wrapper.find('input[type="text"]')
      expect(input.exists()).toBe(true)
      expect(input.attributes('placeholder')).toBe('Search nodes...')
    })

    it('renders all category headers', () => {
      const wrapper = mount(NodePalette)

      expect(wrapper.text()).toContain('Triggers')
      expect(wrapper.text()).toContain('Actions')
      expect(wrapper.text()).toContain('Logic')
    })

    it('renders category icons', () => {
      const wrapper = mount(NodePalette)

      expect(wrapper.text()).toContain('⚡') // Triggers
      expect(wrapper.text()).toContain('⚙️') // Actions
      expect(wrapper.text()).toContain('🔀') // Logic
    })

    it('renders all node items', () => {
      const wrapper = mount(NodePalette)

      expect(wrapper.text()).toContain('Manual Trigger')
      expect(wrapper.text()).toContain('Webhook')
      expect(wrapper.text()).toContain('HTTP Request')
      expect(wrapper.text()).toContain('Send Email')
      expect(wrapper.text()).toContain('Send SMS')
      expect(wrapper.text()).toContain('Delay')
      expect(wrapper.text()).toContain('Condition')
      expect(wrapper.text()).toContain('Transform')
    })

    it('renders node descriptions', () => {
      const wrapper = mount(NodePalette)

      expect(wrapper.text()).toContain('Start workflow manually')
      expect(wrapper.text()).toContain('Make an HTTP request')
    })

    it('displays node count in category headers', () => {
      const wrapper = mount(NodePalette)

      // Find category headers and check counts
      const categoryHeaders = wrapper.findAll('.sticky')
      expect(categoryHeaders.length).toBe(3)

      // Each header should show the count
      const triggerHeader = wrapper.text()
      expect(triggerHeader).toContain('2') // 2 trigger nodes
      expect(triggerHeader).toContain('4') // 4 action nodes
    })

    it('renders node items with draggable attribute', () => {
      const wrapper = mount(NodePalette)

      const nodeItems = wrapper.findAll('[draggable="true"]')
      expect(nodeItems.length).toBe(8) // 2 triggers + 4 actions + 2 logic
    })

    it('renders node icons', () => {
      const wrapper = mount(NodePalette)

      expect(wrapper.text()).toContain('▶️') // manual-trigger
      expect(wrapper.text()).toContain('🔗') // webhook-trigger
      expect(wrapper.text()).toContain('🌐') // http-request
      expect(wrapper.text()).toContain('📧') // send-email
    })
  })

  describe('search/filter functionality', () => {
    it('filters nodes by label', async () => {
      const wrapper = mount(NodePalette)
      const input = wrapper.find('input[type="text"]')

      await input.setValue('email')
      await nextTick()

      expect(wrapper.text()).toContain('Send Email')
      expect(wrapper.text()).not.toContain('HTTP Request')
      expect(wrapper.text()).not.toContain('Manual Trigger')
    })

    it('filters nodes by description', async () => {
      const wrapper = mount(NodePalette)
      const input = wrapper.find('input[type="text"]')

      await input.setValue('HTTP')
      await nextTick()

      expect(wrapper.text()).toContain('HTTP Request')
      expect(wrapper.text()).toContain('Webhook') // Contains "HTTP webhook"
    })

    it('filters nodes by type', async () => {
      const wrapper = mount(NodePalette)
      const input = wrapper.find('input[type="text"]')

      await input.setValue('manual-trigger')
      await nextTick()

      expect(wrapper.text()).toContain('Manual Trigger')
    })

    it('is case insensitive', async () => {
      const wrapper = mount(NodePalette)
      const input = wrapper.find('input[type="text"]')

      await input.setValue('EMAIL')
      await nextTick()

      expect(wrapper.text()).toContain('Send Email')
    })

    it('hides empty categories when filtering', async () => {
      const wrapper = mount(NodePalette)
      const input = wrapper.find('input[type="text"]')

      await input.setValue('email')
      await nextTick()

      // Only Actions category should be visible
      expect(wrapper.text()).toContain('Actions')
      expect(wrapper.text()).not.toContain('Triggers')
      expect(wrapper.text()).not.toContain('Logic')
    })

    it('shows empty state when no results', async () => {
      const wrapper = mount(NodePalette)
      const input = wrapper.find('input[type="text"]')

      await input.setValue('nonexistent-node-xyz')
      await nextTick()

      expect(wrapper.text()).toContain('🔍')
      expect(wrapper.text()).toContain('No nodes found')
      expect(wrapper.text()).toContain('Try a different search term')
    })

    it('shows all nodes when search is cleared', async () => {
      const wrapper = mount(NodePalette)
      const input = wrapper.find('input[type="text"]')

      await input.setValue('email')
      await nextTick()
      expect(wrapper.text()).not.toContain('HTTP Request')

      await input.setValue('')
      await nextTick()
      expect(wrapper.text()).toContain('HTTP Request')
      expect(wrapper.text()).toContain('Send Email')
    })

    it('trims whitespace in search query', async () => {
      const wrapper = mount(NodePalette)
      const input = wrapper.find('input[type="text"]')

      await input.setValue('  email  ')
      await nextTick()

      expect(wrapper.text()).toContain('Send Email')
    })
  })

  describe('drag and drop', () => {
    it('sets drag data on drag start', async () => {
      const wrapper = mount(NodePalette)

      const nodeItem = wrapper.find('[data-node-type="manual-trigger"]')
      expect(nodeItem.exists()).toBe(true)

      const mockDataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      }

      await nodeItem.trigger('dragstart', {
        dataTransfer: mockDataTransfer,
      })

      expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/node-type', 'manual-trigger')
      expect(mockDataTransfer.effectAllowed).toBe('copy')
    })

    it('sets opacity on drag start via native event', async () => {
      const wrapper = mount(NodePalette)

      const nodeItem = wrapper.find('[data-node-type="http-request"]')
      const nodeElement = nodeItem.element as HTMLElement

      // Create a DataTransfer mock
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      }

      // Create and dispatch native drag event
      const dragEvent = new Event('dragstart', { bubbles: true }) as DragEvent
      Object.defineProperty(dragEvent, 'dataTransfer', { value: dataTransfer })

      nodeElement.dispatchEvent(dragEvent)
      await nextTick()

      // Check that opacity was changed on the element
      expect(nodeElement.style.opacity).toBe('0.5')
    })

    it('resets opacity on drag end via native event', async () => {
      const wrapper = mount(NodePalette)

      const nodeItem = wrapper.find('[data-node-type="http-request"]')
      const nodeElement = nodeItem.element as HTMLElement

      // Set initial opacity
      nodeElement.style.opacity = '0.5'

      // Create and dispatch native drag end event
      const dragEvent = new Event('dragend', { bubbles: true })
      nodeElement.dispatchEvent(dragEvent)
      await nextTick()

      // Check that opacity was reset
      expect(nodeElement.style.opacity).toBe('1')
    })

    it('sets correct node type for different nodes', async () => {
      const wrapper = mount(NodePalette)

      const testCases = [
        'manual-trigger',
        'webhook-trigger',
        'http-request',
        'send-email',
        'condition',
        'transform',
      ]

      for (const nodeType of testCases) {
        const nodeItem = wrapper.find(`[data-node-type="${nodeType}"]`)
        expect(nodeItem.exists()).toBe(true)

        const mockDataTransfer = {
          setData: vi.fn(),
          effectAllowed: '',
        }

        await nodeItem.trigger('dragstart', {
          dataTransfer: mockDataTransfer,
        })

        expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/node-type', nodeType)
      }
    })

    it('handles drag start without dataTransfer gracefully', async () => {
      const wrapper = mount(NodePalette)

      const nodeItem = wrapper.find('[data-node-type="manual-trigger"]')

      // Should not throw
      await nodeItem.trigger('dragstart', {
        dataTransfer: null,
      })

      expect(true).toBe(true)
    })

    it('handles drag end gracefully', async () => {
      const wrapper = mount(NodePalette)

      const nodeItem = wrapper.find('[data-node-type="manual-trigger"]')

      // Should not throw
      await nodeItem.trigger('dragend')

      expect(true).toBe(true)
    })
  })

  describe('category visibility', () => {
    it('shows trigger category when it has nodes', () => {
      const wrapper = mount(NodePalette)

      expect(wrapper.text()).toContain('Triggers')
      expect(wrapper.text()).toContain('Manual Trigger')
    })

    it('shows action category when it has nodes', () => {
      const wrapper = mount(NodePalette)

      expect(wrapper.text()).toContain('Actions')
      expect(wrapper.text()).toContain('HTTP Request')
    })

    it('shows logic category when it has nodes', () => {
      const wrapper = mount(NodePalette)

      expect(wrapper.text()).toContain('Logic')
      expect(wrapper.text()).toContain('Condition')
    })

    it('maintains category order: trigger, action, logic', () => {
      const wrapper = mount(NodePalette)
      const text = wrapper.text()

      const triggerIndex = text.indexOf('Triggers')
      const actionIndex = text.indexOf('Actions')
      const logicIndex = text.indexOf('Logic')

      expect(triggerIndex).toBeLessThan(actionIndex)
      expect(actionIndex).toBeLessThan(logicIndex)
    })
  })

  describe('node item styling', () => {
    it('has cursor-move class for draggability indication', () => {
      const wrapper = mount(NodePalette)

      const nodeItem = wrapper.find('[data-node-type="manual-trigger"]')
      expect(nodeItem.classes()).toContain('cursor-move')
    })

    it('has hover styling classes', () => {
      const wrapper = mount(NodePalette)

      const nodeItem = wrapper.find('[data-node-type="manual-trigger"]')
      expect(nodeItem.classes()).toContain('hover:bg-gray-600')
    })
  })
})
