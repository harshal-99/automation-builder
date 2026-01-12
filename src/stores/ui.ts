import { defineStore } from 'pinia'
import { ref } from 'vue'

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
    isPaletteCollapsed.value = !isPaletteCollapsed.value
  }

  function openConfigPanel() {
    isConfigPanelOpen.value = true
    activePanel.value = 'config'
  }

  function closeConfigPanel() {
    isConfigPanelOpen.value = false
    if (activePanel.value === 'config') {
      activePanel.value = null
    }
  }

  function openExecutionPanel() {
    isExecutionPanelOpen.value = true
    activePanel.value = 'execution'
  }

  function closeExecutionPanel() {
    isExecutionPanelOpen.value = false
    if (activePanel.value === 'execution') {
      activePanel.value = null
    }
  }

  function setDraggingNode(isDragging: boolean, nodeType: string | null = null) {
    isDraggingNode.value = isDragging
    draggedNodeType.value = nodeType
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
