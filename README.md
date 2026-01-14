# Workflow Automation Builder

A node-based workflow builder built with Vue 3, TypeScript, and VueFlow. Create, configure, and simulate automation workflows visually with a drag-and-drop interface.

## Features

- **Visual Canvas**: Drag-and-drop nodes from a palette, connect them with edges, pan/zoom, and use a minimap
- **Dynamic Configuration**: Schema-driven forms with real-time validation using Zod
- **Undo/Redo**: Full history management with batched operations for multi-node actions
- **Local Persistence**: Auto-save and manual save/load workflows to LocalStorage
- **Run Preview**: Simulate workflow execution with play, pause, step controls, and visual feedback
- **Keyboard Shortcuts**: Comprehensive keyboard support for common operations
- **Accessibility**: ARIA labels, focus management, and reduced motion support

## Tech Stack

- **Framework**: Vue 3 with Composition API + TypeScript
- **Graph Library**: VueFlow (@vue-flow/core)
- **State Management**: Pinia with Immer for immutable updates
- **Validation**: Zod for schema validation
- **Styling**: TailwindCSS
- **Testing**: Vitest (unit/integration) + Playwright (E2E)

## Project Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

```sh
npm install
```

### Development

```sh
npm run dev
```

### Build

```sh
npm run build
```

### Testing

```sh
# Unit and integration tests
npm run test

# E2E tests
npm run test:e2e
```

---

## Architecture Overview

The application follows a modular architecture with clear separation of concerns:

```
src/
├── components/          # Vue components
│   ├── canvas/         # WorkflowCanvas - main graph view
│   ├── nodes/          # BaseNode - node rendering
│   ├── edges/          # LabeledEdge - edge rendering
│   └── ui/             # UI components (panels, dialogs, etc.)
├── stores/             # Pinia stores (state management)
│   ├── workflow.ts     # Main workflow state (nodes, edges, viewport)
│   ├── history.ts      # Undo/redo history management
│   ├── execution.ts    # Execution state (run preview)
│   └── ui.ts           # UI state (panels, modals)
├── services/           # Business logic services
│   └── ExecutionEngine.ts  # Workflow execution simulation
├── schemas/            # Zod validation schemas
│   ├── nodeSchemas.ts  # Node configuration schemas
│   └── formSchemas.ts  # Form field definitions
├── utils/              # Utility functions
│   ├── nodeDefinitions.ts  # Node type definitions
│   ├── workflowUtils.ts    # Workflow operations
│   └── persistence.ts      # LocalStorage persistence
├── types/              # TypeScript type definitions
└── composables/        # Vue composables
```

### Data Flow

1. **User Interaction** → Component emits event
2. **Component** → Calls store action
3. **Store Action** → Updates state (via Immer for immutability)
4. **Store Action** → Saves history snapshot (if needed)
5. **State Change** → Triggers reactive updates
6. **Components** → Re-render with new state

### Key Architectural Patterns

- **Single Source of Truth**: All workflow state lives in Pinia stores
- **Immutable Updates**: All state mutations use Immer for safe updates
- **Schema-Driven Forms**: Form fields generated from Zod schemas
- **Composition API**: All components use `<script setup>` with Composition API
- **Type Safety**: Full TypeScript coverage with strict mode

---

## State Shape Documentation

### Workflow Store (`workflow.ts`)

The main store managing the workflow graph:

```typescript
interface WorkflowState {
  id: string                    // Unique workflow ID
  name: string                  // Workflow name
  description?: string          // Optional description
  nodes: WorkflowNode[]         // Array of nodes in the graph
  edges: WorkflowEdge[]         // Array of edges (connections)
  viewport: ViewportState       // Canvas viewport (x, y, zoom)
  createdAt: string            // ISO timestamp
  updatedAt: string            // ISO timestamp
}

interface WorkflowNode {
  id: string                    // Unique node ID
  type: 'workflow-node'         // VueFlow component type
  position: { x: number; y: number }
  data: WorkflowNodeData        // Node configuration and metadata
  selected?: boolean            // Selection state
}

interface WorkflowNodeData {
  label: string                 // Display label
  type: NodeType                // Node type (e.g., 'http-request')
  category: 'trigger' | 'action' | 'logic'
  config: Record<string, unknown>  // Node-specific configuration
  isValid: boolean              // Validation status
}

interface WorkflowEdge {
  id: string                    // Unique edge ID
  source: string                // Source node ID
  target: string                // Target node ID
  sourceHandle?: string         // Source port handle
  targetHandle?: string         // Target port handle
  label?: string                // Edge label (for conditions)
  data?: {
    condition?: 'true' | 'false' // For conditional branches
  }
}

interface ViewportState {
  x: number                     // Pan X offset
  y: number                     // Pan Y offset
  zoom: number                  // Zoom level (1.0 = 100%)
}
```

**Key Actions:**
- `addNode()` - Add a new node to the canvas
- `updateNode()` - Update node configuration
- `deleteNodes()` - Delete nodes (and connected edges)
- `addEdge()` - Connect two nodes
- `deleteEdges()` - Remove connections
- `setSelection()` - Select nodes/edges
- `saveWorkflow()` - Persist to LocalStorage
- `loadWorkflow()` - Load from LocalStorage

### History Store (`history.ts`)

Manages undo/redo functionality:

```typescript
interface HistoryState {
  entries: HistoryEntry[]        // Array of history snapshots
  currentIndex: number           // Current position in history (-1 = before first action)
  isBatching: boolean            // Whether operations are batched
}

interface HistoryEntry {
  id: string
  timestamp: string              // ISO timestamp
  actionType: HistoryActionType  // Type of action (ADD_NODE, DELETE_NODE, etc.)
  description: string            // Human-readable description
  snapshot: WorkflowSnapshot     // Full workflow state at this point
}

interface WorkflowSnapshot {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport: ViewportState
}
```

**Key Actions:**
- `saveSnapshot()` - Save current state to history
- `undo()` - Restore previous state
- `redo()` - Restore next state
- `startBatch()` / `endBatch()` - Batch multiple operations into one history entry

**History Limit**: Maximum 50 entries (oldest entries are removed when limit exceeded)

### Execution Store (`execution.ts`)

Manages workflow execution state (run preview):

```typescript
interface ExecutionState {
  status: ExecutionStatus        // 'idle' | 'running' | 'paused' | 'completed' | 'error'
  currentNodeId: string | null   // Currently executing node
  nodeStates: Record<string, NodeExecutionState>  // Per-node execution state
  logs: ExecutionLog[]          // Execution log entries
  executionData: Record<string, unknown>  // Data passed between nodes
  executionSpeed: number         // Delay between steps (ms)
}

interface NodeExecutionState {
  status: NodeExecutionStatus    // 'idle' | 'pending' | 'running' | 'success' | 'error' | 'skipped'
  startedAt?: string
  completedAt?: string
  input?: unknown
  output?: unknown
  error?: string
}

interface ExecutionLog {
  nodeId: string
  nodeName: string
  status: NodeExecutionStatus
  message: string
  input?: unknown
  output?: unknown
  error?: string
  duration?: number              // Execution time in ms
}
```

### UI Store (`ui.ts`)

Manages UI state (panels, modals):

```typescript
interface UIState {
  configPanelOpen: boolean       // Configuration panel visibility
  configPanelNodeId: string | null  // Currently configured node
  nodePaletteOpen: boolean       // Node palette visibility
  executionLogsOpen: boolean    // Execution logs panel visibility
}
```

---

## How to Add a New Node Type

Adding a new node type requires changes in 5 places:

### 1. Define Node Type in Types (`src/types/workflow.ts`)

Add the new type to the `NodeType` union:

```typescript
export type NodeType =
  | 'manual-trigger'
  | 'webhook-trigger'
  | 'http-request'
  | 'send-email'
  | 'send-sms'
  | 'delay'
  | 'condition'
  | 'transform'
  | 'your-new-node'  // Add here
```

Create a TypeScript interface for the node data:

```typescript
export interface YourNewNodeData extends BaseNodeData {
  type: 'your-new-node'
  config: {
    // Define your config fields here
    field1: string
    field2: number
  }
}

// Add to WorkflowNodeData union
export type WorkflowNodeData =
  | ManualTriggerData
  | // ... other types
  | YourNewNodeData  // Add here
```

### 2. Create Zod Schema (`src/schemas/nodeSchemas.ts`)

Define validation schema:

```typescript
export const yourNewNodeSchema = z.object({
  field1: z.string().min(1, 'Field1 is required'),
  field2: z.number().int().positive('Field2 must be positive'),
})

export type YourNewNodeConfig = z.infer<typeof yourNewNodeSchema>
```

### 3. Define Node Definition (`src/utils/nodeDefinitions.ts`)

Add node metadata:

```typescript
export const nodeDefinitions: Record<NodeType, NodeDefinition> = {
  // ... existing nodes
  'your-new-node': {
    type: 'your-new-node',
    category: 'action',  // or 'trigger' or 'logic'
    label: 'Your New Node',
    description: 'What this node does',
    icon: 'icon-name',  // Icon name (must exist in icon system)
    defaultConfig: {
      field1: '',
      field2: 0,
    },
    inputs: 1,  // Number of input ports
    outputs: 1,  // Number of output ports (or { success: 1, error: 1 } for multiple)
  },
}
```

### 4. Create Form Schema (`src/schemas/formSchemas.ts`)

Define form fields:

```typescript
export const yourNewNodeFormSchema: FormSchema = {
  zodSchema: yourNewNodeSchema,
  fields: {
    field1: {
      type: 'text',
      label: 'Field 1',
      placeholder: 'Enter value',
      required: true,
    },
    field2: {
      type: 'number',
      label: 'Field 2',
      required: true,
      min: 0,
    },
  },
  fieldOrder: ['field1', 'field2'],
}

// Register in registry
export const nodeFormSchemas: NodeFormSchemaRegistry = {
  // ... existing schemas
  'your-new-node': yourNewNodeFormSchema,
}
```

### 5. Add Execution Logic (`src/services/ExecutionEngine.ts`)

Implement execution behavior in `executeNodeByType()`:

```typescript
private async executeNodeByType(
  node: WorkflowNode,
  inputData: Record<string, unknown>
): Promise<NodeExecutionResult | null> {
  const { type, config } = node.data

  switch (type) {
    // ... existing cases
    case 'your-new-node': {
      // Implement your node's execution logic
      try {
        // Process input data
        // Perform node operation
        // Return result
        return {
          success: true,
          output: { /* result data */ },
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
        }
      }
    }
  }
}
```

### Optional: Add Mock Response

If your node makes external calls, add a mock response:

```typescript
const mockResponses: Record<string, () => Record<string, unknown>> = {
  // ... existing mocks
  'your-new-node': () => ({
    // Mock response data
  }),
}
```

### Example: Adding a "Database Query" Node

See the pattern above applied:
1. Type: `'database-query'` in `NodeType`
2. Schema: `{ query: string, connectionString: string }`
3. Definition: Category `'action'`, 1 input, 1 output
4. Form: Textarea for query, text for connection string
5. Execution: Simulate database query, return mock results

---

## Undo/Redo Logic Explanation

The undo/redo system uses a **snapshot-based approach** with batching support.

### How It Works

1. **Snapshot Creation**: When an action occurs (e.g., add node), the current workflow state is deep-cloned and saved to the history stack.

2. **History Stack**: History is stored as an array of snapshots:
   ```
   [Snapshot0, Snapshot1, Snapshot2, ...]
                    ↑
              currentIndex
   ```

3. **Undo Operation**:
   - Decrement `currentIndex`
   - Restore the snapshot at the new index
   - If at index 0, restore to initial state (empty workflow)

4. **Redo Operation**:
   - Increment `currentIndex`
   - Restore the snapshot at the new index

5. **Branching Prevention**: If you undo and then perform a new action, all snapshots after the current index are discarded (you can't redo after a new action).

### Batching

Some operations involve multiple state changes but should be treated as a single undoable action:

- **Multi-node drag**: Each position update doesn't create a snapshot
- **Multi-node delete**: All deletions happen, then one snapshot is saved
- **Multi-edge delete**: Same as above

**Batching Flow:**
```typescript
historyStore.startBatch()
// ... perform multiple operations (no snapshots saved)
historyStore.endBatch('Move 5 nodes')  // Single snapshot saved
```

### Implementation Details

**Snapshot Handlers**: The history store doesn't directly access workflow state. Instead, it uses callback functions:

```typescript
// In workflow store initialization
historyStore.setSnapshotHandlers(
  () => getWorkflowSnapshot(),      // Get current state
  (snapshot) => restoreSnapshot(snapshot)  // Restore state
)
```

**Deep Cloning**: Snapshots are deep-cloned using `JSON.parse(JSON.stringify())` to ensure immutability.

**History Limit**: Maximum 50 entries. When exceeded, oldest entries are removed from the beginning of the array.

**State Restoration**: When restoring, the workflow store:
1. Replaces all nodes and edges
2. Filters invalid edges (edges pointing to non-existent nodes)
3. Restores viewport
4. Marks workflow as updated (triggers autosave)

### Example Flow

```
Initial: []
Action 1 (Add Node): [Snapshot1] (index: 0)
Action 2 (Add Edge): [Snapshot1, Snapshot2] (index: 1)
Action 3 (Delete Node): [Snapshot1, Snapshot2, Snapshot3] (index: 2)

Undo: Restore Snapshot2 (index: 1)
Undo: Restore Snapshot1 (index: 0)
Redo: Restore Snapshot2 (index: 1)
Action 4 (Add Node): [Snapshot1, Snapshot2, Snapshot4] (index: 2)
  // Snapshot3 discarded - can't redo to it anymore
```

---

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Prefer Composition API (`<script setup>`)
- Use Pinia stores for state management
- All state mutations must go through store actions
- Use Immer helpers (`updateRef`, `replaceRef`, etc.) for immutable updates

### Testing

- Unit tests: Test utilities and store logic
- Component tests: Test component rendering and interactions
- Integration tests: Test complete workflows
- E2E tests: Test user flows with Playwright

### Adding Features

1. Define types first (`src/types/`)
2. Create schemas for validation (`src/schemas/`)
3. Implement store logic (`src/stores/`)
4. Create components (`src/components/`)
5. Add tests
6. Update documentation

---

