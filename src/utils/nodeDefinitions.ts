import type { NodeDefinition, NodeType, NodeCategory } from '@/types'

export const nodeDefinitions: Record<NodeType, NodeDefinition> = {
  'manual-trigger': {
    type: 'manual-trigger',
    category: 'trigger',
    label: 'Manual Trigger',
    description: 'Start workflow manually',
    icon: 'play',
    defaultConfig: {
      name: 'Manual Start',
    },
    inputs: 0,
    outputs: 1,
  },
  'webhook-trigger': {
    type: 'webhook-trigger',
    category: 'trigger',
    label: 'Webhook',
    description: 'Start workflow via HTTP webhook',
    icon: 'webhook',
    defaultConfig: {
      url: '',
      method: 'POST',
      headers: {},
    },
    inputs: 0,
    outputs: 1,
  },
  'http-request': {
    type: 'http-request',
    category: 'action',
    label: 'HTTP Request',
    description: 'Make an HTTP request',
    icon: 'globe',
    defaultConfig: {
      url: '',
      method: 'GET',
      headers: {},
      body: '',
      timeout: 30000,
    },
    inputs: 1,
    outputs: 1,
  },
  'send-email': {
    type: 'send-email',
    category: 'action',
    label: 'Send Email',
    description: 'Send an email message',
    icon: 'mail',
    defaultConfig: {
      to: '',
      subject: '',
      body: '',
      cc: '',
    },
    inputs: 1,
    outputs: 1,
  },
  'send-sms': {
    type: 'send-sms',
    category: 'action',
    label: 'Send SMS',
    description: 'Send an SMS message',
    icon: 'message',
    defaultConfig: {
      phoneNumber: '',
      message: '',
    },
    inputs: 1,
    outputs: 1,
  },
  delay: {
    type: 'delay',
    category: 'action',
    label: 'Delay',
    description: 'Wait for a specified time',
    icon: 'clock',
    defaultConfig: {
      duration: 1,
      unit: 'minutes',
    },
    inputs: 1,
    outputs: 1,
  },
  condition: {
    type: 'condition',
    category: 'logic',
    label: 'Condition',
    description: 'Branch based on a condition',
    icon: 'git-branch',
    defaultConfig: {
      field: '',
      operator: 'equals',
      value: '',
    },
    inputs: 1,
    outputs: { true: 1, false: 1 },
  },
  transform: {
    type: 'transform',
    category: 'logic',
    label: 'Transform',
    description: 'Transform data fields',
    icon: 'shuffle',
    defaultConfig: {
      transformations: [],
    },
    inputs: 1,
    outputs: 1,
  },
}

export const nodesByCategory: Record<NodeCategory, NodeDefinition[]> = {
  trigger: Object.values(nodeDefinitions).filter((n) => n.category === 'trigger'),
  action: Object.values(nodeDefinitions).filter((n) => n.category === 'action'),
  logic: Object.values(nodeDefinitions).filter((n) => n.category === 'logic'),
}

export function getNodeDefinition(type: NodeType): NodeDefinition {
  return nodeDefinitions[type]
}

export function createNodeData(type: NodeType) {
  const definition = nodeDefinitions[type]
  return {
    label: definition.label,
    type,
    category: definition.category,
    config: { ...definition.defaultConfig },
    isValid: false,
  }
}
