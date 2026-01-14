import { Page, Locator, expect } from '@playwright/test'

/**
 * Helper class for interacting with the workflow automation builder
 */
export class WorkflowPage {
  constructor(public readonly page: Page) {}

  // Locators
  get canvas() {
    return this.page.locator('.vue-flow')
  }

  get nodePalette() {
    // Left sidebar with "Nodes" title - use aside:has to get the whole sidebar
    return this.page.locator('aside:has(span:text("Nodes"))')
  }

  get configPanel() {
    // Right sidebar with "Configuration" title
    return this.page.locator('aside:has(span:text("Configuration"))')
  }

  get header() {
    return this.page.locator('header')
  }

  get footer() {
    return this.page.locator('footer')
  }

  get workflowNameInput() {
    return this.header.locator('input[placeholder="Workflow name"]')
  }

  get saveButton() {
    return this.header.getByRole('button', { name: /Save/ })
  }

  get loadButton() {
    return this.header.getByRole('button', { name: 'Load' })
  }

  get undoButton() {
    return this.header.locator('button[title*="Undo"]')
  }

  get redoButton() {
    return this.header.locator('button[title*="Redo"]')
  }

  get exportButton() {
    return this.header.locator('button[title="Export workflow"]')
  }

  get importButton() {
    return this.header.locator('button[title="Import workflow"]')
  }

  // Execution controls
  get playButton() {
    return this.footer.locator('button[title*="Play"], button[title*="Resume"]').first()
  }

  get pauseButton() {
    return this.footer.locator('button[title="Pause"]')
  }

  get stepButton() {
    return this.footer.locator('button[title*="Step"]')
  }

  get stopButton() {
    return this.footer.locator('button[title="Stop"]')
  }

  get speedSelect() {
    return this.footer.locator('select')
  }

  get logsButton() {
    return this.footer.locator('button:has-text("Logs")')
  }

  get statusText() {
    return this.footer.locator('span').filter({ hasText: /Ready|Running|Paused|Completed|Error/ })
  }

  // Methods
  async goto() {
    await this.page.goto('/')
    // Wait for the app to be fully loaded
    await this.canvas.waitFor({ state: 'visible' })
    // Wait for sample workflow to load
    await this.page.waitForTimeout(500)
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear())
  }

  async getNodeByLabel(label: string): Promise<Locator> {
    return this.canvas.locator('.vue-flow__node').filter({ hasText: label })
  }

  async getNodes(): Promise<Locator> {
    return this.canvas.locator('.vue-flow__node')
  }

  async getEdges(): Promise<Locator> {
    return this.canvas.locator('.vue-flow__edge')
  }

  async selectNode(label: string) {
    const node = await this.getNodeByLabel(label)
    await node.click()
    // Wait for config panel to open
    await this.page.waitForTimeout(100)
  }

  async deleteSelectedNodes() {
    await this.page.keyboard.press('Delete')
  }

  async dragNodeFromPalette(nodeType: string, targetX: number, targetY: number) {
    const paletteNode = this.nodePalette.locator(`[data-node-type="${nodeType}"]`)
    const canvasBounds = await this.canvas.boundingBox()

    if (!canvasBounds) throw new Error('Canvas not found')

    await paletteNode.dragTo(this.canvas, {
      targetPosition: { x: targetX, y: targetY }
    })

    // Wait for node to be added
    await this.page.waitForTimeout(200)
  }

  async searchNodes(query: string) {
    const searchInput = this.nodePalette.locator('input[placeholder="Search nodes..."]')
    await searchInput.fill(query)
  }

  async clearNodeSearch() {
    const searchInput = this.nodePalette.locator('input[placeholder="Search nodes..."]')
    await searchInput.clear()
  }

  async getConfigFieldByLabel(label: string): Promise<Locator> {
    return this.configPanel.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select')
  }

  async fillConfigField(label: string, value: string) {
    const field = await this.getConfigFieldByLabel(label)
    await field.clear()
    await field.fill(value)
  }

  async setWorkflowName(name: string) {
    await this.workflowNameInput.clear()
    await this.workflowNameInput.fill(name)
  }

  async saveWorkflow() {
    await this.saveButton.click()
    // Wait for save to complete
    await this.page.waitForTimeout(500)
  }

  async openLoadDialog() {
    await this.loadButton.click()
    // Wait for modal
    await this.page.waitForTimeout(200)
  }

  async closeModal() {
    await this.page.keyboard.press('Escape')
  }

  // Execution methods
  async startExecution() {
    await this.playButton.click()
  }

  async pauseExecution() {
    await this.pauseButton.click()
  }

  async stepExecution() {
    await this.stepButton.click()
  }

  async stopExecution() {
    await this.stopButton.click()
  }

  async setExecutionSpeed(speed: string) {
    await this.speedSelect.selectOption(speed)
  }

  async toggleLogs() {
    await this.logsButton.click()
  }

  async waitForExecutionStatus(status: string, timeout = 10000) {
    await expect(this.statusText).toContainText(status, { timeout })
  }

  // Keyboard shortcuts
  async undo() {
    await this.page.keyboard.press('Control+z')
  }

  async redo() {
    await this.page.keyboard.press('Control+Shift+z')
  }

  async selectAll() {
    await this.page.keyboard.press('Control+a')
  }

  async copy() {
    await this.page.keyboard.press('Control+c')
  }

  async paste() {
    await this.page.keyboard.press('Control+v')
  }

  async duplicate() {
    await this.page.keyboard.press('Control+d')
  }

  async escape() {
    await this.page.keyboard.press('Escape')
  }

  async nudgeUp() {
    await this.page.keyboard.press('ArrowUp')
  }

  async nudgeDown() {
    await this.page.keyboard.press('ArrowDown')
  }

  async nudgeLeft() {
    await this.page.keyboard.press('ArrowLeft')
  }

  async nudgeRight() {
    await this.page.keyboard.press('ArrowRight')
  }
}

/**
 * Test fixture for workflow tests
 */
export async function setupWorkflowTest(page: Page): Promise<WorkflowPage> {
  const workflowPage = new WorkflowPage(page)
  // Navigate first, then clear localStorage, then reload for clean state
  await workflowPage.goto()
  await workflowPage.clearLocalStorage()
  await page.reload()
  await workflowPage.canvas.waitFor({ state: 'visible' })
  await page.waitForTimeout(500)
  return workflowPage
}
