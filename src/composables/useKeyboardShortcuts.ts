import { onMounted, onUnmounted } from 'vue'
import { useWorkflowStore, useHistoryStore } from '@/stores'

/**
 * Composable for handling keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const workflowStore = useWorkflowStore()
  const historyStore = useHistoryStore()

  function handleKeyDown(event: KeyboardEvent) {
    // Check if user is typing in an input field
    const target = event.target as HTMLElement
    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    const isModifierKey = event.metaKey || event.ctrlKey

    // For most shortcuts, don't intercept when typing in inputs
    // But allow some shortcuts like Escape and arrow keys even in inputs
    if (isInputField && !['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      // Don't intercept shortcuts when typing in inputs
      // But still allow undo/redo in text inputs (browser default)
      if (isModifierKey && event.key === 'z' && !event.shiftKey) {
        // Allow browser's undo in text inputs
        return
      }
      if (isModifierKey && event.key === 'z' && event.shiftKey) {
        // Allow browser's redo in text inputs
        return
      }
      return
    }

    // Undo: Ctrl/Cmd + Z
    if (isModifierKey && event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      historyStore.undo()
      return
    }

    // Redo: Ctrl/Cmd + Shift + Z
    if (isModifierKey && event.key === 'z' && event.shiftKey) {
      event.preventDefault()
      historyStore.redo()
      return
    }

    // Delete/Backspace: Delete selected nodes/edges
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!isInputField) {
        event.preventDefault()
        const selectedNodes = workflowStore.selectedNodeIds
        const selectedEdges = workflowStore.selectedEdgeIds

        if (selectedNodes.length > 0) {
          workflowStore.deleteNodes(selectedNodes)
        }
        if (selectedEdges.length > 0) {
          workflowStore.deleteEdges(selectedEdges)
        }
      }
      return
    }

    // Select All: Ctrl/Cmd + A
    if (isModifierKey && event.key === 'a') {
      if (!isInputField) {
        event.preventDefault()
        workflowStore.selectAll()
      }
      return
    }

    // Copy: Ctrl/Cmd + C
    if (isModifierKey && event.key === 'c') {
      if (!isInputField) {
        event.preventDefault()
        const selectedNodes = workflowStore.selectedNodeIds
        if (selectedNodes.length > 0) {
          workflowStore.copyNodes(selectedNodes)
        }
      }
      return
    }

    // Paste: Ctrl/Cmd + V
    if (isModifierKey && event.key === 'v') {
      if (!isInputField) {
        event.preventDefault()
        workflowStore.pasteNodes()
      }
      return
    }

    // Duplicate: Ctrl/Cmd + D
    if (isModifierKey && event.key === 'd') {
      if (!isInputField) {
        event.preventDefault()
        const selectedNodes = workflowStore.selectedNodeIds
        if (selectedNodes.length > 0) {
          workflowStore.duplicateNodes(selectedNodes)
        }
      }
      return
    }

    // Escape: Deselect all
    if (event.key === 'Escape') {
      if (!isInputField) {
        event.preventDefault()
        workflowStore.clearSelection()
      }
      return
    }

    // Arrow keys: Nudge selected nodes
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      if (!isInputField && workflowStore.selectedNodeIds.length > 0) {
        event.preventDefault()
        const direction = {
          ArrowUp: 'up' as const,
          ArrowDown: 'down' as const,
          ArrowLeft: 'left' as const,
          ArrowRight: 'right' as const,
        }[event.key]
        if (!direction) return
        workflowStore.nudgeNodes(direction)
      }
      return
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
}
