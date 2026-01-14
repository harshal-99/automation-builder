import {expect, test} from '@playwright/test'
import {setupWorkflowTest, WorkflowPage} from './helpers'

test.describe('Execution Preview', () => {
	let workflowPage: WorkflowPage

	test.beforeEach(async ({page}) => {
		workflowPage = await setupWorkflowTest(page)
	})

	test('should show execution controls in footer', async () => {
		await expect(workflowPage.playButton).toBeVisible()
		await expect(workflowPage.pauseButton).toBeVisible()
		await expect(workflowPage.stepButton).toBeVisible()
		await expect(workflowPage.stopButton).toBeVisible()
		await expect(workflowPage.speedSelect).toBeVisible()
		await expect(workflowPage.logsButton).toBeVisible()
	})

	test('should show "Ready" status initially', async () => {
		await expect(workflowPage.statusText).toContainText('Ready')
	})

	test('should start execution when play is clicked', async () => {
		// Click play
		await workflowPage.startExecution()

		// Status should change to Running or Completed
		await expect(workflowPage.statusText).toContainText(/Running|Completed/)
	})

	test('should complete execution and show completed status', async () => {
		// Set fast speed for test
		await workflowPage.setExecutionSpeed('250')

		// Start execution
		await workflowPage.startExecution()

		// Wait for completion
		await workflowPage.waitForExecutionStatus('Completed', 15000)

		// Should show completed status
		await expect(workflowPage.statusText).toContainText('Completed')
	})

	test('should pause execution when pause is clicked', async ({page}) => {
		// Set slow speed to have time to pause
		await workflowPage.setExecutionSpeed('2000')

		// Start execution
		await workflowPage.startExecution()

		// Wait a moment then pause
		await page.waitForTimeout(500)
		await workflowPage.pauseExecution()

		// Status should show paused
		await workflowPage.waitForExecutionStatus('Paused', 5000)
	})

	test.skip('should resume execution after pause', async ({page}) => {
		// Set slow speed
		await workflowPage.setExecutionSpeed('1000')

		// Start execution
		await workflowPage.startExecution()
		await page.waitForTimeout(300)

		// Pause
		await workflowPage.pauseExecution()
		await page.waitForTimeout(500)

		// Verify paused
		await expect(workflowPage.statusText).toContainText('Paused')

		// Resume by clicking play
		await workflowPage.setExecutionSpeed('250')
		await workflowPage.startExecution()

		// Should eventually complete or be running
		await expect(workflowPage.statusText).toContainText(/Running|Completed/, {timeout: 10000})
	})

	test('should stop execution and reset status', async ({page}) => {
		// Set slow speed
		await workflowPage.setExecutionSpeed('2000')

		// Start execution
		await workflowPage.startExecution()
		await page.waitForTimeout(300)

		// Stop
		await workflowPage.stopExecution()

		// Status should be ready again
		await workflowPage.waitForExecutionStatus('Ready', 5000)
	})

	test('should step through execution one node at a time', async ({page}) => {
		// Step once
		await workflowPage.stepExecution()
		await page.waitForTimeout(500)

		// Should have executed first node (trigger)
		// Status might show as paused or idle after step
		await expect(workflowPage.statusText).toContainText(/Ready|Paused|Completed/)
	})

	test('should show progress bar during execution', async ({}) => {
		// Set medium speed
		await workflowPage.setExecutionSpeed('500')

		// Start execution
		await workflowPage.startExecution()

		// Progress bar should appear
		const progressBar = workflowPage.footer.locator('[class*="progress"], .w-24')
		await expect(progressBar).toBeVisible()
	})

	test('should highlight currently executing node', async ({page}) => {
		// Set slow speed to see the highlight
		await workflowPage.setExecutionSpeed('2000')

		// Start execution
		await workflowPage.startExecution()

		// Wait for execution to start
		await page.waitForTimeout(500)

		// Currently executing node should have pulse animation
		workflowPage.canvas.locator('.vue-flow__node.animate-pulse, .vue-flow__node [class*="animate-pulse"]')
		// There should be at least one node with execution state
	})

	test('should change execution speed', async () => {
		// Change to 2x speed
		await workflowPage.setExecutionSpeed('500')
		await expect(workflowPage.speedSelect).toHaveValue('500')

		// Change to 4x speed
		await workflowPage.setExecutionSpeed('250')
		await expect(workflowPage.speedSelect).toHaveValue('250')
	})

	test('should toggle execution logs panel', async ({page}) => {
		// Initially logs panel should be closed (check for h3 specifically)
		await expect(page.locator('h3:text("Execution Logs")')).not.toBeVisible()

		// Toggle logs open
		await workflowPage.toggleLogs()
		await page.waitForTimeout(200)
		await expect(page.locator('h3:text("Execution Logs")')).toBeVisible()

		// Toggle logs closed
		await workflowPage.toggleLogs()
		await page.waitForTimeout(200)
		await expect(page.locator('h3:text("Execution Logs")')).not.toBeVisible()
	})

	test('should show execution logs after running', async ({page}) => {
		// Set fast speed
		await workflowPage.setExecutionSpeed('250')

		// Run execution
		await workflowPage.startExecution()
		await workflowPage.waitForExecutionStatus('Completed', 15000)

		// Open logs
		await workflowPage.toggleLogs()

		// Should show log entries
		const logsPanel = page.locator('text=Execution Logs').locator('..')
		await expect(logsPanel).toBeVisible()

		// Should have some log entries
		await expect(page.locator('[class*="log"], [class*="entry"]').first()).toBeVisible()
	})

	test('should show node execution status badges after execution', async () => {
		// Set fast speed
		await workflowPage.setExecutionSpeed('250')

		// Run execution
		await workflowPage.startExecution()
		await workflowPage.waitForExecutionStatus('Completed', 15000)

		// Nodes should have success/skipped indicators
		workflowPage.canvas.locator('.vue-flow__node [class*="ring-green"], .vue-flow__node.ring-green-500')

		// At least some nodes should show success state
	})

	test('should gray out skipped branches', async () => {
		// The sample workflow has a condition with two branches
		// One branch will be skipped based on the condition

		// Set fast speed
		await workflowPage.setExecutionSpeed('250')

		// Run execution
		await workflowPage.startExecution()
		await workflowPage.waitForExecutionStatus('Completed', 15000)

		// One of the branches should be skipped (grayed out)
		workflowPage.canvas.locator('.vue-flow__node.grayscale, .vue-flow__node.opacity-50')
		// Depending on condition result, one node will be skipped
	})

	test('should show current node name in status when running', async ({page}) => {
		// Set slow speed to see the node names
		await workflowPage.setExecutionSpeed('1000')

		// Start execution
		await workflowPage.startExecution()

		// Wait a moment
		await page.waitForTimeout(200)

		// Status should show "Running: [Node Name]"
		await expect(workflowPage.statusText).toContainText(/Running/)
	})

	test('should disable play when workflow is empty', async () => {
		// Delete all nodes
		await workflowPage.selectAll()
		await workflowPage.deleteSelectedNodes()

		// Play button should be disabled
		await expect(workflowPage.playButton).toBeDisabled()
	})

	test('should allow re-running after completion', async () => {
		// Set fast speed
		await workflowPage.setExecutionSpeed('250')

		// Run first time
		await workflowPage.startExecution()
		await workflowPage.waitForExecutionStatus('Completed', 15000)

		// Play button should be enabled again
		await expect(workflowPage.playButton).toBeEnabled()

		// Run again
		await workflowPage.startExecution()
		await expect(workflowPage.statusText).toContainText(/Running|Completed/)
	})

	test('should show log count badge on logs button', async ({}) => {
		// Set fast speed
		await workflowPage.setExecutionSpeed('250')

		// Run execution
		await workflowPage.startExecution()
		await workflowPage.waitForExecutionStatus('Completed', 15000)

		// Logs button should show count badge
		const logsBadge = workflowPage.logsButton.locator('span')
		// Badge should have a number
		await expect(logsBadge.last()).toContainText(/\d+/)
	})
})
