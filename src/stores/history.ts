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
  /**
   * Save a snapshot of the current workflow state to history
   * 
   * Important: If we're in the middle of history (user has undone some actions),
   * we discard all future entries. This prevents branching - you can't redo
   * after performing a new action.
   * 
   * Example:
   *   History: [A, B, C] (index: 2, at C)
   *   User undoes: [A, B, C] (index: 1, at B)
   *   User performs new action D: [A, B, D] (index: 2, C discarded)
   */
  function saveSnapshot(actionType: HistoryActionType, description: string) {
    if (!getWorkflowSnapshot) return

    // If we're in the middle of the history, remove future entries
    // This implements "branching prevention" - new actions discard redo history
    if (currentIndex.value < entries.value.length - 1) {
      updateRef(entries, (draft) => {
        return draft.slice(0, currentIndex.value + 1)
      })
    }

    // Get current workflow state and deep clone it
    // Deep clone ensures snapshot is immutable and won't be affected by future changes
    const snapshot = getWorkflowSnapshot()
    const entry: HistoryEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actionType,
      description,
      snapshot: JSON.parse(JSON.stringify(snapshot)), // Deep clone using JSON serialization
    }

    addArrayItem(entries, entry)

    // Limit history size: remove oldest entries if we exceed MAX_HISTORY_ENTRIES
    // This prevents unbounded memory growth
    updateRef(entries, (draft) => {
      if (draft.length > MAX_HISTORY_ENTRIES) {
        const start = draft.length - MAX_HISTORY_ENTRIES
        return draft.slice(start)
      }
      return draft
    })

    // Update current index to point to the newly added entry
    replaceRef(currentIndex, entries.value.length - 1)
  }

  /**
   * Undo: Restore the previous state in history
   * 
   * Flow:
   * 1. If at index > 0: Move back one step and restore that snapshot
   * 2. If at index 0: Move to index -1 and restore initial empty state
   * 3. If at index -1: Can't undo further (already at initial state)
   */
  function undo() {
    if (!canUndo.value || !restoreWorkflowSnapshot) return false

    // Move to previous entry and restore its state
    if (currentIndex.value > 0) {
      // Decrement index and restore the snapshot at that position
      updateRef(currentIndex, (draft) => draft - 1)
      const entry = entries.value[currentIndex.value]
      restoreWorkflowSnapshot(entry.snapshot)
      return true
    } else if (currentIndex.value === 0) {
      // At first entry, we need to restore the state before any actions
      // This is the "initial state" (empty workflow before first action)
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
  /**
   * Start batching operations: multiple state changes will be treated as one undoable action
   * 
   * Use case: When dragging multiple nodes, each position update would normally create
   * a history entry. Batching allows all position updates to be undone/redone together.
   * 
   * Flow:
   * 1. Call startBatch() before operations
   * 2. Perform multiple operations (they check isBatching and skip saving snapshots)
   * 3. Call endBatch() to save a single snapshot for all batched operations
   */
  function startBatch() {
    replaceRef(isBatching, true)
    replaceRef(batchedActions, [])
  }

  /**
   * End batching: save a single snapshot for all batched operations
   * 
   * This creates one history entry that represents all the operations performed
   * during the batch, allowing them to be undone/redone as a single unit.
   */
  function endBatch(description: string) {
    if (!isBatching.value) return

    replaceRef(isBatching, false)
    // Save snapshot for the batched operations (single entry for all operations)
    saveSnapshot('BATCH', description)
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
