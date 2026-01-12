# Workflow Automation Builder - Implementation Plan

## Overview

This document outlines a phased approach to building a node-based workflow builder using Vue 3, TypeScript, and VueFlow. The plan is organized into 6 phases, progressing from foundation to polish.

---

## Phase 1: Project Foundation & Setup ✅ COMPLETED

### 1.1 Project Initialization
- [x] Initialize Vue 3 + TypeScript project with Vite
- [x] Configure TypeScript strict mode
- [x] Set up folder structure:
  ```
  src/
  ├── components/
  │   ├── canvas/
  │   ├── nodes/
  │   ├── panels/
  │   └── ui/
  ├── composables/
  ├── stores/
  ├── types/
  ├── schemas/
  ├── utils/
  └── assets/
  ```

### 1.2 Dependencies Installation
- [x] Install core dependencies:
  - `@vue-flow/core` - Graph/canvas library
  - `@vue-flow/background` - Canvas background
  - `@vue-flow/controls` - Zoom/pan controls
  - `@vue-flow/minimap` - Minimap component
  - `pinia` - State management
  - `immer` - Immutable state updates
  - `zod` - Schema validation
  - `tailwindcss` - Styling
  - `@vueuse/core` - Utility composables
  - `uuid` - ID generation

### 1.3 Base Configuration
- [x] Configure TailwindCSS with custom theme
- [x] Set up Pinia store structure
- [x] Create base TypeScript types/interfaces
- [x] Configure VueFlow defaults

**Deliverables:** Runnable empty app with all dependencies configured ✅

---

## Phase 2: Canvas & Graph Foundation

### 2.1 Canvas Setup
- [x] Create main `WorkflowCanvas.vue` component
- [x] Implement VueFlow canvas with:
  - Pan & zoom functionality
  - Grid background with snap-to-grid
  - Minimap display
  - Fit-view control
- [x] Set up canvas viewport state management

### 2.2 Basic Node Implementation ✅ COMPLETED
- [x] Define base node interface and types:
  ```typescript
  interface WorkflowNode {
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: NodeData;
    selected?: boolean;
  }
  ```
- [x] Create custom node component wrapper (`BaseNode.vue`)
- [x] Implement node selection (single & multi-select via Shift key)
- [x] Add node deletion functionality (Delete key)

### 2.3 Edge/Connection System ✅ COMPLETED
- [x] Define edge types and interfaces
- [x] Implement connection handles (source/target)
- [x] Create edge validation rules (typed ports)
- [x] Add edge labels support (for conditional branches)
- [x] Implement edge deletion

### 2.4 Graph Validation ✅ COMPLETED
- [x] Implement acyclic graph validation (DAG check)
- [x] Create connection compatibility checker
- [x] Add visual feedback for invalid connections

**Deliverables:** Interactive canvas with basic node/edge operations

---

## Phase 3: Node Types & Palette

### 3.1 Node Palette Component ✅ COMPLETED
- [x] Create `NodePalette.vue` sidebar component
- [x] Implement drag-and-drop from palette to canvas
- [x] Group nodes by category (Triggers, Actions, Logic)
- [x] Add node search/filter functionality

### 3.2 Trigger Nodes ✅ COMPLETED
- [x] **Manual Trigger**
  - Schema: `{ name: string }`
  - Single output port
- [x] **Webhook Trigger**
  - Schema: `{ url: string, method: 'GET'|'POST', headers?: Record<string, string> }`
  - Single output port

### 3.3 Action Nodes
- [ ] **HTTP Request**
  - Schema: `{ url: string, method: string, headers?: object, body?: string, timeout?: number }`
  - Input port, output port, error port
- [ ] **Send Email**
  - Schema: `{ to: string, subject: string, body: string, cc?: string }`
  - Input port, success/error outputs
- [ ] **Send SMS**
  - Schema: `{ phoneNumber: string, message: string }`
  - Input port, success/error outputs
- [ ] **Delay**
  - Schema: `{ duration: number, unit: 'seconds'|'minutes'|'hours' }`
  - Input port, output port

### 3.4 Logic Nodes
- [ ] **Condition**
  - Schema: `{ expression: string, operator: string, value: any }`
  - Input port, true/false output ports (labeled)
- [ ] **Transform**
  - Schema: `{ transformations: Array<{ field: string, operation: string, value: any }> }`
  - Input port, output port

### 3.5 Node Styling
- [ ] Create consistent node visual design
- [ ] Add icons for each node type
- [ ] Implement status indicators (idle, running, success, error, skipped)
- [ ] Style connection handles by type

**Deliverables:** Complete node palette with all node types implemented

---

## Phase 4: Configuration Panel & Validation

### 4.1 Config Panel Component
- [ ] Create `ConfigPanel.vue` sidebar component
- [ ] Implement panel open/close on node selection
- [ ] Display node type and metadata
- [ ] Add delete node button in panel

### 4.2 Schema-Driven Form Generation
- [ ] Create Zod schemas for each node type
- [ ] Build `SchemaForm.vue` component that generates fields from schema
- [ ] Implement field types:
  - Text input
  - Number input
  - Select/dropdown
  - Textarea
  - Toggle/checkbox
  - Key-value pairs (for headers)
  - Expression builder (for conditions)

### 4.3 Validation System
- [ ] Integrate Zod validation with forms
- [ ] Implement real-time validation on input
- [ ] Display inline error messages
- [ ] Disable the Save button when the form is invalid
- [ ] Add visual indicators for required fields

### 4.4 Form State Management
- [ ] Track form dirty state
- [ ] Implement form reset functionality
- [ ] Handle unsaved changes warning
- [ ] Auto-save form data to node

**Deliverables:** Fully functional config panel with validation

---

## Phase 5: State Management & Persistence

### 5.1 Pinia Store Architecture
- [ ] Create `workflowStore`:
  ```typescript
  interface WorkflowState {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    viewport: { x: number; y: number; zoom: number };
    selectedNodes: string[];
    selectedEdges: string[];
  }
  ```
- [ ] Create `historyStore` for undo/redo
- [ ] Create `uiStore` for UI state (panel open, palette collapsed, etc.)

### 5.2 Immutable State Updates
- [ ] Integrate Immer with Pinia actions
- [ ] Create helper functions for common mutations
- [ ] Ensure all state changes go through store

### 5.3 Undo/Redo System
- [ ] Implement history stack with configurable limit (50 entries)
- [ ] Create action batching for multi-operations:
  - Multi-node drag
  - Multi-node delete
  - Paste multiple nodes
- [ ] Add keyboard shortcuts:
  - `Ctrl/Cmd + Z` - Undo
  - `Ctrl/Cmd + Shift + Z` - Redo
- [ ] Implement history state serialization
- [ ] Add undo/redo buttons in toolbar

### 5.4 Keyboard Shortcuts
- [ ] `Delete/Backspace` - Delete selected
- [ ] `Ctrl/Cmd + A` - Select all
- [ ] `Ctrl/Cmd + C` - Copy
- [ ] `Ctrl/Cmd + V` - Paste
- [ ] `Ctrl/Cmd + D` - Duplicate
- [ ] `Escape` - Deselect all
- [ ] Arrow keys – Nudge selected nodes

### 5.5 Local Persistence
- [ ] Create a persistence service (LocalStorage or IndexedDB fallback)
- [ ] Implement autosave with debouncing (2-second delay)
- [ ] Add explicit Save/Load buttons
- [ ] Save workflow state:
  - Nodes and edges
  - Viewport position and zoom
  - Metadata (name, description, timestamps)
- [ ] Implement workflow list management
- [ ] Add export/import JSON functionality

**Deliverables:** Complete state management with undo/redo and persistence

---

## Phase 6: Run Preview & Simulation

### 6.1 Execution Engine
- [ ] Create `ExecutionEngine` class
- [ ] Implement topological sort for execution order
- [ ] Handle node execution simulation:
  - Trigger nodes start execution
  - Action nodes simulate API calls (mock responses)
  - Condition nodes evaluate expressions
  - Transform nodes process data

### 6.2 Execution State
- [ ] Create `executionStore`:
  ```typescript
  interface ExecutionState {
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentNodeId: string | null;
    nodeStatuses: Record<string, NodeExecutionStatus>;
    logs: ExecutionLog[];
    executionData: Record<string, any>;
  }
  ```
- [ ] Track per-node status: pending, running, success, error, skipped

### 6.3 Preview Controls
- [ ] Create `ExecutionControls.vue` component
- [ ] Implement controls:
  - **Play** - Start/resume execution
  - **Pause** - Pause at current step
  - **Step** – Execute a single node
  - **Stop** - Reset execution
- [ ] Add execution speed control
- [ ] Display current execution progress

### 6.4 Visual Feedback
- [ ] Highlight currently executing node
- [ ] Animate edge flow during execution
- [ ] Show execution path (completed nodes)
- [ ] Display node status badges
- [ ] Gray out skipped branches

### 6.5 Execution Logs Panel
- [ ] Create `ExecutionLogs.vue` component
- [ ] Display per-step logs:
  - Timestamp
  - Node name
  - Status (success/error/skipped)
  - Input data
  - Output data / Error message
- [ ] Add log filtering and search
- [ ] Implement log export

**Deliverables:** Complete run preview with visual simulation

---

## Phase 7: Testing & Quality

### 7.1 Unit Tests
- [ ] Test Zod schemas validation
- [ ] Test store mutations
- [ ] Test undo/redo logic
- [ ] Test graph validation (acyclic check)
- [ ] Test topological sort

### 7.2 Component Tests
- [ ] Test node components render correctly
- [ ] Test config panel form validation
- [ ] Test palette drag-and-drop

### 7.3 Integration Tests
- [ ] Test complete flow: create → connect → configure → save → reload
- [ ] Test invalid input disables save
- [ ] Test undo/redo state rollback
- [ ] Test workflow persistence and reload
- [ ] Test run preview execution

### 7.4 E2E Tests (Optional)
- [ ] Test complete user workflows using Cypress/Playwright

**Deliverables:** Passing test suite with documented test cases

---

## Phase 8: Polish & Documentation

### 8.1 Accessibility (Bonus)
- [ ] Add focus rings for keyboard navigation
- [ ] Implement ARIA roles and labels
- [ ] Support reduced motion preference
- [ ] Test with screen reader

### 8.2 Performance Optimization (Bonus)
- [ ] Virtualize node rendering for large graphs
- [ ] Optimize re-renders with `shallowRef`
- [ ] Test with 200 nodes / 400 edges
- [ ] Add loading states for heavy operations

### 8.3 Sample Workflows
- [ ] Create "New Lead Welcome & Follow-up" workflow JSON
- [ ] Create "Abandoned Cart Recovery" workflow JSON
- [ ] Add workflow templates to app

### 8.4 Documentation
- [ ] Write README with:
  - Architecture overview
  - State shape documentation
  - How to add a new node type
  - Undo/redo logic explanation
- [ ] Add inline code comments for complex logic

**Deliverables:** Polished app with documentation and sample workflows

---

## Dependency Graph

```
Phase 1 (Foundation)
    ↓
Phase 2 (Canvas) ──────────────┐
    ↓                          ↓
Phase 3 (Nodes) ←──────→ Phase 4 (Config Panel)
    ↓                          ↓
    └──────────┬───────────────┘
               ↓
         Phase 5 (State & Persistence)
               ↓
         Phase 6 (Run Preview)
               ↓
         Phase 7 (Testing)
               ↓
         Phase 8 (Polish)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| VueFlow learning curve | Start with simple examples, refer to docs |
| Complex undo/redo edge cases | Batch operations, thorough testing |
| Performance with many nodes | Early profiling, virtualization if needed |
| State synchronization bugs | Single source of truth in Pinia |
| Validation complexity | Leverage Zod's built-in features |

---

## Success Criteria

- [ ] All node types functional with proper validation
- [ ] Smooth canvas interactions (60fps pan/zoom)
- [ ] Undo/redo works reliably for all operations
- [ ] Workflows persist and reload correctly
- [ ] Run preview accurately simulates execution flow
- [ ] All integration tests pass
- [ ] Sample workflows demonstrate full capabilities
