import {expect, test} from '@playwright/test'
import {setupWorkflowTest, WorkflowPage} from './helpers'

test.describe('Workflow Creation and Node Management', () => {
	let workflowPage: WorkflowPage

	test.beforeEach(async ({page}) => {
		workflowPage = await setupWorkflowTest(page)
	})

	test('should load with sample workflow containing 4 nodes', async () => {
		const nodes = await workflowPage.getNodes()
		await expect(nodes).toHaveCount(4)

		// Verify sample workflow nodes exist
		await expect(await workflowPage.getNodeByLabel('Manual Trigger')).toBeVisible()
		await expect(await workflowPage.getNodeByLabel('Condition')).toBeVisible()
		await expect(await workflowPage.getNodeByLabel('Send Email')).toBeVisible()
		await expect(await workflowPage.getNodeByLabel('Send SMS')).toBeVisible()
	})

	test('should display node palette with all categories', async () => {
		// Check category headers are visible (use h3 to be specific)
		await expect(workflowPage.nodePalette.locator('h3:text("Triggers")')).toBeVisible()
		await expect(workflowPage.nodePalette.locator('h3:text("Actions")')).toBeVisible()
		await expect(workflowPage.nodePalette.locator('h3:text("Logic")')).toBeVisible()
	})

	test('should filter nodes in palette when searching', async () => {
		// Search for "email"
		await workflowPage.searchNodes('email')

		// Only email node should be visible
		await expect(workflowPage.nodePalette.locator('[data-node-type="send-email"]')).toBeVisible()
		await expect(workflowPage.nodePalette.locator('[data-node-type="send-sms"]')).not.toBeVisible()

		// Clear search
		await workflowPage.clearNodeSearch()

		// All nodes should be visible again
		await expect(workflowPage.nodePalette.locator('[data-node-type="send-sms"]')).toBeVisible()
	})

	test('should add a new node via drag and drop', async ({}) => {
		const initialNodes = await workflowPage.getNodes()
		const initialCount = await initialNodes.count()

		// Drag HTTP Request node to canvas
		await workflowPage.dragNodeFromPalette('http-request', 400, 300)

		// Verify node was added
		const nodes = await workflowPage.getNodes()
		await expect(nodes).toHaveCount(initialCount + 1)
		await expect(await workflowPage.getNodeByLabel('HTTP Request')).toBeVisible()
	})

	test('should select a node when clicked', async () => {
		// Click on Manual Trigger node
		await workflowPage.selectNode('Manual Trigger')

		// Node should be selected (VueFlow adds 'selected' class to the outer node element)
		const node = await workflowPage.getNodeByLabel('Manual Trigger')
		await expect(node).toHaveClass(/selected/)
	})

	test('should open config panel when node is selected', async () => {
		// Initially no node selected
		await expect(workflowPage.configPanel.locator('text=Select a node to configure')).toBeVisible()

		// Select a node
		await workflowPage.selectNode('Manual Trigger')

		// Config panel should show node details (use h3 heading for specificity)
		await expect(workflowPage.configPanel.locator('h3:text("Manual Trigger")')).toBeVisible()
		await expect(workflowPage.configPanel.locator('div:text("Configuration")')).toBeVisible()
	})

	test('should delete selected node', async () => {
		const initialNodes = await workflowPage.getNodes()
		const initialCount = await initialNodes.count()

		// Select and delete Send SMS node
		await workflowPage.selectNode('Send SMS')
		await workflowPage.deleteSelectedNodes()

		// Verify node was deleted
		const nodes = await workflowPage.getNodes()
		await expect(nodes).toHaveCount(initialCount - 1)
		await expect(await workflowPage.getNodeByLabel('Send SMS')).not.toBeVisible()
	})

	test('should delete node using delete button in config panel', async () => {
		const initialNodes = await workflowPage.getNodes()
		const initialCount = await initialNodes.count()

		// Select node
		await workflowPage.selectNode('Send Email')

		// Click delete button in config panel
		await workflowPage.configPanel.locator('button:has-text("Delete")').click()

		// Verify node was deleted
		const nodes = await workflowPage.getNodes()
		await expect(nodes).toHaveCount(initialCount - 1)
		await expect(await workflowPage.getNodeByLabel('Send Email')).not.toBeVisible()
	})

	test('should deselect node when pressing Escape', async () => {
		// Select a node
		await workflowPage.selectNode('Manual Trigger')
		await expect(workflowPage.configPanel.locator('h3:text("Manual Trigger")')).toBeVisible()

		// Press Escape to deselect
		await workflowPage.escape()

		// Config panel should show no selection message
		await expect(workflowPage.configPanel.locator('text=Select a node to configure')).toBeVisible()
	})

	test('should show edges connecting nodes', async () => {
		const edges = await workflowPage.getEdges()
		// Sample workflow has 3 edges
		await expect(edges).toHaveCount(3)
	})

	test('should display edge labels for conditional branches', async () => {
		// Check for Yes/No labels on condition edges (rendered via EdgeLabelRenderer)
		// The labels are in div elements with rounded-full class
		await expect(workflowPage.canvas.locator('.rounded-full:text("Yes")')).toBeVisible()
		await expect(workflowPage.canvas.locator('.rounded-full:text("No")')).toBeVisible()
	})

	test('should show node validation indicator when invalid', async () => {
		// Add a new node (will be invalid by default)
		await workflowPage.dragNodeFromPalette('http-request', 400, 300)

		// The new node should show validation warning
		const node = await workflowPage.getNodeByLabel('HTTP Request')
		await expect(node.locator('text=Needs configuration')).toBeVisible()
	})
})
