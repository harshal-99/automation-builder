import type { WorkflowState } from '@/types'
import newLeadWelcomeTemplate from '@/templates/new-lead-welcome.json'
import abandonedCartRecoveryTemplate from '@/templates/abandoned-cart-recovery.json'

// Type assertions for JSON imports
const newLeadWelcomeWorkflow = newLeadWelcomeTemplate as WorkflowState
const abandonedCartRecoveryWorkflow = abandonedCartRecoveryTemplate as WorkflowState

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  workflow: WorkflowState
}

/**
 * Service for managing workflow templates
 */
export class TemplatesService {
  private static templates: WorkflowTemplate[] = [
    {
      id: 'new-lead-welcome',
      name: 'New Lead Welcome & Follow-up',
      description: 'Automatically welcome new leads with an initial email, wait 24 hours, then send a follow-up email with additional resources.',
      workflow: newLeadWelcomeWorkflow,
    },
    {
      id: 'abandoned-cart-recovery',
      name: 'Abandoned Cart Recovery',
      description: 'Detect abandoned carts, send a recovery email, wait 2 hours, then send an SMS reminder if the cart is still abandoned.',
      workflow: abandonedCartRecoveryWorkflow,
    },
  ]

  /**
   * Get all available templates
   */
  static getTemplates(): WorkflowTemplate[] {
    return this.templates
  }

  /**
   * Get a template by ID
   */
  static getTemplate(id: string): WorkflowTemplate | null {
    return this.templates.find(t => t.id === id) || null
  }

  /**
   * Load a template workflow (creates a new workflow from template with new ID and timestamps)
   */
  static loadTemplate(id: string): WorkflowState | null {
    const template = this.getTemplate(id)
    if (!template) {
      return null
    }

    // Create a new workflow from the template with fresh ID and timestamps
    const now = new Date().toISOString()
    return {
      ...template.workflow,
      id: crypto.randomUUID(),
      name: template.workflow.name,
      createdAt: now,
      updatedAt: now,
    }
  }
}
