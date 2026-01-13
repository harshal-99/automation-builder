import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { produce } from 'immer'
import { v4 as uuidv4 } from 'uuid'
import type {
  WorkflowNode,
  WorkflowEdge,
  ViewportState,
  WorkflowState,
  WorkflowNodeData,
} from '@/types'
import { useHistoryStore } from './history'

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  zoom: 1,
}

export const useWorkflowStore = defineStore('workflow', () => {
  // State
  const id = ref<string>(uuidv4())
  const name = ref<string>('Untitled Workflow')
  const description = ref<string>('')
  const nodes = ref<WorkflowNode[]>([])
  const edges = ref<WorkflowEdge[]>([])
  const viewport = ref<ViewportState>({ ...DEFAULT_VIEWPORT })
  const selectedNodeIds = ref<string[]>([])
  const selectedEdgeIds = ref<string[]>([])
  const createdAt = ref<string>(new Date().toISOString())
  const updatedAt = ref<string>(new Date().toISOString())

  // Getters
  // selectedNodes and selectedEdges as string arrays (matching spec 5.1)
  const selectedNodes = computed(() => selectedNodeIds.value)
  const selectedEdges = computed(() => selectedEdgeIds.value)

  // Computed properties for getting selected node/edge objects
  const selectedNodeObjects = computed(() =>
    nodes.value.filter((n) => selectedNodeIds.value.includes(n.id))
  )

  const selectedEdgeObjects = computed(() =>
    edges.value.filter((e) => selectedEdgeIds.value.includes(e.id))
  )

  const nodeById = computed(() => {
    const map = new Map<string, WorkflowNode>()
    nodes.value.forEach((n) => map.set(n.id, n))
    return map
  })

  const hasUnsavedChanges = computed(() => {
    return updatedAt.value !== createdAt.value
  })

  // Actions
  function addNode(node: Omit<WorkflowNode, 'id'> & { id?: string }) {
    const historyStore = useHistoryStore()
    historyStore.saveSnapshot('ADD_NODE', `Add ${node.data?.label || 'node'}`)

    const newNode: WorkflowNode = {
      ...node,
      id: node.id || uuidv4(),
    }

    nodes.value = produce(nodes.value, (draft) => {
      draft.push(newNode as WorkflowNode)
    })

    markUpdated()
    return newNode.id
  }

  function updateNode(nodeId: string, data: Partial<WorkflowNodeData>) {
    const historyStore = useHistoryStore()
    historyStore.saveSnapshot('UPDATE_NODE', 'Update node')

    nodes.value = produce(nodes.value, (draft) => {
      const node = draft.find((n) => n.id === nodeId)
      if (node) {
        node.data = { ...node.data, ...data } as WorkflowNodeData
      }
    })

    markUpdated()
  }

  function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    nodes.value = produce(nodes.value, (draft) => {
      const node = draft.find((n) => n.id === nodeId)
      if (node) {
        node.position = position
      }
    })

    markUpdated()
  }

  function deleteNodes(nodeIds: string[]) {
    const historyStore = useHistoryStore()
    historyStore.saveSnapshot('DELETE_NODE', `Delete ${nodeIds.length} node(s)`)

    nodes.value = produce(nodes.value, (draft) => {
      return draft.filter((n) => !nodeIds.includes(n.id))
    })

    // Also delete connected edges
    edges.value = produce(edges.value, (draft) => {
      return draft.filter(
        (e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
      )
    })

    // Clear selection
    selectedNodeIds.value = selectedNodeIds.value.filter(
      (id) => !nodeIds.includes(id)
    )

    markUpdated()
  }

  function addEdge(edge: Omit<WorkflowEdge, 'id'> & { id?: string }) {
    // Validate that edge has required source and target
    if (!edge.source || !edge.target) {
      console.warn('[WorkflowStore] Cannot add edge without source and target:', edge)
      console.trace('[WorkflowStore] Stack trace for invalid edge:')
      return null
    }

    const historyStore = useHistoryStore()
    historyStore.saveSnapshot('ADD_EDGE', 'Connect nodes')

    const newEdge: WorkflowEdge = {
      ...edge,
      id: edge.id || uuidv4(),
    }

    edges.value = produce(edges.value, (draft) => {
      draft.push(newEdge)
    })

    markUpdated()
    return newEdge.id
  }

  function updateEdge(edgeId: string, data: Partial<WorkflowEdge>) {
    const historyStore = useHistoryStore()
    historyStore.saveSnapshot('UPDATE_EDGE', 'Update connection')

    edges.value = produce(edges.value, (draft) => {
      const edge = draft.find((e) => e.id === edgeId)
      if (edge) {
        Object.assign(edge, data)
      }
    })

    markUpdated()
  }

  function deleteEdges(edgeIds: string[]) {
    const historyStore = useHistoryStore()
    historyStore.saveSnapshot('DELETE_EDGE', `Delete ${edgeIds.length} connection(s)`)

    edges.value = produce(edges.value, (draft) => {
      return draft.filter((e) => !edgeIds.includes(e.id))
    })

    selectedEdgeIds.value = selectedEdgeIds.value.filter(
      (id) => !edgeIds.includes(id)
    )

    markUpdated()
  }

  function setSelection(nodeIds: string[], edgeIds: string[] = []) {
    selectedNodeIds.value = nodeIds
    selectedEdgeIds.value = edgeIds
  }

  function clearSelection() {
    selectedNodeIds.value = []
    selectedEdgeIds.value = []
  }

  function setViewport(newViewport: ViewportState) {
    viewport.value = newViewport
  }

  function markUpdated() {
    updatedAt.value = new Date().toISOString()
  }

  // Workflow management
  function loadWorkflow(workflow: WorkflowState) {
    id.value = workflow.id
    name.value = workflow.name
    description.value = workflow.description || ''
    nodes.value = workflow.nodes
    // Filter out any invalid edges during load
    edges.value = workflow.edges.filter((edge) => {
      if (!edge.source || !edge.target) {
        console.warn('[WorkflowStore] Filtering out invalid edge during load:', edge)
        return false
      }
      return true
    })
    viewport.value = workflow.viewport
    createdAt.value = workflow.createdAt
    updatedAt.value = workflow.updatedAt
    clearSelection()
  }

  function getWorkflowState(): WorkflowState {
    return {
      id: id.value,
      name: name.value,
      description: description.value,
      nodes: nodes.value,
      edges: edges.value,
      viewport: viewport.value,
      createdAt: createdAt.value,
      updatedAt: updatedAt.value,
    }
  }

  function resetWorkflow() {
    id.value = uuidv4()
    name.value = 'Untitled Workflow'
    description.value = ''
    nodes.value = []
    edges.value = []
    viewport.value = { ...DEFAULT_VIEWPORT }
    selectedNodeIds.value = []
    selectedEdgeIds.value = []
    createdAt.value = new Date().toISOString()
    updatedAt.value = new Date().toISOString()
  }

  // Restore state from history
  function restoreSnapshot(snapshot: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; viewport: ViewportState }) {
    nodes.value = snapshot.nodes
    // Filter out any invalid edges during restore
    edges.value = snapshot.edges.filter((edge) => {
      if (!edge.source || !edge.target) {
        console.warn('[WorkflowStore] Filtering out invalid edge during restore:', edge)
        return false
      }
      return true
    })
    viewport.value = snapshot.viewport
    markUpdated()
  }

  return {
    // State
    id,
    name,
    description,
    nodes,
    edges,
    viewport,
    selectedNodeIds,
    selectedEdgeIds,
    createdAt,
    updatedAt,

    // Getters
    selectedNodes,
    selectedEdges,
    selectedNodeObjects,
    selectedEdgeObjects,
    nodeById,
    hasUnsavedChanges,

    // Actions
    addNode,
    updateNode,
    updateNodePosition,
    deleteNodes,
    addEdge,
    updateEdge,
    deleteEdges,
    setSelection,
    clearSelection,
    setViewport,
    loadWorkflow,
    getWorkflowState,
    resetWorkflow,
    restoreSnapshot,
  }
})
