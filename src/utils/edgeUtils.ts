import type { Connection } from '@vue-flow/core'
import type { WorkflowNode, WorkflowEdge, NodeType } from '@/types'
import { getNodeDefinition } from './nodeDefinitions'

/**
 * Edge validation result
 */
export interface ValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Validates a connection between two nodes
 * @param connection The connection to validate
 * @param nodes All nodes in the workflow
 * @param edges All edges in the workflow
 * @returns ValidationResult indicating if the connection is valid
 */
export function validateConnection(
  connection: Connection,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationResult {
  const { source, target, sourceHandle, targetHandle } = connection

  // Must have source and target
  if (!source || !target) {
    return { valid: false, reason: 'Connection must have source and target' }
  }

  // Cannot connect to self
  if (source === target) {
    return { valid: false, reason: 'Cannot connect a node to itself' }
  }

  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)

  if (!sourceNode || !targetNode) {
    return { valid: false, reason: 'Source or target node not found' }
  }

  // Ensure node data exists
  if (!sourceNode.data || !targetNode.data) {
    return { valid: false, reason: 'Node data not found' }
  }

  // Trigger nodes cannot have incoming connections
  const targetDef = getNodeDefinition(targetNode.data.type)
  if (targetDef.inputs === 0) {
    return { valid: false, reason: 'Trigger nodes cannot have incoming connections' }
  }

  // Source node must have outputs
  const sourceDef = getNodeDefinition(sourceNode.data.type)
  const sourceOutputs = sourceDef.outputs
  if (typeof sourceOutputs === 'number' && sourceOutputs === 0) {
    return { valid: false, reason: 'Source node has no outputs' }
  }

  // Check for duplicate connections (same source + target + handles)
  const isDuplicate = edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      e.sourceHandle === (sourceHandle ?? undefined) &&
      e.targetHandle === (targetHandle ?? undefined)
  )
  if (isDuplicate) {
    return { valid: false, reason: 'Connection already exists' }
  }

  // Check if target handle already has a connection (single input rule)
  // Most nodes only have one input, so we prevent multiple connections to the same target
  const targetHasConnection = edges.some(
    (e) => e.target === target && e.targetHandle === (targetHandle ?? undefined)
  )
  if (targetHasConnection) {
    return { valid: false, reason: 'Target already has an incoming connection' }
  }

  // Validate source handle exists on source node
  if (sourceHandle) {
    const validSourceHandles = getValidSourceHandles(sourceNode.data.type)
    if (!validSourceHandles.includes(sourceHandle)) {
      return { valid: false, reason: 'Invalid source handle' }
    }
  }

  return { valid: true }
}

/**
 * Get valid source handle IDs for a node type
 */
export function getValidSourceHandles(nodeType: NodeType): string[] {
  const def = getNodeDefinition(nodeType)
  const outputs = def.outputs

  if (typeof outputs === 'number') {
    return outputs > 0 ? ['output'] : []
  }

  // For condition nodes with multiple outputs
  return Object.keys(outputs)
}

/**
 * Get valid target handle IDs for a node type
 */
export function getValidTargetHandles(nodeType: NodeType): string[] {
  const def = getNodeDefinition(nodeType)
  return def.inputs > 0 ? ['input'] : []
}

/**
 * Creates an edge with automatic label assignment based on source handle
 * Adds labels for conditional branches (true/false)
 */
export function createEdgeWithLabel(
  connection: Connection,
  nodes: WorkflowNode[]
): Omit<WorkflowEdge, 'id'> {
  const sourceNode = nodes.find((n) => n.id === connection.source)

  let label: string | undefined
  let edgeData: WorkflowEdge['data']

  // Add label for condition node branches
  if (sourceNode?.data?.type === 'condition' && connection.sourceHandle) {
    if (connection.sourceHandle === 'true') {
      label = 'Yes'
      edgeData = { condition: 'true' }
    } else if (connection.sourceHandle === 'false') {
      label = 'No'
      edgeData = { condition: 'false' }
    }
  }

  return {
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined,
    label,
    type: 'labeled', // Use custom labeled edge type
    data: edgeData,
  }
}

/**
 * Checks if adding a connection would create a cycle in the graph
 * Uses DFS to detect cycles
 */
export function wouldCreateCycle(
  connection: Connection,
  edges: WorkflowEdge[]
): boolean {
  if (!connection.source || !connection.target) return false

  // If target is the same as source, it's definitely a cycle
  if (connection.source === connection.target) return true

  // Build adjacency list from existing edges
  const adjacencyList = new Map<string, string[]>()

  edges.forEach((edge) => {
    const targets = adjacencyList.get(edge.source) || []
    targets.push(edge.target)
    adjacencyList.set(edge.source, targets)
  })

  // Add the new connection temporarily
  const targetNeighbors = adjacencyList.get(connection.source) || []
  targetNeighbors.push(connection.target)
  adjacencyList.set(connection.source, targetNeighbors)

  // DFS to check if we can reach source from target (which would indicate a cycle)
  const visited = new Set<string>()
  const stack = [connection.target]

  while (stack.length > 0) {
    const current = stack.pop()!

    if (current === connection.source) {
      return true // Found a cycle
    }

    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = adjacencyList.get(current) || []
    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        stack.push(neighbor)
      }
    })
  }

  return false
}

/**
 * Get edges connected to a specific node
 */
export function getNodeEdges(
  nodeId: string,
  edges: WorkflowEdge[]
): { incoming: WorkflowEdge[]; outgoing: WorkflowEdge[] } {
  return {
    incoming: edges.filter((e) => e.target === nodeId),
    outgoing: edges.filter((e) => e.source === nodeId),
  }
}

/**
 * Get the edge label style based on condition
 * Uses CSS custom properties defined in main.css
 */
export function getEdgeLabelStyle(condition?: 'true' | 'false'): {
  backgroundColor: string
  color: string
} {
  if (condition === 'true') {
    return {
      backgroundColor: 'var(--color-label-true-bg)',
      color: 'var(--color-label-true-text)',
    }
  }
  if (condition === 'false') {
    return {
      backgroundColor: 'var(--color-label-false-bg)',
      color: 'var(--color-label-false-text)',
    }
  }
  return {
    backgroundColor: 'var(--color-label-bg)',
    color: 'var(--color-label-text)',
  }
}
