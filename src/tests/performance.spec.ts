/**
 * Performance tests for workflow automation builder
 * Tests the system's ability to handle large workflows (200+ nodes, 400+ edges)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkflowStore } from '@/stores/workflow'
import { useHistoryStore } from '@/stores/history'
import {
  generateLargeWorkflow,
  measurePerformance,
  formatDuration,
  formatBytes,
} from '@/utils/performanceTestUtils'

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

describe('Performance Tests', () => {
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

  describe('generateLargeWorkflow', () => {
    it('should generate the correct number of nodes', () => {
      const { nodes } = generateLargeWorkflow({ nodeCount: 50 })
      expect(nodes).toHaveLength(50)
    })

    it('should generate approximately the correct number of edges', () => {
      const { nodes, edges } = generateLargeWorkflow({
        nodeCount: 50,
        edgeRatio: 2,
      })
      expect(nodes).toHaveLength(50)
      // At least nodeCount-1 edges (chain) and up to nodeCount*edgeRatio
      expect(edges.length).toBeGreaterThanOrEqual(49)
      expect(edges.length).toBeLessThanOrEqual(100)
    })

    it('should create unique node IDs', () => {
      const { nodes } = generateLargeWorkflow({ nodeCount: 100 })
      const ids = nodes.map((n) => n.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(100)
    })

    it('should create unique edge IDs', () => {
      const { edges } = generateLargeWorkflow({ nodeCount: 100, edgeRatio: 2 })
      const ids = edges.map((e) => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(edges.length)
    })

    it('should position nodes in a grid', () => {
      const { nodes } = generateLargeWorkflow({
        nodeCount: 20,
        gridColumns: 5,
        nodeSpacing: 100,
      })

      // First row should have x positions 0, 100, 200, 300, 400
      expect(nodes[0].position.x).toBe(0)
      expect(nodes[1].position.x).toBe(100)
      expect(nodes[4].position.x).toBe(400)

      // Second row should start at y=100
      expect(nodes[5].position.y).toBe(100)
      expect(nodes[5].position.x).toBe(0)
    })

    it('should make first node a manual-trigger', () => {
      const { nodes } = generateLargeWorkflow({ nodeCount: 10 })
      expect(nodes[0]?.data?.type).toBe('manual-trigger')
    })
  })

  describe('Store Performance with Large Workflows', () => {
    it('should handle 200 nodes being added', async () => {
      const workflowStore = useWorkflowStore()
      const { nodes } = generateLargeWorkflow({ nodeCount: 200 })

      const metrics = await measurePerformance(() => {
        // Add nodes without history tracking for bulk load
        nodes.forEach((node) => {
          workflowStore.addNode(node)
        })
      })

      expect(workflowStore.nodes).toHaveLength(200)
      // Should complete within 5 seconds
      expect(metrics.loadTime).toBeLessThan(5000)

      console.log(`[Performance] Adding 200 nodes: ${formatDuration(metrics.loadTime)}`)
    })

    it('should handle 200 nodes and 400 edges via loadWorkflow', async () => {
      const workflowStore = useWorkflowStore()
      const { nodes, edges } = generateLargeWorkflow({
        nodeCount: 200,
        edgeRatio: 2,
      })

      const metrics = await measurePerformance(() => {
        workflowStore.loadWorkflow({
          id: 'perf-test',
          name: 'Performance Test Workflow',
          description: 'Large workflow for performance testing',
          nodes,
          edges,
          viewport: { x: 0, y: 0, zoom: 1 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      })

      expect(workflowStore.nodes).toHaveLength(200)
      expect(workflowStore.edges.length).toBeGreaterThanOrEqual(199)
      // Should complete within 2 seconds
      expect(metrics.loadTime).toBeLessThan(2000)

      console.log(`[Performance] Loading 200 nodes + edges: ${formatDuration(metrics.loadTime)}`)
      if (metrics.memoryUsage) {
        console.log(`[Performance] Memory usage: ${formatBytes(metrics.memoryUsage)}`)
      }
    })

    it('should handle node selection in large workflow', async () => {
      const workflowStore = useWorkflowStore()
      const { nodes, edges } = generateLargeWorkflow({ nodeCount: 200 })

      workflowStore.loadWorkflow({
        id: 'perf-test',
        name: 'Performance Test',
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const metrics = await measurePerformance(() => {
        // Select multiple nodes
        workflowStore.setSelection(
          nodes.slice(0, 50).map((n) => n.id),
          []
        )
      })

      expect(workflowStore.selectedNodes).toHaveLength(50)
      // Selection should be nearly instant
      expect(metrics.loadTime).toBeLessThan(100)

      console.log(`[Performance] Selecting 50 nodes: ${formatDuration(metrics.loadTime)}`)
    })

    it('should handle node position updates in large workflow', async () => {
      const workflowStore = useWorkflowStore()
      const { nodes, edges } = generateLargeWorkflow({ nodeCount: 200 })

      workflowStore.loadWorkflow({
        id: 'perf-test',
        name: 'Performance Test',
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const updates = nodes.slice(0, 20).map((n) => ({
        nodeId: n.id,
        position: { x: n.position.x + 10, y: n.position.y + 10 },
      }))

      const metrics = await measurePerformance(() => {
        workflowStore.updateNodePositions(updates)
      })

      // Position updates should be fast
      expect(metrics.loadTime).toBeLessThan(100)

      console.log(`[Performance] Updating 20 node positions: ${formatDuration(metrics.loadTime)}`)
    })

    it('should handle bulk delete in large workflow', async () => {
      const workflowStore = useWorkflowStore()
      const { nodes, edges } = generateLargeWorkflow({ nodeCount: 200 })

      workflowStore.loadWorkflow({
        id: 'perf-test',
        name: 'Performance Test',
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const idsToDelete = nodes.slice(100, 150).map((n) => n.id)

      const metrics = await measurePerformance(() => {
        workflowStore.deleteNodes(idsToDelete)
      })

      expect(workflowStore.nodes).toHaveLength(150)
      // Bulk delete should be reasonably fast
      expect(metrics.loadTime).toBeLessThan(500)

      console.log(`[Performance] Deleting 50 nodes: ${formatDuration(metrics.loadTime)}`)
    })
  })

  describe('Utility Functions', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
      expect(formatBytes(1536)).toBe('1.5 KB')
    })

    it('should format duration correctly', () => {
      expect(formatDuration(50)).toBe('50.00ms')
      expect(formatDuration(999)).toBe('999.00ms')
      expect(formatDuration(1000)).toBe('1.00s')
      expect(formatDuration(2500)).toBe('2.50s')
    })
  })
})
