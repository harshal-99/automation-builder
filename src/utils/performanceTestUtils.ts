/**
 * Performance testing utilities for workflow automation builder
 * Used to generate large workflows and measure performance metrics
 */

import { v4 as uuidv4 } from 'uuid'
import type { WorkflowNode, WorkflowEdge, NodeType } from '@/types'
import { createNodeData } from '@/utils/nodeDefinitions'

export interface GeneratorOptions {
  nodeCount: number
  edgeRatio?: number // edges per node, default 2
  gridColumns?: number
  nodeSpacing?: number
}

export interface PerformanceMetrics {
  loadTime: number
  renderTime: number | null
  interactionLag: number | null
  memoryUsage: number | null
}

/**
 * Generates a large workflow for performance testing
 * Creates nodes in a grid pattern with edges connecting adjacent nodes
 */
export function generateLargeWorkflow(options: GeneratorOptions): {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
} {
  const {
    nodeCount = 200,
    edgeRatio = 2,
    gridColumns = 10,
    nodeSpacing = 200,
  } = options

  const nodes: WorkflowNode[] = []
  const edges: WorkflowEdge[] = []

  // Available node types (excluding manual-trigger which should only be first)
  const actionNodeTypes: NodeType[] = [
    'http-request',
    'send-email',
    'send-sms',
    'delay',
    'condition',
    'transform',
  ]

  // Generate nodes in a grid pattern
  for (let i = 0; i < nodeCount; i++) {
    const col = i % gridColumns
    const row = Math.floor(i / gridColumns)

    // First node is always a manual trigger
    const nodeType: NodeType =
      i === 0 ? 'manual-trigger' : actionNodeTypes[i % actionNodeTypes.length]

    const nodeId = `perf-node-${i}`
    nodes.push({
      id: nodeId,
      type: 'workflow-node',
      position: { x: col * nodeSpacing, y: row * nodeSpacing },
      data: createNodeData(nodeType),
    })
  }

  // Generate edges connecting nodes
  const targetEdgeCount = Math.min(
    nodeCount * edgeRatio,
    (nodeCount * (nodeCount - 1)) / 2
  )
  const edgeSet = new Set<string>()

  // Connect sequential nodes first (creates a chain)
  for (let i = 0; i < nodeCount - 1 && edges.length < targetEdgeCount; i++) {
    const edgeKey = `${i}-${i + 1}`
    if (!edgeSet.has(edgeKey)) {
      edges.push({
        id: uuidv4(),
        source: `perf-node-${i}`,
        target: `perf-node-${i + 1}`,
        type: 'labeled',
      })
      edgeSet.add(edgeKey)
    }
  }

  // Add more edges to reach target count (connect to nodes within range)
  let attempts = 0
  const maxAttempts = targetEdgeCount * 10

  while (edges.length < targetEdgeCount && attempts < maxAttempts) {
    attempts++
    const sourceIdx = Math.floor(Math.random() * (nodeCount - 1))
    const offset = 1 + Math.floor(Math.random() * Math.min(5, nodeCount - sourceIdx - 1))
    const targetIdx = sourceIdx + offset

    if (targetIdx >= nodeCount) continue

    const edgeKey = `${sourceIdx}-${targetIdx}`
    if (!edgeSet.has(edgeKey)) {
      edges.push({
        id: uuidv4(),
        source: `perf-node-${sourceIdx}`,
        target: `perf-node-${targetIdx}`,
        type: 'labeled',
      })
      edgeSet.add(edgeKey)
    }
  }

  return { nodes, edges }
}

/**
 * Measures basic performance metrics
 * Note: render time and interaction lag require DOM context
 */
export async function measurePerformance(
  operation: () => void | Promise<void>
): Promise<PerformanceMetrics> {
  // Force garbage collection if available (Node.js with --expose-gc)
  if (typeof global !== 'undefined' && (global as unknown as { gc?: () => void }).gc) {
    (global as unknown as { gc: () => void }).gc()
  }

  const startTime = performance.now()

  await operation()

  const loadTime = performance.now() - startTime

  // Memory usage (if available in browser)
  let memoryUsage: number | null = null
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    memoryUsage = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
  }

  return {
    loadTime,
    renderTime: null, // Would need requestAnimationFrame context
    interactionLag: null, // Would need DOM event context
    memoryUsage,
  }
}

/**
 * Formats bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Formats milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
