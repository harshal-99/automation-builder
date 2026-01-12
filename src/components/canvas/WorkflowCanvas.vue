<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import type {Connection, Edge, EdgeChange, Node, NodeChange, NodeDragEvent, ViewportTransform,} from '@vue-flow/core'
import {useVueFlow, VueFlow} from '@vue-flow/core'
import {Background} from '@vue-flow/background'
import {Controls} from '@vue-flow/controls'
import {MiniMap} from '@vue-flow/minimap'
import {useWorkflowStore} from '@/stores'
import {nodeTypes} from '@/components/nodes'
import {edgeTypes} from '@/components/edges'
import {createEdgeWithLabel, validateConnection, wouldCreateCycle,} from '@/utils/edgeUtils'
import {createWorkflowNode} from '@/utils/nodeDefinitions'
import type {NodeType} from '@/types'

const workflowStore = useWorkflowStore()

// VueFlow instance
const {
  onConnect,
  onNodeDragStop,
  onViewportChange,
  onNodesChange,
  onEdgesChange,
  fitView,
  project,
} = useVueFlow()

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
  get: () => workflowStore.edges,
  set: (_value: Edge[]) => {
    // Edges are managed through the store, setter is required for v-model
  },
})

/**
 * Validates if a connection is allowed
 * Used by VueFlow to show visual feedback during dragging
 */
function isValidConnection(connection: Connection): boolean {
  const validationResult = validateConnection(
      connection,
      workflowStore.nodes,
      workflowStore.edges
  )

  if (!validationResult.valid) {
    return false
  }

  // Also check for cycles
  return !wouldCreateCycle(connection, workflowStore.edges);
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
  draggedNodes.forEach(({node}) => {
    workflowStore.updateNodePosition(node.id, node.position)
  })
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
  changes.forEach((change) => {
    if (change.type === 'remove') {
      workflowStore.deleteNodes([change.id])
    }
  })
})

// Handle edge changes (including deletions)
onEdgesChange((changes: EdgeChange[]) => {
  changes.forEach((change) => {
    if (change.type === 'remove') {
      workflowStore.deleteEdges([change.id])
    }
  })
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
      class="w-full h-full bg-gray-900"
      @dragover="handleDragOver"
      @drop="handleDrop"
  >
    <VueFlow
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
