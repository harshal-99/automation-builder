/**
 * Utility functions for workflow operations
 * Extracted from workflow store to reduce file size
 */

import {v4 as uuidv4} from 'uuid'
import type {WorkflowEdge, WorkflowNode} from '@/types'

/**
 * Filters out invalid edges (edges without source or target)
 */
export function filterValidEdges(edges: WorkflowEdge[]): WorkflowEdge[] {
	return edges.filter((edge) => {
		if (!edge.source || !edge.target) {
			console.warn('[WorkflowUtils] Filtering out invalid edge:', edge)
			return false
		}
		return true
	})
}

/**
 * Gets edges that connect nodes within the given node IDs (internal edges)
 */
export function getInternalEdges(
	nodeIds: string[],
	allEdges: WorkflowEdge[]
): WorkflowEdge[] {
	return allEdges.filter(
		(e) => nodeIds.includes(e.source) && nodeIds.includes(e.target)
	)
}

/**
 * Creates a deep clone of nodes and edges for clipboard operations
 */
export function cloneNodesAndEdges(
	nodes: WorkflowNode[],
	edges: WorkflowEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
	return {
		nodes: JSON.parse(JSON.stringify(nodes)),
		edges: JSON.parse(JSON.stringify(edges)),
	}
}

/**
 * Creates new nodes and edges from clipboard data with new IDs and offset positions
 */
export function createPastedNodesAndEdges(
	clipboardNodes: WorkflowNode[],
	clipboardEdges: WorkflowEdge[],
	offset: { x: number; y: number }
): { nodes: WorkflowNode[]; edges: WorkflowEdge[]; idMap: Map<string, string> } {
	// Create mapping from old IDs to new IDs
	const idMap = new Map<string, string>()
	clipboardNodes.forEach((node) => {
		const newId = uuidv4()
		idMap.set(node.id, newId)
	})

	// Create new nodes with new IDs and offset positions
	const newNodes: WorkflowNode[] = clipboardNodes.map((node) => ({
		...node,
		id: idMap.get(node.id)!,
		position: {
			x: node.position.x + offset.x,
			y: node.position.y + offset.y,
		},
	}))

	// Create new edges with new node IDs
	const newEdges: WorkflowEdge[] = clipboardEdges
		.map((edge) => {
			const newSource = idMap.get(edge.source)
			const newTarget = idMap.get(edge.target)

			if (!newSource || !newTarget) {
				return null
			}

			return {
				...edge,
				id: uuidv4(),
				source: newSource,
				target: newTarget,
			}
		})
		.filter((edge): edge is WorkflowEdge => edge !== null)

	return {nodes: newNodes, edges: newEdges, idMap}
}

/**
 * Calculates position delta for nudge operations
 */
export function getNudgeDelta(
	direction: 'up' | 'down' | 'left' | 'right',
	distance: number
): { x: number; y: number } {
	return {
		up: {x: 0, y: -distance},
		down: {x: 0, y: distance},
		left: {x: -distance, y: 0},
		right: {x: distance, y: 0},
	}[direction]
}
