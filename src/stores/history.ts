import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type {
  HistoryEntry,
  HistoryActionType,
  WorkflowSnapshot,
} from '@/types'
import { updateRef, replaceRef, addArrayItem } from '@/utils/storeHelpers'

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
      updateRef(entries, (draft) => {
        return draft.slice(0, currentIndex.value + 1)
      })
    }

    const snapshot = getWorkflowSnapshot()

    const entry: HistoryEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actionType,
      description,
      snapshot: JSON.parse(JSON.stringify(snapshot)), // Deep clone
    }

    addArrayItem(entries, entry)

    // Limit history size
    updateRef(entries, (draft) => {
      if (draft.length > MAX_HISTORY_ENTRIES) {
        const start = draft.length - MAX_HISTORY_ENTRIES
        return draft.slice(start)
      }
      return draft
    })

    replaceRef(currentIndex, entries.value.length - 1)
  }

  function undo() {
    if (!canUndo.value || !restoreWorkflowSnapshot) return false

    // Move to previous entry and restore its state
    if (currentIndex.value > 0) {
      updateRef(currentIndex, (draft) => draft - 1)
      const entry = entries.value[currentIndex.value]
      restoreWorkflowSnapshot(entry.snapshot)
      return true
    } else if (currentIndex.value === 0) {
      // At first entry, we need to restore the state before any actions
      // This requires storing an initial snapshot
      replaceRef(currentIndex, -1)
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

    updateRef(currentIndex, (draft) => draft + 1)
    const entry = entries.value[currentIndex.value]
    restoreWorkflowSnapshot(entry.snapshot)
    return true
  }

  function clear() {
    replaceRef(entries, [])
    replaceRef(currentIndex, -1)
  }

  // Batching for multi-node operations
  function startBatch() {
    replaceRef(isBatching, true)
    replaceRef(batchedActions, [])
  }

  function endBatch(description: string) {
    if (!isBatching.value) return

    replaceRef(isBatching, false)
    if (batchedActions.value.length > 0) {
      saveSnapshot('BATCH', description)
    }
    replaceRef(batchedActions, [])
  }

  function cancelBatch() {
    replaceRef(isBatching, false)
    replaceRef(batchedActions, [])
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
