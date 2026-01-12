import { useVueFlow as useVueFlowCore } from '@vue-flow/core'
import type { Node, Edge } from '@vue-flow/core'
import { watch } from 'vue'
import { useWorkflowStore } from '@/stores'

export function useWorkflowVueFlow() {
  const workflowStore = useWorkflowStore()

  const {
    onConnect,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    onViewportChange,
    addNodes,
    addEdges,
    project,
    fitView,
    zoomIn,
    zoomOut,
    setViewport,
    getViewport,
  } = useVueFlowCore()

  // Handle new connections
  onConnect((connection) => {
    workflowStore.addEdge({
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
    })
  })

  // Handle node position changes after drag
  onNodeDragStop((event) => {
    const nodes = Array.isArray(event) ? event : [event]
    nodes.forEach(({ node }) => {
      workflowStore.updateNodePosition(node.id, node.position)
    })
  })

  // Handle viewport changes
  onViewportChange((viewport) => {
    workflowStore.setViewport(viewport)
  })

  // Sync viewport from store
  watch(
    () => workflowStore.viewport,
    (viewport) => {
      const currentViewport = getViewport()
      if (
        viewport.x !== currentViewport.x ||
        viewport.y !== currentViewport.y ||
        viewport.zoom !== currentViewport.zoom
      ) {
        setViewport(viewport)
      }
    },
    { deep: true }
  )

  // Handle selection changes via nodes/edges change events
  function handleSelectionChange(
    nodes: Array<Node & { selected?: boolean }>,
    edges: Array<Edge & { selected?: boolean }>
  ) {
    workflowStore.setSelection(
      nodes.filter((n) => n.selected).map((n) => n.id),
      edges.filter((e) => e.selected).map((e) => e.id)
    )
  }

  return {
    onConnect,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    addNodes,
    addEdges,
    project,
    fitView,
    zoomIn,
    zoomOut,
    setViewport,
    getViewport,
    handleSelectionChange,
  }
}
