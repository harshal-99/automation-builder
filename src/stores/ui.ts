import { defineStore } from 'pinia'
import { ref } from 'vue'
import { replaceRef } from '@/utils/storeHelpers'

export const useUIStore = defineStore('ui', () => {
  // State
  const isPaletteCollapsed = ref<boolean>(false)
  const isConfigPanelOpen = ref<boolean>(false)
  const isExecutionPanelOpen = ref<boolean>(false)
  const activePanel = ref<'config' | 'execution' | null>(null)
  const isDraggingNode = ref<boolean>(false)
  const draggedNodeType = ref<string | null>(null)

  // Actions
  function togglePalette() {
    replaceRef(isPaletteCollapsed, !isPaletteCollapsed.value)
  }

  function openConfigPanel() {
    replaceRef(isConfigPanelOpen, true)
    replaceRef(activePanel, 'config')
  }

  function closeConfigPanel() {
    replaceRef(isConfigPanelOpen, false)
    if (activePanel.value === 'config') {
      replaceRef(activePanel, null)
    }
  }

  function openExecutionPanel() {
    replaceRef(isExecutionPanelOpen, true)
    replaceRef(activePanel, 'execution')
  }

  function closeExecutionPanel() {
    replaceRef(isExecutionPanelOpen, false)
    if (activePanel.value === 'execution') {
      replaceRef(activePanel, null)
    }
  }

  function setDraggingNode(isDragging: boolean, nodeType: string | null = null) {
    replaceRef(isDraggingNode, isDragging)
    replaceRef(draggedNodeType, nodeType)
  }

  return {
    // State
    isPaletteCollapsed,
    isConfigPanelOpen,
    isExecutionPanelOpen,
    activePanel,
    isDraggingNode,
    draggedNodeType,

    // Actions
    togglePalette,
    openConfigPanel,
    closeConfigPanel,
    openExecutionPanel,
    closeExecutionPanel,
    setDraggingNode,
  }
})
