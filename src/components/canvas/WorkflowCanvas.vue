<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { useWorkflowStore } from '@/stores'
import { nodeTypes } from '@/components/nodes'
import type {
  Node,
  Edge,
  Connection,
  NodeDragEvent,
  ViewportTransform,
  NodeChange,
  EdgeChange,
} from '@vue-flow/core'

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
const defaultViewport = { x: 0, y: 0, zoom: 1 }

// Computed nodes and edges from store
const nodes = computed({
  get: () => workflowStore.nodes as Node[],
  set: (_value: Node[]) => {
    // Nodes are managed through the store, setter is required for v-model
  },
})

const edges = computed({
  get: () => workflowStore.edges as Edge[],
  set: (_value: Edge[]) => {
    // Edges are managed through the store, setter is required for v-model
  },
})

// Handle new connections
onConnect((connection: Connection) => {
  if (connection.source && connection.target) {
    workflowStore.addEdge({
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
    })
  }
})

// Handle node position changes after drag
onNodeDragStop((event: NodeDragEvent) => {
  const draggedNodes = Array.isArray(event) ? event : [event]
  draggedNodes.forEach(({ node }) => {
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
function handleSelectionChange({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) {
  workflowStore.setSelection(
    selectedNodes.map((n) => n.id),
    selectedEdges.map((e) => e.id)
  )
}

// Fit view on mount with a slight delay for proper rendering
onMounted(() => {
  setTimeout(() => {
    if (workflowStore.nodes.length > 0) {
      fitView({ padding: 0.2 })
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
  <div class="w-full h-full bg-gray-900">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
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
      fit-view-on-init
      class="h-full w-full"
      @selection-change="handleSelectionChange"
    >
      <!-- Grid Background -->
      <Background
        variant="dots"
        :gap="15"
        :size="1"
        pattern-color="rgba(148, 163, 184, 0.2)"
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
        node-color="#4b5563"
        node-stroke-color="#6b7280"
        mask-color="rgba(17, 24, 39, 0.8)"
      />
    </VueFlow>
  </div>
</template>

<style scoped>
/* Custom styles for VueFlow controls */
:deep(.vue-flow__controls) {
  background-color: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

:deep(.vue-flow__controls-button) {
  background-color: #1f2937;
  border-color: #374151;
  color: #9ca3af;
  fill: #9ca3af;
}

:deep(.vue-flow__controls-button:hover) {
  background-color: #374151;
  color: #f3f4f6;
  fill: #f3f4f6;
}

/* Custom styles for minimap */
:deep(.vue-flow__minimap) {
  background-color: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
}

/* Default edge styling */
:deep(.vue-flow__edge-path) {
  stroke: #6b7280;
  stroke-width: 2;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #3b82f6;
  stroke-width: 3;
}

/* Connection line styling */
:deep(.vue-flow__connection-line) {
  stroke: #3b82f6;
  stroke-width: 2;
}

/* Handle styling */
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  background-color: #6b7280;
  border: 2px solid #374151;
}

:deep(.vue-flow__handle:hover) {
  background-color: #3b82f6;
}

:deep(.vue-flow__handle.connecting) {
  background-color: #3b82f6;
}

/* Selection box styling */
:deep(.vue-flow__selection) {
  background: rgba(59, 130, 246, 0.1);
  border: 1px dashed #3b82f6;
}
</style>
