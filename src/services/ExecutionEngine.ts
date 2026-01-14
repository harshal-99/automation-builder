import type {NodeExecutionStatus, WorkflowEdge, WorkflowNode,} from '@/types'
import {useExecutionStore} from '@/stores/execution'
import {useWorkflowStore} from '@/stores/workflow'

/**
 * Result of executing a single node
 */
export interface NodeExecutionResult {
	success: boolean
	output?: Record<string, unknown>
	error?: string
	nextHandles?: string[] // Which output handles to follow (e.g., 'true', 'false', 'success', 'error')
}
const nodeNotFound : NodeExecutionResult = {success: false, error: 'Node not found', nextHandles: []}

/**
 * Mock response generators for different node types
 */
const mockResponses: Record<string, () => Record<string, unknown>> = {
	'http-request': () => ({
		status: 200,
		statusText: 'OK',
		headers: {'content-type': 'application/json'},
		data: {message: 'Mock API response', timestamp: new Date().toISOString()},
	}),
	'send-email': () => ({
		messageId: `msg-${Date.now()}`,
		accepted: ['recipient@example.com'],
		rejected: [],
	}),
	'send-sms': () => ({
		sid: `SM${Date.now()}`,
		status: 'sent',
		to: '+1234567890',
	}),
}

/**
 * ExecutionEngine - Simulates workflow execution
 *
 * Responsibilities:
 * - Topological sort for execution order
 * - Node execution simulation
 * - State management via execution store
 */
export class ExecutionEngine {
	private nodes: WorkflowNode[] = []
	private edges: WorkflowEdge[] = []
	private executionOrder: string[] = []
	private currentIndex: number = 0
	private isPaused: boolean = false
	private isStopped: boolean = false
	private executionPromise: Promise<void> | null = null
	private pauseResolver: (() => void) | null = null

	/**
	 * Get the topologically sorted execution order
	 */
	getExecutionOrder(): string[] {
		return [...this.executionOrder]
	}

	/**
	 * Initialize the engine with current workflow state
	 */
	initialize(): void {
		const workflowStore = useWorkflowStore()
		this.nodes = [...workflowStore.nodes]
		this.edges = [...workflowStore.edges]
		this.executionOrder = this.topologicalSort()
		this.currentIndex = 0
		this.isPaused = false
		this.isStopped = false
	}

	/**
	 * Perform topological sort using Kahn's algorithm
	 * Returns nodes in execution order, starting from trigger nodes
	 */
	topologicalSort(): string[] {
		// Build adjacency list and in-degree map
		const inDegree = new Map<string, number>()
		const adjacencyList = new Map<string, string[]>()

		// Initialize all nodes with 0 in-degree
		this.nodes.forEach((node) => {
			inDegree.set(node.id, 0)
			adjacencyList.set(node.id, [])
		})

		// Calculate in-degrees and build adjacency list
		this.edges.forEach((edge) => {
			const currentInDegree = inDegree.get(edge.target) ?? 0
			inDegree.set(edge.target, currentInDegree + 1)

			const neighbors = adjacencyList.get(edge.source) ?? []
			neighbors.push(edge.target)
			adjacencyList.set(edge.source, neighbors)
		})

		// Start with nodes that have no incoming edges (triggers)
		const queue: string[] = []
		inDegree.forEach((degree, nodeId) => {
			if (degree === 0) {
				queue.push(nodeId)
			}
		})

		// Process queue
		const result: string[] = []
		while (queue.length > 0) {
			const current = queue.shift()!
			result.push(current)

			const neighbors = adjacencyList.get(current) ?? []
			for (const neighbor of neighbors) {
				const newDegree = (inDegree.get(neighbor) ?? 0) - 1
				inDegree.set(neighbor, newDegree)
				if (newDegree === 0) {
					queue.push(neighbor)
				}
			}
		}

		// Check for cycles (if result length doesn't match node count)
		if (result.length !== this.nodes.length) {
			console.warn('[ExecutionEngine] Graph contains a cycle, some nodes will not be executed')
		}

		return result
	}

	/**
	 * Start workflow execution
	 */
	async start(): Promise<void> {
		const executionStore = useExecutionStore()

		this.initialize()
		executionStore.reset()
		executionStore.startExecution()

		// Mark all nodes as pending
		this.executionOrder.forEach((nodeId) => {
			executionStore.setNodeState(nodeId, {status: 'pending'})
		})

		this.executionPromise = this.runExecution()
		await this.executionPromise
	}

	/**
	 * Pause execution
	 */
	pause(): void {
		this.isPaused = true
		const executionStore = useExecutionStore()
		executionStore.pauseExecution()
	}

	/**
	 * Resume execution after pause
	 */
	resume(): void {
		if (this.isPaused && this.pauseResolver) {
			this.isPaused = false
			const executionStore = useExecutionStore()
			executionStore.resumeExecution()
			this.pauseResolver()
			this.pauseResolver = null
		}
	}

	/**
	 * Stop execution completely
	 */
	stop(): void {
		this.isStopped = true
		this.isPaused = false
		if (this.pauseResolver) {
			this.pauseResolver()
			this.pauseResolver = null
		}
		const executionStore = useExecutionStore()
		executionStore.stopExecution()
	}

	/**
	 * Execute a single step (for step-through debugging)
	 */
	async step(): Promise<boolean> {
		if (this.currentIndex >= this.executionOrder.length) {
			return false
		}

		const executionStore = useExecutionStore()

		// If we haven't started yet, initialize
		if (this.currentIndex === 0 && executionStore.status === 'idle') {
			this.initialize()
			executionStore.reset()
			executionStore.startExecution()

			// Mark all nodes as pending
			this.executionOrder.forEach((nodeId) => {
				executionStore.setNodeState(nodeId, {status: 'pending'})
			})
		}

		const nodeId = this.executionOrder[this.currentIndex]
		await this.executeNode(nodeId)
		this.currentIndex++

		// Check if execution is complete
		if (this.currentIndex >= this.executionOrder.length) {
			executionStore.completeExecution()
			return false
		}

		return true
	}

	/**
	 * Main execution loop
	 */
	private async runExecution(): Promise<void> {
		const executionStore = useExecutionStore()
		const skippedNodes = new Set<string>()

		for (let i = 0; i < this.executionOrder.length; i++) {
			if (this.isStopped) {
				break
			}

			// Handle pause
			if (this.isPaused) {
				await new Promise<void>((resolve) => {
					this.pauseResolver = resolve
				})
				if (this.isStopped) break
			}

			const nodeId = this.executionOrder[i]
			this.currentIndex = i

			// Check if this node should be skipped (e.g., false branch of condition)
			if (skippedNodes.has(nodeId)) {
				executionStore.setNodeState(nodeId, {status: 'skipped'})
				executionStore.addLog({
					nodeId,
					nodeName: this.getNodeLabel(nodeId),
					status: 'skipped',
					message: 'Node skipped due to branch condition',
				})
				continue
			}

			const result = await this.executeNode(nodeId)

			// Handle conditional branching
			if (result.nextHandles && result.nextHandles.length > 0) {
				const nodesToSkip = this.getNodesToSkipForHandles(nodeId, result.nextHandles)
				nodesToSkip.forEach((id) => skippedNodes.add(id))
			}

			// Stop execution on error if needed
			if (!result.success && this.shouldStopOnError(nodeId)) {
				executionStore.setError()
				break
			}

			// Wait between steps based on execution speed
			await this.delay(executionStore.executionSpeed)
		}

		// Mark execution as complete if not stopped
		if (!this.isStopped && executionStore.status === 'running') {
			executionStore.completeExecution()
		}
	}

	/**
	 * Execute a single node
	 */
	private async executeNode(nodeId: string): Promise<NodeExecutionResult> {
		const executionStore = useExecutionStore()
		const node = this.nodes.find((n) => n.id === nodeId)

		if (!node || !node.data) {
			return {success: false, error: 'Node not found'}
		}

		const nodeType = node.data.type
		const startTime = Date.now()

		// Set node as running
		executionStore.setCurrentNode(nodeId)
		executionStore.setNodeState(nodeId, {
			status: 'running',
			startedAt: new Date().toISOString(),
		})

		// Get input data from connected nodes
		const inputData = this.getNodeInputData(nodeId)

		try {
			// Execute based on node type
			const result = await this.executeNodeByType(node, inputData)
			if (!result) return {success: false, error: 'Node not found'}
			const duration = Date.now() - startTime

			// Update node state
			const status: NodeExecutionStatus = result.success ? 'success' : 'error'
			executionStore.setNodeState(nodeId, {
				status,
				completedAt: new Date().toISOString(),
				input: inputData,
				output: result.output,
				error: result.error,
			})

			// Store output data for downstream nodes
			if (result.output) {
				executionStore.setExecutionData(nodeId, result.output)
			}

			// Add log entry
			executionStore.addLog({
				nodeId,
				nodeName: this.getNodeLabel(nodeId),
				status,
				message: result.success
					? `${nodeType} executed successfully`
					: `${nodeType} failed: ${result.error}`,
				input: inputData,
				output: result.output,
				error: result.error,
				duration,
			})

			return result
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			const duration = Date.now() - startTime

			executionStore.setNodeState(nodeId, {
				status: 'error',
				completedAt: new Date().toISOString(),
				error: errorMessage,
			})

			executionStore.addLog({
				nodeId,
				nodeName: this.getNodeLabel(nodeId),
				status: 'error',
				message: `${nodeType} failed with exception`,
				error: errorMessage,
				duration,
			})

			return {success: false, error: errorMessage}
		}
	}

	/**
	 * Execute node based on its type
	 * Note: node.data is guaranteed to exist as this is called from executeNode after validation
	 */
	private async executeNodeByType(
		node: WorkflowNode,
		inputData: Record<string, unknown>
	): Promise<NodeExecutionResult> {
		if (!node.data) return nodeNotFound;
		const nodeType = node.data.type

		switch (nodeType) {
			// Trigger nodes
			case 'manual-trigger':
				return this.executeManualTrigger(node)
			case 'webhook-trigger':
				return this.executeWebhookTrigger(node)

			// Action nodes
			case 'http-request':
				return this.executeHttpRequest(node, inputData)
			case 'send-email':
				return this.executeSendEmail(node, inputData)
			case 'send-sms':
				return this.executeSendSms(node, inputData)
			case 'delay':
				return this.executeDelay(node)

			// Logic nodes
			case 'condition':
				return this.executeCondition(node, inputData)
			case 'transform':
				return this.executeTransform(node, inputData)

			default:
				return {success: false, error: `Unknown node type: ${nodeType}`}
		}
	}

	// ============================================
	// Trigger Node Executors
	// ============================================

	private async executeManualTrigger(node: WorkflowNode): Promise<NodeExecutionResult> {
		if (!node.data) return nodeNotFound;
		if (node.data.type !== 'manual-trigger') return nodeNotFound;
		const config = node.data.config
		return {
			success: true,
			output: {
				triggered: true,
				triggerName: config.name,
				timestamp: new Date().toISOString(),
			},
			nextHandles: ['output'],
		}

	}

	private async executeWebhookTrigger(node: WorkflowNode): Promise<NodeExecutionResult> {
		if (!node.data) return nodeNotFound;
		if (node.data.type !== 'webhook-trigger') return nodeNotFound;
		const config = node.data.config
		// Simulate webhook payload
		return {
			success: true,
			output: {
				triggered: true,
				method: config.method,
				url: config.url,
				body: {sampleData: 'webhook payload', timestamp: new Date().toISOString()},
				headers: config.headers || {},
			},
			nextHandles: ['output'],
		}
	}

	// ============================================
	// Action Node Executors
	// ============================================

	private async executeHttpRequest(
		node: WorkflowNode,
		inputData: Record<string, unknown>
	): Promise<NodeExecutionResult> {
		if (!node.data) return nodeNotFound;
		if (node.data.type !== 'http-request') return nodeNotFound;
		const config = node.data.config

		// Simulate random success/failure for demonstration
		const shouldSucceed = Math.random() > 0.1 // 90% success rate

		if (shouldSucceed) {
			const mockResponse = mockResponses['http-request']()
			return {
				success: true,
				output: {
					request: {
						url: config.url,
						method: config.method,
						headers: config.headers,
						body: config.body,
					},
					response: mockResponse,
					inputData,
				},
				nextHandles: ['output'],
			}
		} else {
			return {
				success: false,
				error: 'Simulated HTTP error: Connection timeout',
				nextHandles: ['error'],
			}
		}
	}

	private async executeSendEmail(
		node: WorkflowNode,
		inputData: Record<string, unknown>
	): Promise<NodeExecutionResult> {
		if (!node.data) return nodeNotFound;
		if (node.data.type !== 'send-email') return nodeNotFound;
		const config = node.data.config

		const shouldSucceed = Math.random() > 0.05 // 95% success rate

		if (shouldSucceed) {
			const mockResponse = mockResponses['send-email']()
			return {
				success: true,
				output: {
					email: {
						to: config.to,
						subject: config.subject,
						body: config.body,
						cc: config.cc,
					},
					result: mockResponse,
					inputData,
				},
				nextHandles: ['success'],
			}
		} else {
			return {
				success: false,
				error: 'Simulated email error: Invalid recipient address',
				nextHandles: ['error'],
			}
		}
	}

	private async executeSendSms(
		node: WorkflowNode,
		inputData: Record<string, unknown>
	): Promise<NodeExecutionResult> {
		if (!node.data) return nodeNotFound;
		if (node.data.type !== 'send-sms') return nodeNotFound;
		const config = node.data.config

		const shouldSucceed = Math.random() > 0.05 // 95% success rate

		if (shouldSucceed) {
			const mockResponse = mockResponses['send-sms']()
			return {
				success: true,
				output: {
					sms: {
						to: config.phoneNumber,
						message: config.message,
					},
					result: mockResponse,
					inputData,
				},
				nextHandles: ['success'],
			}
		} else {
			return {
				success: false,
				error: 'Simulated SMS error: Invalid phone number',
				nextHandles: ['error'],
			}
		}
	}

	private async executeDelay(node: WorkflowNode): Promise<NodeExecutionResult> {
		const config = node.data!.config as {
			duration: number
			unit: 'seconds' | 'minutes' | 'hours'
		}

		// Convert to milliseconds (but cap at 5 seconds for simulation)
		let delayMs = config.duration
		switch (config.unit) {
			case 'minutes':
				delayMs *= 60
				break
			case 'hours':
				delayMs *= 3600
				break
		}
		delayMs *= 1000

		// Cap at 5 seconds for simulation purposes
		const actualDelay = Math.min(delayMs, 5000)

		await this.delay(actualDelay)

		return {
			success: true,
			output: {
				delayedFor: {
					configured: {duration: config.duration, unit: config.unit},
					actualMs: actualDelay,
				},
				timestamp: new Date().toISOString(),
			},
			nextHandles: ['output'],
		}
	}

	// ============================================
	// Logic Node Executors
	// ============================================

	private async executeCondition(
		node: WorkflowNode,
		inputData: Record<string, unknown>
	): Promise<NodeExecutionResult> {
		if (!node.data) return nodeNotFound;
		if (node.data.type !== 'condition') return nodeNotFound;
		const config = node.data.config

		// Evaluate the condition
		const conditionResult = this.evaluateCondition(config.expression, config.operator, config.value, inputData)

		return {
			success: true,
			output: {
				condition: {
					expression: config.expression,
					operator: config.operator,
					value: config.value,
					result: conditionResult,
				},
				inputData,
			},
			nextHandles: [conditionResult ? 'true' : 'false'],
		}
	}

	private async executeTransform(
		node: WorkflowNode,
		inputData: Record<string, unknown>
	): Promise<NodeExecutionResult> {
		if (!node.data) return nodeNotFound;
		if (node.data.type !== 'transform') return nodeNotFound;
		const config = node.data.config

		const transformedData = {...inputData}

		for (const transform of config.transformations) {
			const {field, operation, value} = transform
			transformedData[field] = this.applyTransformation(
				transformedData[field],
				operation,
				value
			)
		}

		return {
			success: true,
			output: {
				original: inputData,
				transformed: transformedData,
				transformations: config.transformations,
			},
			nextHandles: ['output'],
		}
	}

	// ============================================
	// Helper Methods
	// ============================================

	/**
	 * Evaluate a condition expression
	 */
	private evaluateCondition(
		expression: string,
		operator: string,
		compareValue: unknown,
		inputData: Record<string, unknown>
	): boolean {
		// Get the value from input data using the expression as a path
		const actualValue = this.getValueByPath(inputData, expression)

		switch (operator) {
			case 'equals':
				return actualValue === compareValue
			case 'not_equals':
				return actualValue !== compareValue
			case 'greater_than':
				return Number(actualValue) > Number(compareValue)
			case 'less_than':
				return Number(actualValue) < Number(compareValue)
			case 'greater_than_or_equals':
				return Number(actualValue) >= Number(compareValue)
			case 'less_than_or_equals':
				return Number(actualValue) <= Number(compareValue)
			case 'contains':
				return String(actualValue).includes(String(compareValue))
			case 'not_contains':
				return !String(actualValue).includes(String(compareValue))
			case 'starts_with':
				return String(actualValue).startsWith(String(compareValue))
			case 'ends_with':
				return String(actualValue).endsWith(String(compareValue))
			case 'is_empty':
				return actualValue === null || actualValue === undefined || actualValue === ''
			case 'is_not_empty':
				return actualValue !== null && actualValue !== undefined && actualValue !== ''
			case 'is_true':
				return actualValue === true || actualValue === 'true'
			case 'is_false':
				return actualValue === false || actualValue === 'false'
			default:
				// For unknown operators, default to truthy check
				return Boolean(actualValue)
		}
	}

	/**
	 * Apply a transformation operation to a value
	 */
	private applyTransformation(
		currentValue: unknown,
		operation: string,
		operationValue: unknown
	): unknown {
		switch (operation) {
			case 'set':
				return operationValue
			case 'append':
				return String(currentValue ?? '') + String(operationValue ?? '')
			case 'prepend':
				return String(operationValue ?? '') + String(currentValue ?? '')
			case 'add':
				return Number(currentValue ?? 0) + Number(operationValue ?? 0)
			case 'subtract':
				return Number(currentValue ?? 0) - Number(operationValue ?? 0)
			case 'multiply':
				return Number(currentValue ?? 0) * Number(operationValue ?? 1)
			case 'divide':
				const divisor = Number(operationValue ?? 1)
				return divisor !== 0 ? Number(currentValue ?? 0) / divisor : 0
			case 'uppercase':
				return String(currentValue ?? '').toUpperCase()
			case 'lowercase':
				return String(currentValue ?? '').toLowerCase()
			case 'trim':
				return String(currentValue ?? '').trim()
			case 'replace':
				const [search, replace] = String(operationValue ?? '').split('|')
				return String(currentValue ?? '').replace(search, replace ?? '')
			default:
				return currentValue
		}
	}

	/**
	 * Get a value from an object using dot notation path
	 */
	private getValueByPath(obj: Record<string, unknown>, path: string): unknown {
		if (!path) return obj

		const keys = path.split('.')
		let current: unknown = obj

		for (const key of keys) {
			if (current === null || current === undefined) return undefined
			if (typeof current !== 'object') return undefined
			current = (current as Record<string, unknown>)[key]
		}

		return current
	}

	/**
	 * Get input data for a node by collecting outputs from connected upstream nodes
	 */
	private getNodeInputData(nodeId: string): Record<string, unknown> {
		const executionStore = useExecutionStore()
		const inputData: Record<string, unknown> = {}

		// Find all edges that target this node
		const incomingEdges = this.edges.filter((e) => e.target === nodeId)

		for (const edge of incomingEdges) {
			const sourceData = executionStore.executionData[edge.source]
			if (sourceData) {
				// Use source handle as key if available, otherwise use 'input'
				const key = edge.sourceHandle || 'input'
				inputData[key] = sourceData
			}
		}

		// Flatten if there's only one input source
		if (Object.keys(inputData).length === 1) {
			const singleValue = Object.values(inputData)[0]
			if (typeof singleValue === 'object' && singleValue !== null) {
				return {...singleValue as Record<string, unknown>}
			}
		}

		return inputData
	}

	/**
	 * Get nodes that should be skipped based on which handles are NOT being followed
	 */
	private getNodesToSkipForHandles(nodeId: string, activeHandles: string[]): string[] {
		const nodesToSkip: string[] = []

		// Find all edges from this node
		const outgoingEdges = this.edges.filter((e) => e.source === nodeId)

		// Find edges that are NOT in the active handles list
		const inactiveEdges = outgoingEdges.filter((e) => {
			const handle = e.sourceHandle || 'output'
			return !activeHandles.includes(handle)
		})

		// Add target nodes of inactive edges to skip list
		for (const edge of inactiveEdges) {
			nodesToSkip.push(edge.target)
			// Recursively add all downstream nodes
			nodesToSkip.push(...this.getAllDownstreamNodes(edge.target))
		}

		return [...new Set(nodesToSkip)]
	}

	/**
	 * Get all nodes downstream from a given node
	 */
	private getAllDownstreamNodes(nodeId: string): string[] {
		const downstream: string[] = []
		const visited = new Set<string>()
		const stack = [nodeId]

		while (stack.length > 0) {
			const current = stack.pop()!
			if (visited.has(current)) continue
			visited.add(current)

			const outgoing = this.edges.filter((e) => e.source === current)
			for (const edge of outgoing) {
				if (!visited.has(edge.target)) {
					downstream.push(edge.target)
					stack.push(edge.target)
				}
			}
		}

		return downstream
	}

	/**
	 * Check if execution should stop on error for a given node
	 */
	private shouldStopOnError(_nodeId: string): boolean {
		// For now, always continue on error (error paths handle failures)
		// This could be made configurable per-node in the future
		return false
	}

	/**
	 * Get node label for logging
	 */
	private getNodeLabel(nodeId: string): string {
		const node = this.nodes.find((n) => n.id === nodeId)
		return node?.data?.label ?? nodeId
	}

	/**
	 * Utility delay function
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}

// Export singleton instance
export const executionEngine = new ExecutionEngine()
