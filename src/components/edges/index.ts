import { markRaw, type Component } from 'vue'
import LabeledEdge from './LabeledEdge.vue'

// Export individual components
export { LabeledEdge }

// Export edge types map for VueFlow
export const edgeTypes: Record<string, Component> = {
  labeled: markRaw(LabeledEdge),
}
