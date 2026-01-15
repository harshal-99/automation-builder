<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import type {Connection, Edge, EdgeChange, Node, NodeChange, NodeDragEvent, ViewportTransform,} from '@vue-flow/core'
import {useVueFlow, VueFlow} from '@vue-flow/core'
import {Background} from '@vue-flow/background'
import {Controls} from '@vue-flow/controls'
import {MiniMap} from '@vue-flow/minimap'
import {useWorkflowStore, useHistoryStore} from '@/stores'
import {nodeTypes} from '@/components/nodes'
import {edgeTypes} from '@/components/edges'
import {createEdgeWithLabel, validateConnection, wouldCreateCycle,} from '@/utils/edgeUtils'
import {createWorkflowNode} from '@/utils/nodeDefinitions'
import type {NodeType} from '@/types'

const workflowStore = useWorkflowStore()
const historyStore = useHistoryStore()

// VueFlow instance - use a consistent ID to ensure hooks connect to the same instance
const vueFlowId = 'workflow-canvas'
const {
  onConnect,
  onNodeDragStop,
  onViewportChange,
  onNodesChange,
  onEdgesChange,
  onEdgeUpdateStart,
  onEdgeUpdate,
  onEdgeUpdateEnd,
  fitView,
  project,
} = useVueFlow({id: vueFlowId})

// Track edge being updated to prevent invalid states
const edgeBeingUpdated = ref<string | null>(null)

// Canvas configuration
const snapToGrid = ref(true)
const snapGrid = ref<[number, number]>([15, 15])
const minZoom = 0.1
const maxZoom = 4
const defaultViewport = {x: 0, y: 0, zoom: 1}

// Computed nodes and edges from the store
const nodes = computed({
  get: () => workflowStore.nodes,
  set: (_value: Node[]) => {
    // Nodes are managed through the store, setter is required for v-model
  },
})

const edges = computed({
  get: () => {
    const storeEdges = workflowStore.edges
    // Filter out any invalid edges that might have been created
    return storeEdges.filter((edge) => {
      if (!edge.source || !edge.target) {
        console.warn('[WorkflowCanvas] Filtering out invalid edge:', edge)
        console.trace('[WorkflowCanvas] Stack trace:')
        return false
      }
      return true
    })
  },
  set: () => {}
})

/**
 * Validates if a connection is allowed
 * Used by VueFlow to show visual feedback during dragging
 * Note: This is called by Vue Flow for both new connections AND existing edges
 * So we use a lighter validation that doesn't check for duplicates
 */
function isValidConnection(connection: Connection): boolean {
  const {source, target} = connection

  // Must have source and target
  if (!source || !target) {
    return false
  }

  // Cannot connect to self
  if (source === target) {
    return false
  }

  const sourceNode = workflowStore.nodes.find((n) => n.id === source)
  const targetNode = workflowStore.nodes.find((n) => n.id === target)

  if (!sourceNode || !targetNode) {
    return false
  }

  // Also check for cycles (but only for new connections, not existing edges)
  // We check if this connection already exists - if so, it's an existing edge being validated
  const isExistingEdge = workflowStore.edges.some(
      (e) => e.source === source && e.target === target
  )

  if (!isExistingEdge && wouldCreateCycle(connection, workflowStore.edges)) {
    return false
  }

  return true
}

// Handle new connections
onConnect((connection: Connection) => {
  if (connection.source && connection.target) {
    // Validate the connection
    const validationResult = validateConnection(
        connection,
        workflowStore.nodes,
        workflowStore.edges
    )

    if (!validationResult.valid) {
      console.warn('Invalid connection:', validationResult.reason)
      return
    }

    // Check for cycles
    if (wouldCreateCycle(connection, workflowStore.edges)) {
      console.warn('Connection would create a cycle')
      return
    }

    // Create edge with automatic labeling for condition nodes
    const edge = createEdgeWithLabel(
        connection,
        workflowStore.nodes
    )
    workflowStore.addEdge(edge)
  }
})

// Handle node position changes after drag
onNodeDragStop((event: NodeDragEvent) => {
  const draggedNodes = Array.isArray(event) ? event : [event]
  
  // If multiple nodes were dragged, batch the operation
  if (draggedNodes.length > 1) {
    historyStore.startBatch()
    const updates = draggedNodes.map(({node}) => ({
      nodeId: node.id,
      position: node.position,
    }))
    workflowStore.updateNodePositions(updates)
    historyStore.endBatch(`Move ${draggedNodes.length} node(s)`)
  } else {
    // Single node drag - update position without batching (no snapshot saved for performance)
    workflowStore.updateNodePosition(draggedNodes[0].node.id, draggedNodes[0].node.position)
  }
})

// Handle viewport changes
onViewportChange((viewport: ViewportTransform) => {
  workflowStore.setViewport({
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  })
})

// Handle node changes (including deletions)
onNodesChange((changes: NodeChange[]) => {
  const removedNodeIds = changes
    .filter((change) => change.type === 'remove')
    .map((change) => change.id)
  
  if (removedNodeIds.length > 0) {
    // If multiple nodes are being deleted, batch the operation
    if (removedNodeIds.length > 1) {
      historyStore.startBatch()
      workflowStore.deleteNodes(removedNodeIds)
      historyStore.endBatch(`Delete ${removedNodeIds.length} node(s)`)
    } else {
      workflowStore.deleteNodes(removedNodeIds)
    }
  }
})

// Handle edge changes (including deletions)
onEdgesChange((changes: EdgeChange[]) => {
  const removedEdgeIds = changes
    .filter((change) => change.type === 'remove' && edgeBeingUpdated.value !== change.id)
    .map((change) => change.id)
  
  if (removedEdgeIds.length > 0) {
    // If multiple edges are being deleted, batch the operation
    if (removedEdgeIds.length > 1) {
      historyStore.startBatch()
      workflowStore.deleteEdges(removedEdgeIds)
      historyStore.endBatch(`Delete ${removedEdgeIds.length} connection(s)`)
    } else {
      workflowStore.deleteEdges(removedEdgeIds)
    }
  }
})

// Handle edge update start - track which edge is being updated
onEdgeUpdateStart(({edge}) => {
  edgeBeingUpdated.value = edge.id
})

// Handle edge update - validate and apply the update when user drops on a valid handle
onEdgeUpdate(({edge, connection}) => {
  // Validate the new connection
  const validationResult = validateConnection(
      connection,
      workflowStore.nodes,
      // Exclude the current edge from validation to allow reconnecting
      workflowStore.edges.filter((e) => e.id !== edge.id)
  )

  if (!validationResult.valid) {
    return
  }

  // Check for cycles
  if (wouldCreateCycle(connection, workflowStore.edges.filter((e) => e.id !== edge.id))) {
    return
  }

  // Create the updated edge with proper labeling
  const updatedEdge = createEdgeWithLabel(connection, workflowStore.nodes)

  // Remove old edge and add the updated one
  workflowStore.deleteEdges([edge.id])
  workflowStore.addEdge(updatedEdge)
})

// Handle edge update end - cleanup tracking state
onEdgeUpdateEnd(() => {
  edgeBeingUpdated.value = null
})

// Handle selection changes (called from template event)
function handleSelectionChange({nodes: selectedNodes, edges: selectedEdges}: { nodes: Node[]; edges: Edge[] }) {
  workflowStore.setSelection(
      selectedNodes.map((n) => n.id),
      selectedEdges.map((e) => e.id)
  )
}

// Handle node clicks to ensure selection
function handleNodeClick(event: { node: Node }) {
  workflowStore.setSelection([event.node.id], [])
}

// Handle drag and drop from the palette
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()

  const nodeType = event.dataTransfer?.getData('application/node-type')
  if (!nodeType) {
    return
  }

  // Get the drop position - VueFlow's project function converts screen coordinates to flow coordinates
  // We need coordinates relative to the VueFlow viewport
  const canvasElement = event.currentTarget as HTMLElement
  const vueFlowPane = canvasElement.querySelector('.vue-flow__viewport') as HTMLElement || canvasElement.querySelector('.vue-flow__pane') as HTMLElement

  if (!vueFlowPane) {
    // Fallback: use the canvas element itself
    const rect = canvasElement.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const position = project({x, y})

    const snapX = snapToGrid.value ? Math.round(position.x / snapGrid.value[0]) * snapGrid.value[0] : position.x
    const snapY = snapToGrid.value ? Math.round(position.y / snapGrid.value[1]) * snapGrid.value[1] : position.y

    const newNode = createWorkflowNode(nodeType as NodeType, {x: snapX, y: snapY})
    workflowStore.addNode(newNode)
    return
  }

  const rect = vueFlowPane.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Convert screen coordinates to canvas coordinates using VueFlow's project function
  const position = project({x, y})

  // Snap to grid if enabled
  const snapX = snapToGrid.value ? Math.round(position.x / snapGrid.value[0]) * snapGrid.value[0] : position.x
  const snapY = snapToGrid.value ? Math.round(position.y / snapGrid.value[1]) * snapGrid.value[1] : position.y

  // Create and add the node
  const newNode = createWorkflowNode(nodeType as NodeType, {x: snapX, y: snapY})
  workflowStore.addNode(newNode)
}

// Fit view on mount with a slight delay for proper rendering
onMounted(() => {
  setTimeout(() => {
    if (workflowStore.nodes.length > 0) {
      fitView({padding: 0.2})
    }
  }, 100)
})

// Expose methods for parent components
defineExpose({
  fitView,
  project,
})
</script>

<template>
  <div
      role="application"
      aria-label="Workflow canvas"
      aria-describedby="canvas-description"
      class="w-full h-full bg-gray-900"
      @dragover="handleDragOver"
      @drop="handleDrop"
  >
    <div id="canvas-description" class="sr-only">
      Interactive workflow canvas. Drag nodes from the palette to add them. Connect nodes by dragging from output handles to input handles. Use keyboard shortcuts for navigation and editing.
    </div>
    <VueFlow
        :id="vueFlowId"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :default-viewport="defaultViewport"
        :min-zoom="minZoom"
        :max-zoom="maxZoom"
        :snap-to-grid="snapToGrid"
        :snap-grid="snapGrid"
        :selection-key-code="null"
        :multi-selection-key-code="'Shift'"
        :delete-key-code="'Delete'"
        :pan-on-drag="true"
        :zoom-on-scroll="true"
        :zoom-on-pinch="true"
        :pan-on-scroll="false"
        :prevent-scrolling="true"
        :nodes-draggable="true"
        :nodes-connectable="true"
        :elements-selectable="true"
        :edges-updatable="true"
        :is-valid-connection="isValidConnection"
        :default-edge-options="{ type: 'labeled' }"
        :only-render-visible-elements="true"
        fit-view-on-init
        class="h-full w-full"
        @selection-change="handleSelectionChange"
        @node-click="handleNodeClick"
    >
      <!-- Grid Background -->
      <Background
          variant="dots"
          :gap="15"
          :size="1"
          pattern-color="var(--color-grid-pattern)"
      />

      <!-- Zoom/Pan Controls -->
      <Controls
          :show-zoom="true"
          :show-fit-view="true"
          :show-interactive="true"
          position="bottom-left"
          aria-label="Canvas zoom and pan controls"
      />

      <!-- Minimap -->
      <MiniMap
          position="bottom-right"
          :pannable="true"
          :zoomable="true"
          :node-stroke-width="3"
          node-color="var(--color-minimap-node)"
          node-stroke-color="var(--color-minimap-stroke)"
          mask-color="var(--color-minimap-mask)"
          aria-label="Workflow minimap showing overview of all nodes"
      />
    </VueFlow>
  </div>
</template>

<style scoped>
/* Custom styles for VueFlow controls */
:deep(.vue-flow__controls) {
  background-color: var(--color-controls-bg);
  border: 1px solid var(--color-controls-border);
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px var(--color-shadow);
}

:deep(.vue-flow__controls-button) {
  background-color: var(--color-controls-bg);
  border-color: var(--color-controls-border);
  color: var(--color-controls-text);
  fill: var(--color-controls-text);
}

:deep(.vue-flow__controls-button:hover) {
  background-color: var(--color-controls-border);
  color: var(--color-controls-text-hover);
  fill: var(--color-controls-text-hover);
}

:deep(.vue-flow__controls-button:focus-visible) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Custom styles for minimap */
:deep(.vue-flow__minimap) {
  background-color: var(--color-controls-bg);
  border: 1px solid var(--color-controls-border);
  border-radius: 8px;
}

/* Default edge styling */
:deep(.vue-flow__edge-path) {
  stroke: var(--color-edge-default);
  stroke-width: 2;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: var(--color-edge-selected);
  stroke-width: 3;
}

/* Connection line styling */
:deep(.vue-flow__connection-line) {
  stroke: var(--color-edge-selected);
  stroke-width: 2;
}

/* Handle styling */
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  background-color: var(--color-handle-bg);
  border: 2px solid var(--color-handle-border);
}

:deep(.vue-flow__handle:hover) {
  background-color: var(--color-handle-hover);
}

:deep(.vue-flow__handle.connecting) {
  background-color: var(--color-handle-hover);
}

/* Selection box styling */
:deep(.vue-flow__selection) {
  background: var(--color-selection-bg);
  border: 1px dashed var(--color-selection-border);
}

/* Invalid connection styling */
:deep(.vue-flow__handle.connectingto) {
  background-color: var(--color-edge-invalid);
}

:deep(.vue-flow__connection-line.invalid) {
  stroke: var(--color-edge-invalid);
  stroke-dasharray: 5 5;
}

/* Edge hover effect */
:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke: var(--color-edge-hover);
}

/* Animated edge during execution (for future use) */
:deep(.vue-flow__edge.animated .vue-flow__edge-path) {
  stroke-dasharray: 5;
  animation: dash 0.5s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}
</style>
