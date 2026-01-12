import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type {
  HistoryEntry,
  HistoryActionType,
  WorkflowSnapshot,
} from '@/types'

const MAX_HISTORY_ENTRIES = 50

export const useHistoryStore = defineStore('history', () => {
  // State
  const entries = ref<HistoryEntry[]>([])
  const currentIndex = ref<number>(-1)
  const isBatching = ref<boolean>(false)
  const batchedActions = ref<HistoryActionType[]>([])

  // Getters
  const canUndo = computed(() => currentIndex.value >= 0)
  const canRedo = computed(() => currentIndex.value < entries.value.length - 1)

  const currentEntry = computed(() =>
    currentIndex.value >= 0 ? entries.value[currentIndex.value] : null
  )

  // Helper to get current workflow state (will be set by workflow store)
  let getWorkflowSnapshot: (() => WorkflowSnapshot) | null = null
  let restoreWorkflowSnapshot: ((snapshot: WorkflowSnapshot) => void) | null = null

  function setSnapshotHandlers(
    getSnapshot: () => WorkflowSnapshot,
    restore: (snapshot: WorkflowSnapshot) => void
  ) {
    getWorkflowSnapshot = getSnapshot
    restoreWorkflowSnapshot = restore
  }

  // Actions
  function saveSnapshot(actionType: HistoryActionType, description: string) {
    if (!getWorkflowSnapshot) return

    // If we're in the middle of the history, remove future entries
    if (currentIndex.value < entries.value.length - 1) {
      entries.value = entries.value.slice(0, currentIndex.value + 1)
    }

    const snapshot = getWorkflowSnapshot()

    const entry: HistoryEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actionType,
      description,
      snapshot: JSON.parse(JSON.stringify(snapshot)), // Deep clone
    }

    entries.value.push(entry)

    // Limit history size
    if (entries.value.length > MAX_HISTORY_ENTRIES) {
      entries.value = entries.value.slice(-MAX_HISTORY_ENTRIES)
    }

    currentIndex.value = entries.value.length - 1
  }

  function undo() {
    if (!canUndo.value || !restoreWorkflowSnapshot) return false

    // Move to previous entry and restore its state
    if (currentIndex.value > 0) {
      currentIndex.value--
      const entry = entries.value[currentIndex.value]
      restoreWorkflowSnapshot(entry.snapshot)
      return true
    } else if (currentIndex.value === 0) {
      // At first entry, we need to restore the state before any actions
      // This requires storing an initial snapshot
      currentIndex.value = -1
      // Restore empty/initial state
      restoreWorkflowSnapshot({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      })
      return true
    }

    return false
  }

  function redo() {
    if (!canRedo.value || !restoreWorkflowSnapshot) return false

    currentIndex.value++
    const entry = entries.value[currentIndex.value]
    restoreWorkflowSnapshot(entry.snapshot)
    return true
  }

  function clear() {
    entries.value = []
    currentIndex.value = -1
  }

  // Batching for multi-node operations
  function startBatch() {
    isBatching.value = true
    batchedActions.value = []
  }

  function endBatch(description: string) {
    if (!isBatching.value) return

    isBatching.value = false
    if (batchedActions.value.length > 0) {
      saveSnapshot('BATCH', description)
    }
    batchedActions.value = []
  }

  function cancelBatch() {
    isBatching.value = false
    batchedActions.value = []
  }

  return {
    // State
    entries,
    currentIndex,
    isBatching,

    // Getters
    canUndo,
    canRedo,
    currentEntry,

    // Actions
    setSnapshotHandlers,
    saveSnapshot,
    undo,
    redo,
    clear,
    startBatch,
    endBatch,
    cancelBatch,
  }
})
