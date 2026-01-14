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
 * 
 * This function handles paste/duplicate operations:
 * 1. Creates a mapping from old node IDs to new UUIDs
 * 2. Creates new nodes with new IDs and offset positions (so pasted nodes don't overlap)
 * 3. Creates new edges connecting the new nodes, using the ID mapping
 * 
 * Important: Only edges that connect nodes within the clipboard are preserved.
 * Edges connecting to nodes outside the clipboard are discarded (they would be invalid).
 */
export function createPastedNodesAndEdges(
	clipboardNodes: WorkflowNode[],
	clipboardEdges: WorkflowEdge[],
	offset: { x: number; y: number }
): { nodes: WorkflowNode[]; edges: WorkflowEdge[]; idMap: Map<string, string> } {
	// Step 1: Create mapping from old IDs to new IDs
	// This allows us to update edge source/target references
	const idMap = new Map<string, string>()
	clipboardNodes.forEach((node) => {
		const newId = uuidv4()
		idMap.set(node.id, newId)
	})

	// Step 2: Create new nodes with new IDs and offset positions
	// Offset ensures pasted nodes appear next to original (not overlapping)
	const newNodes: WorkflowNode[] = clipboardNodes.map((node) => ({
		...node,
		id: idMap.get(node.id)!,
		position: {
			x: node.position.x + offset.x,
			y: node.position.y + offset.y,
		},
	}))

	// Step 3: Create new edges with new node IDs
	// Only edges where both source and target are in the clipboard are preserved
	const newEdges: WorkflowEdge[] = clipboardEdges
		.map((edge) => {
			const newSource = idMap.get(edge.source)
			const newTarget = idMap.get(edge.target)

			// If either source or target is missing from the map, the edge is invalid
			// (it connects to a node outside the clipboard)
			if (!newSource || !newTarget) {
				return null
			}

			return {
				...edge,
				id: uuidv4(), // New edge also needs a new ID
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
