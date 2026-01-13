import BaseNode from './BaseNode.vue'
import {markRaw} from "vue";

// Node type components mapping for VueFlow
export const nodeTypes = {
	// All workflow nodes use the same base component
	// The component internally handles different node types via props
	'workflow-node': markRaw(BaseNode),
}

export {BaseNode}
