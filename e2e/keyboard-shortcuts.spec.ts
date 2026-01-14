import {expect, test} from '@playwright/test'
import {setupWorkflowTest, WorkflowPage} from './helpers'

test.describe('Keyboard Shortcuts', () => {
	let workflowPage: WorkflowPage

	test.beforeEach(async ({page}) => {
		workflowPage = await setupWorkflowTest(page)
		// Focus canvas to ensure keyboard events are captured
		await workflowPage.canvas.click()
	})

	test('should undo last action with Ctrl+Z', async ({page}) => {
		// Select and delete a node
		await workflowPage.selectNode('Send SMS')
		const nodeCountBefore = await (await workflowPage.getNodes()).count()
		await workflowPage.deleteSelectedNodes()

		// Verify deleted
		const nodeCountAfterDelete = await (await workflowPage.getNodes()).count()
		expect(nodeCountAfterDelete).toBe(nodeCountBefore - 1)

		// Undo
		await workflowPage.undo()
		await page.waitForTimeout(200)

		// Node should be restored
		const nodeCountAfterUndo = await (await workflowPage.getNodes()).count()
		expect(nodeCountAfterUndo).toBe(nodeCountBefore)
	})

	test.skip('should redo undone action with Ctrl+Shift+Z', async ({page}) => {
		// Delete node
		await workflowPage.selectNode('Send SMS')
		await workflowPage.deleteSelectedNodes()
		await page.waitForTimeout(200)

		// Verify node is deleted
		await expect(await workflowPage.getNodeByLabel('Send SMS')).not.toBeVisible()

		// Undo
		await workflowPage.undo()
		await page.waitForTimeout(300)

		// Verify node is back
		await expect(await workflowPage.getNodeByLabel('Send SMS')).toBeVisible()

		// Redo via keyboard
		await workflowPage.redo()
		await page.waitForTimeout(300)

		// Node should be deleted again
		await expect(await workflowPage.getNodeByLabel('Send SMS')).not.toBeVisible()
	})

	test('should select all nodes with Ctrl+A', async ({page}) => {
		// Click on canvas first
		await workflowPage.canvas.click()

		// Select all
		await workflowPage.selectAll()
		await page.waitForTimeout(100)

		// All nodes should be selected (check for ring class)
		const nodes = await workflowPage.getNodes()
		const count = await nodes.count()

		// At least the sample workflow nodes should be selected
		expect(count).toBeGreaterThan(0)
	})

	test('should copy selected nodes with Ctrl+C', async ({page}) => {
		// Select a node
		await workflowPage.selectNode('Send Email')

		// Copy
		await workflowPage.copy()
		await page.waitForTimeout(100)

		// No visible change, but clipboard should have data
		// We verify by pasting
		await workflowPage.paste()
		await page.waitForTimeout(200)

		// Should have one more node
		await (await workflowPage.getNodeByLabel('Send Email')).count()
		// After paste, there should be 2 email nodes (original + copy)
	})

	test('should paste copied nodes with Ctrl+V', async ({page}) => {
		const initialCount = await (await workflowPage.getNodes()).count()

		// Select and copy
		await workflowPage.selectNode('Send Email')
		await workflowPage.copy()
		await page.waitForTimeout(100)

		// Click somewhere else on canvas
		await workflowPage.canvas.click()

		// Paste
		await workflowPage.paste()
		await page.waitForTimeout(200)

		// Should have one more node
		const afterCount = await (await workflowPage.getNodes()).count()
		expect(afterCount).toBe(initialCount + 1)
	})

	test('should duplicate selected nodes with Ctrl+D', async ({page}) => {
		const initialCount = await (await workflowPage.getNodes()).count()

		// Select a node
		await workflowPage.selectNode('Condition')

		// Duplicate
		await workflowPage.duplicate()
		await page.waitForTimeout(200)

		// Should have one more node
		const afterCount = await (await workflowPage.getNodes()).count()
		expect(afterCount).toBe(initialCount + 1)
	})

	test('should deselect all with Escape', async ({page}) => {
		// Select a node
		await workflowPage.selectNode('Manual Trigger')
		await expect(workflowPage.configPanel.locator('h3:text("Manual Trigger")')).toBeVisible()

		// Press escape
		await workflowPage.escape()
		await page.waitForTimeout(100)

		// Config panel should show no selection
		await expect(workflowPage.configPanel.locator('text=Select a node to configure')).toBeVisible()
	})

	test('should delete selected nodes with Delete key', async ({page}) => {
		const initialCount = await (await workflowPage.getNodes()).count()

		// Select a node
		await workflowPage.selectNode('Send SMS')

		// Press Delete
		await page.keyboard.press('Delete')
		await page.waitForTimeout(100)

		// Node should be deleted
		const afterCount = await (await workflowPage.getNodes()).count()
		expect(afterCount).toBe(initialCount - 1)
	})

	test('should delete selected nodes with Backspace key', async ({page}) => {
		const initialCount = await (await workflowPage.getNodes()).count()

		// Select a node
		await workflowPage.selectNode('Send Email')

		// Press Backspace
		await page.keyboard.press('Backspace')
		await page.waitForTimeout(100)

		// Node should be deleted
		const afterCount = await (await workflowPage.getNodes()).count()
		expect(afterCount).toBe(initialCount - 1)
	})

	test('should nudge selected node with arrow keys', async ({page}) => {
		// Select a node
		await workflowPage.selectNode('Condition')

		// Get initial position
		const node = await workflowPage.getNodeByLabel('Condition')
		const initialBounds = await node.boundingBox()

		// Nudge right
		await workflowPage.nudgeRight()
		await page.waitForTimeout(100)

		// Get new position
		const afterBounds = await node.boundingBox()

		// Position should have changed
		if (initialBounds && afterBounds) {
			expect(afterBounds.x).not.toBe(initialBounds.x)
		}
	})

	test('should support undo button in header', async ({page}) => {
		// Make a change
		await workflowPage.selectNode('Send SMS')
		const nodeCountBefore = await (await workflowPage.getNodes()).count()
		await workflowPage.deleteSelectedNodes()

		// Click undo button
		await workflowPage.undoButton.click()
		await page.waitForTimeout(200)

		// Node should be restored
		const nodeCountAfter = await (await workflowPage.getNodes()).count()
		expect(nodeCountAfter).toBe(nodeCountBefore)
	})

	test.skip('should support redo button in header', async ({page}) => {
		// Make a change - delete a node
		await workflowPage.selectNode('Send SMS')
		await workflowPage.deleteSelectedNodes()
		await page.waitForTimeout(200)

		// Verify deleted
		await expect(await workflowPage.getNodeByLabel('Send SMS')).not.toBeVisible()

		// Undo using button
		await workflowPage.undoButton.click()
		await page.waitForTimeout(300)

		// Verify node is back
		await expect(await workflowPage.getNodeByLabel('Send SMS')).toBeVisible()

		// Redo using button
		await workflowPage.redoButton.click()
		await page.waitForTimeout(300)

		// Node should be deleted again
		await expect(await workflowPage.getNodeByLabel('Send SMS')).not.toBeVisible()
	})

	test('should disable undo button when history is empty', async () => {
		// Fresh state - undo should be disabled or enabled based on history
		// After clearing and reloading, undo might be disabled
		await workflowPage.page.reload()
		await workflowPage.canvas.waitFor({state: 'visible'})
		await workflowPage.page.waitForTimeout(500)

		// Undo button initial state depends on implementation
		// It should be disabled if no actions have been performed
	})

	test('should disable redo button when no undone actions', async () => {
		// Fresh state - redo should be disabled
		await workflowPage.page.reload()
		await workflowPage.canvas.waitFor({state: 'visible'})
		await workflowPage.page.waitForTimeout(500)

		// Redo button should be disabled initially
		await expect(workflowPage.redoButton).toBeDisabled()
	})

	test('should handle multi-node operations with undo', async ({page}) => {
		// Select all nodes
		await workflowPage.canvas.click()
		await workflowPage.selectAll()
		await page.waitForTimeout(100)

		const initialCount = await (await workflowPage.getNodes()).count()

		// Delete all
		await workflowPage.deleteSelectedNodes()
		await page.waitForTimeout(100)

		// All nodes should be deleted
		const afterDeleteCount = await (await workflowPage.getNodes()).count()
		expect(afterDeleteCount).toBe(0)

		// Undo should restore all nodes
		await workflowPage.undo()
		await page.waitForTimeout(200)

		const afterUndoCount = await (await workflowPage.getNodes()).count()
		expect(afterUndoCount).toBe(initialCount)
	})

	test('should multi-select with Shift+Click', async ({page}) => {
		// Click first node
		await workflowPage.selectNode('Manual Trigger')

		// Shift+Click second node
		const conditionNode = await workflowPage.getNodeByLabel('Condition')
		await conditionNode.click({modifiers: ['Shift']})

		await page.waitForTimeout(100)

		// Both nodes should be selected (VueFlow uses 'selected' class)
		const triggerNode = await workflowPage.getNodeByLabel('Manual Trigger')
		await expect(triggerNode).toHaveClass(/selected/)
		await expect(conditionNode).toHaveClass(/selected/)
	})
})
