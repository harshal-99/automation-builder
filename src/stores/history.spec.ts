import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore } from './history'
import type { WorkflowSnapshot } from '@/types'

describe('historyStore', () => {
  let currentSnapshot: WorkflowSnapshot

  beforeEach(() => {
    setActivePinia(createPinia())

    // Initialize with empty snapshot
    currentSnapshot = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }
  })

  const setupSnapshotHandlers = (store: ReturnType<typeof useHistoryStore>) => {
    store.setSnapshotHandlers(
      () => JSON.parse(JSON.stringify(currentSnapshot)),
      (snapshot) => {
        currentSnapshot = snapshot
      }
    )
  }

  describe('initial state', () => {
    it('has empty entries', () => {
      const store = useHistoryStore()
      expect(store.entries).toEqual([])
    })

    it('has currentIndex of -1', () => {
      const store = useHistoryStore()
      expect(store.currentIndex).toBe(-1)
    })

    it('cannot undo initially', () => {
      const store = useHistoryStore()
      expect(store.canUndo).toBe(false)
    })

    it('cannot redo initially', () => {
      const store = useHistoryStore()
      expect(store.canRedo).toBe(false)
    })

    it('is not batching initially', () => {
      const store = useHistoryStore()
      expect(store.isBatching).toBe(false)
    })
  })

  describe('saveSnapshot', () => {
    it('saves a snapshot to history', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')

      expect(store.entries).toHaveLength(1)
      expect(store.entries[0].actionType).toBe('ADD_NODE')
      expect(store.entries[0].description).toBe('Add node')
    })

    it('updates currentIndex after saving', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')

      expect(store.currentIndex).toBe(0)
    })

    it('saves multiple snapshots', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node 1')
      store.saveSnapshot('ADD_NODE', 'Add node 2')
      store.saveSnapshot('ADD_EDGE', 'Add edge')

      expect(store.entries).toHaveLength(3)
      expect(store.currentIndex).toBe(2)
    })

    it('truncates future entries when saving after undo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node 1')
      store.saveSnapshot('ADD_NODE', 'Add node 2')
      store.saveSnapshot('ADD_NODE', 'Add node 3')
      store.undo() // currentIndex = 1
      store.saveSnapshot('ADD_EDGE', 'Add edge')

      expect(store.entries).toHaveLength(3)
      expect(store.entries[2].actionType).toBe('ADD_EDGE')
    })

    it('does not save snapshot without handlers', () => {
      const store = useHistoryStore()
      // Don't setup handlers

      store.saveSnapshot('ADD_NODE', 'Add node')

      expect(store.entries).toHaveLength(0)
    })

    it('limits history size to 50 entries', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      // Add 60 entries
      for (let i = 0; i < 60; i++) {
        store.saveSnapshot('ADD_NODE', `Add node ${i}`)
      }

      expect(store.entries).toHaveLength(50)
      // First entry should be from the 11th save
      expect(store.entries[0].description).toBe('Add node 10')
    })
  })

  describe('undo', () => {
    it('can undo after saving', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')

      expect(store.canUndo).toBe(true)
    })

    it('decrements currentIndex on undo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node 1')
      store.saveSnapshot('ADD_NODE', 'Add node 2')
      store.undo()

      expect(store.currentIndex).toBe(0)
    })

    it('restores previous state on undo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      // Save state with a node
      currentSnapshot = {
        nodes: [{ id: 'node-1' }] as any,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }
      store.saveSnapshot('ADD_NODE', 'Add node 1')

      // Update snapshot
      currentSnapshot = {
        nodes: [{ id: 'node-1' }, { id: 'node-2' }] as any,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }
      store.saveSnapshot('ADD_NODE', 'Add node 2')

      store.undo()

      // Should restore to state with only node-1
      expect(currentSnapshot.nodes).toHaveLength(1)
      expect((currentSnapshot.nodes[0] as any).id).toBe('node-1')
    })

    it('returns to empty state when undoing first action', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      currentSnapshot = {
        nodes: [{ id: 'node-1' }] as any,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }
      store.saveSnapshot('ADD_NODE', 'Add node')
      store.undo()

      expect(currentSnapshot.nodes).toHaveLength(0)
      expect(store.currentIndex).toBe(-1)
    })

    it('returns true on successful undo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')
      const result = store.undo()

      expect(result).toBe(true)
    })

    it('returns false when cannot undo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      const result = store.undo()

      expect(result).toBe(false)
    })
  })

  describe('redo', () => {
    it('can redo after undo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')
      store.undo()

      expect(store.canRedo).toBe(true)
    })

    it('cannot redo without previous undo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')

      expect(store.canRedo).toBe(false)
    })

    it('increments currentIndex on redo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node 1')
      store.saveSnapshot('ADD_NODE', 'Add node 2')
      store.undo()
      store.redo()

      expect(store.currentIndex).toBe(1)
    })

    it('restores next state on redo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      currentSnapshot = {
        nodes: [{ id: 'node-1' }] as any,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }
      store.saveSnapshot('ADD_NODE', 'Add node 1')

      currentSnapshot = {
        nodes: [{ id: 'node-1' }, { id: 'node-2' }] as any,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }
      store.saveSnapshot('ADD_NODE', 'Add node 2')

      store.undo()
      store.redo()

      expect(currentSnapshot.nodes).toHaveLength(2)
    })

    it('returns true on successful redo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')
      store.undo()
      const result = store.redo()

      expect(result).toBe(true)
    })

    it('returns false when cannot redo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')
      const result = store.redo()

      expect(result).toBe(false)
    })
  })

  describe('clear', () => {
    it('clears all entries', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node 1')
      store.saveSnapshot('ADD_NODE', 'Add node 2')
      store.clear()

      expect(store.entries).toHaveLength(0)
    })

    it('resets currentIndex to -1', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')
      store.clear()

      expect(store.currentIndex).toBe(-1)
    })

    it('cannot undo or redo after clear', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')
      store.clear()

      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(false)
    })
  })

  describe('batching', () => {
    it('starts batching', () => {
      const store = useHistoryStore()

      store.startBatch()

      expect(store.isBatching).toBe(true)
    })

    it('ends batching and saves snapshot', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.startBatch()
      store.endBatch('Batch operation')

      expect(store.isBatching).toBe(false)
      expect(store.entries).toHaveLength(1)
      expect(store.entries[0].actionType).toBe('BATCH')
    })

    it('cancels batching without saving', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.startBatch()
      store.cancelBatch()

      expect(store.isBatching).toBe(false)
      expect(store.entries).toHaveLength(0)
    })

    it('endBatch does nothing if not batching', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.endBatch('Should not save')

      expect(store.entries).toHaveLength(0)
    })
  })

  describe('currentEntry', () => {
    it('returns null when no entries', () => {
      const store = useHistoryStore()

      expect(store.currentEntry).toBeNull()
    })

    it('returns current entry', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')

      expect(store.currentEntry?.actionType).toBe('ADD_NODE')
    })

    it('returns correct entry after undo', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node 1')
      store.saveSnapshot('ADD_EDGE', 'Add edge')
      store.undo()

      expect(store.currentEntry?.actionType).toBe('ADD_NODE')
    })

    it('returns null after undoing all actions', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      store.saveSnapshot('ADD_NODE', 'Add node')
      store.undo()

      expect(store.currentEntry).toBeNull()
    })
  })

  describe('undo/redo sequence', () => {
    it('handles multiple undo/redo operations', () => {
      const store = useHistoryStore()
      setupSnapshotHandlers(store)

      // Build up state
      currentSnapshot = { nodes: [{ id: '1' }] as any, edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
      store.saveSnapshot('ADD_NODE', 'Add 1')

      currentSnapshot = { nodes: [{ id: '1' }, { id: '2' }] as any, edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
      store.saveSnapshot('ADD_NODE', 'Add 2')

      currentSnapshot = { nodes: [{ id: '1' }, { id: '2' }, { id: '3' }] as any, edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
      store.saveSnapshot('ADD_NODE', 'Add 3')

      // Undo twice
      store.undo()
      expect(currentSnapshot.nodes).toHaveLength(2)

      store.undo()
      expect(currentSnapshot.nodes).toHaveLength(1)

      // Redo once
      store.redo()
      expect(currentSnapshot.nodes).toHaveLength(2)

      // Undo again
      store.undo()
      expect(currentSnapshot.nodes).toHaveLength(1)

      // Redo twice
      store.redo()
      store.redo()
      expect(currentSnapshot.nodes).toHaveLength(3)
    })
  })
})
