import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {v4 as uuidv4} from 'uuid'
import type {ViewportState, WorkflowEdge, WorkflowNode, WorkflowNodeData, WorkflowState,} from '@/types'
import {useHistoryStore} from './history'
import {addArrayItem, filterArrayItems, replaceRef, updateArrayItem, updateRef,} from '@/utils/storeHelpers'
import {
	cloneNodesAndEdges,
	createPastedNodesAndEdges,
	filterValidEdges,
	getInternalEdges,
	getNudgeDelta,
} from '@/utils/workflowUtils'

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
	const viewport = ref<ViewportState>({...DEFAULT_VIEWPORT})
	const selectedNodeIds = ref<string[]>([])
	const selectedEdgeIds = ref<string[]>([])
	const createdAt = ref<string>(new Date().toISOString())
	const updatedAt = ref<string>(new Date().toISOString())

	// Clipboard state
	const clipboardNodes = ref<WorkflowNode[]>([])
	const clipboardEdges = ref<WorkflowEdge[]>([])

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

		addArrayItem(nodes, newNode)

		markUpdated()
		return newNode.id
	}

	function updateNode(nodeId: string, data: Partial<WorkflowNodeData>) {
		const historyStore = useHistoryStore()
		historyStore.saveSnapshot('UPDATE_NODE', 'Update node')

		updateArrayItem(nodes, nodeId, (node) => {
			node.data = {...node.data, ...data} as WorkflowNodeData
		})

		markUpdated()
	}

	function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
		updateArrayItem(nodes, nodeId, (node) => {
			node.position = position
		})

		markUpdated()
	}

	function updateNodePositions(updates: Array<{ nodeId: string; position: { x: number; y: number } }>) {
		const historyStore = useHistoryStore()

		// If batching is active, don't save snapshot here (will be saved when batch ends)
		if (!historyStore.isBatching) {
			historyStore.saveSnapshot('MOVE_NODE', `Move ${updates.length} node(s)`)
		}

		updates.forEach(({nodeId, position}) => {
			updateArrayItem(nodes, nodeId, (node) => {
				node.position = position
			})
		})

		markUpdated()
	}

	function deleteNodes(nodeIds: string[]) {
		const historyStore = useHistoryStore()

		// If batching is active, don't save snapshot here (will be saved when batch ends)
		if (!historyStore.isBatching) {
			historyStore.saveSnapshot('DELETE_NODE', `Delete ${nodeIds.length} node(s)`)
		}

		filterArrayItems(nodes, (n) => !nodeIds.includes(n.id))

		// Also delete connected edges
		filterArrayItems(edges, (e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target))

		// Clear selection for deleted nodes
		updateRef(selectedNodeIds, (draft) => {
			return draft.filter((id) => !nodeIds.includes(id))
		})

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

		addArrayItem(edges, newEdge)

		markUpdated()
		return newEdge.id
	}

	function updateEdge(edgeId: string, data: Partial<WorkflowEdge>) {
		const historyStore = useHistoryStore()
		historyStore.saveSnapshot('UPDATE_EDGE', 'Update connection')

		updateArrayItem(edges, edgeId, (edge) => {
			Object.assign(edge, data)
		})

		markUpdated()
	}

	function deleteEdges(edgeIds: string[]) {
		const historyStore = useHistoryStore()
		historyStore.saveSnapshot('DELETE_EDGE', `Delete ${edgeIds.length} connection(s)`)

		filterArrayItems(edges, (e) => !edgeIds.includes(e.id))

		// Clear selection for deleted edges
		updateRef(selectedEdgeIds, (draft) => {
			return draft.filter((id) => !edgeIds.includes(id))
		})

		markUpdated()
	}

	function setSelection(nodeIds: string[], edgeIds: string[] = []) {
		replaceRef(selectedNodeIds, nodeIds)
		replaceRef(selectedEdgeIds, edgeIds)
	}

	function clearSelection() {
		replaceRef(selectedNodeIds, [])
		replaceRef(selectedEdgeIds, [])
	}

	function setViewport(newViewport: ViewportState) {
		replaceRef(viewport, newViewport)
	}

	function markUpdated() {
		replaceRef(updatedAt, new Date().toISOString())
	}

	// Workflow management
	function loadWorkflow(workflow: WorkflowState) {
		replaceRef(id, workflow.id)
		replaceRef(name, workflow.name)
		replaceRef(description, workflow.description || '')
		replaceRef(nodes, workflow.nodes)

		// Filter out any invalid edges during load
		replaceRef(edges, filterValidEdges(workflow.edges))

		replaceRef(viewport, workflow.viewport)
		replaceRef(createdAt, workflow.createdAt)
		replaceRef(updatedAt, workflow.updatedAt)
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
		replaceRef(id, uuidv4())
		replaceRef(name, 'Untitled Workflow')
		replaceRef(description, '')
		replaceRef(nodes, [])
		replaceRef(edges, [])
		replaceRef(viewport, {...DEFAULT_VIEWPORT})
		replaceRef(selectedNodeIds, [])
		replaceRef(selectedEdgeIds, [])
		const now = new Date().toISOString()
		replaceRef(createdAt, now)
		replaceRef(updatedAt, now)
	}

	// Restore state from history
	function restoreSnapshot(snapshot: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; viewport: ViewportState }) {
		replaceRef(nodes, snapshot.nodes)
		replaceRef(edges, filterValidEdges(snapshot.edges))
		replaceRef(viewport, snapshot.viewport)
		markUpdated()
	}

	// Clipboard operations
	function copyNodes(nodeIds: string[]) {
		if (nodeIds.length === 0) return

		const nodesToCopy = nodes.value.filter((n) => nodeIds.includes(n.id))
		const edgesToCopy = getInternalEdges(nodeIds, edges.value)
		const cloned = cloneNodesAndEdges(nodesToCopy, edgesToCopy)

		replaceRef(clipboardNodes, cloned.nodes)
		replaceRef(clipboardEdges, cloned.edges)
	}

	function pasteNodes(offset: { x: number; y: number } = {x: 50, y: 50}) {
		if (clipboardNodes.value.length === 0) return

		const historyStore = useHistoryStore()
		historyStore.saveSnapshot('ADD_NODE', `Paste ${clipboardNodes.value.length} node(s)`)

		const {nodes: newNodes, edges: newEdges} = createPastedNodesAndEdges(
			clipboardNodes.value,
			clipboardEdges.value,
			offset
		)

		// Add new nodes and edges
		newNodes.forEach((node) => addArrayItem(nodes, node))
		newEdges.forEach((edge) => addArrayItem(edges, edge))

		// Select the newly pasted nodes
		replaceRef(selectedNodeIds, newNodes.map((n) => n.id))
		replaceRef(selectedEdgeIds, [])

		markUpdated()
	}

	function duplicateNodes(nodeIds: string[]) {
		if (nodeIds.length === 0) return

		// Copy first
		copyNodes(nodeIds)

		// Then paste immediately
		pasteNodes({x: 50, y: 50})
	}

	// Selection operations
	function selectAll() {
		const allNodeIds = nodes.value.map((n) => n.id)
		const allEdgeIds = edges.value.map((e) => e.id)
		setSelection(allNodeIds, allEdgeIds)
	}

	// Nudge operations
	function nudgeNodes(direction: 'up' | 'down' | 'left' | 'right', distance: number = 10) {
		if (selectedNodeIds.value.length === 0) return

		const historyStore = useHistoryStore()
		if (!historyStore.isBatching) {
			historyStore.saveSnapshot('MOVE_NODE', `Nudge ${selectedNodeIds.value.length} node(s)`)
		}

		const delta = getNudgeDelta(direction, distance)
		const updates = selectedNodeIds.value
			.map((nodeId) => {
				const node = nodes.value.find((n) => n.id === nodeId)
				if (!node) return null
				return {
					nodeId,
					position: {
						x: node.position.x + delta.x,
						y: node.position.y + delta.y,
					},
				}
			})
			.filter((update): update is { nodeId: string; position: { x: number; y: number } } => update !== null)

		updates.forEach(({nodeId, position}) => {
			updateArrayItem(nodes, nodeId, (node) => {
				node.position = position
			})
		})

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
		updateNodePositions,
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

		// Clipboard operations
		copyNodes,
		pasteNodes,
		duplicateNodes,

		// Selection operations
		selectAll,

		// Nudge operations
		nudgeNodes,
	}
})
