<script setup lang="ts">
import {onMounted} from 'vue'
import {useHistoryStore, useWorkflowStore, useUIStore} from '@/stores'
import {useKeyboardShortcuts} from '@/composables/useKeyboardShortcuts'
import {useWorkflowPersistence} from '@/composables/useWorkflowPersistence'
import Sidebar from '@/components/ui/Sidebar.vue'
import NodePalette from '@/components/ui/NodePalette.vue'
import ConfigPanel from '@/components/ui/ConfigPanel.vue'
import AppHeader from '@/components/ui/AppHeader.vue'
import AppFooter from '@/components/ui/AppFooter.vue'
import WorkflowList from '@/components/ui/WorkflowList.vue'
import ExportDialog from '@/components/ui/ExportDialog.vue'
import ImportDialog from '@/components/ui/ImportDialog.vue'
import ExecutionLogs from '@/components/ui/ExecutionLogs.vue'
import {WorkflowCanvas} from '@/components/canvas'
import {createWorkflowNode} from '@/utils/nodeDefinitions'

const workflowStore = useWorkflowStore()
const historyStore = useHistoryStore()
const uiStore = useUIStore()

// Set up keyboard shortcuts
useKeyboardShortcuts()

// Set up persistence operations
const persistence = useWorkflowPersistence()

// Set up history snapshot handlers
onMounted(() => {
  historyStore.setSnapshotHandlers(
      () => ({
        nodes: workflowStore.nodes,
        edges: workflowStore.edges,
        viewport: workflowStore.viewport,
      }),
      (snapshot) => workflowStore.restoreSnapshot(snapshot)
  )

  // Add sample nodes for testing (remove in production)
  if (workflowStore.nodes.length === 0) {
    const triggerId = workflowStore.addNode(
        createWorkflowNode('manual-trigger', {x: 100, y: 150})
    )
    const conditionId = workflowStore.addNode(
        createWorkflowNode('condition', {x: 350, y: 150})
    )
    const emailId = workflowStore.addNode(
        createWorkflowNode('send-email', {x: 600, y: 80})
    )
    const smsId = workflowStore.addNode(
        createWorkflowNode('send-sms', {x: 600, y: 220})
    )

    // Connect nodes
    workflowStore.addEdge({source: triggerId, target: conditionId})
    workflowStore.addEdge({
      source: conditionId,
      target: emailId,
      sourceHandle: 'true',
      label: 'Yes',
    })
    workflowStore.addEdge({
      source: conditionId,
      target: smsId,
      sourceHandle: 'false',
      label: 'No',
    })
  }
})
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden" role="application" aria-label="Workflow Automation Builder">
    <!-- Header -->
    <AppHeader
        :save-status="persistence.saveStatus.value"
        :is-saving="workflowStore.isSaving"
        @save="persistence.handleSave"
        @load="persistence.handleLoad"
        @export="persistence.handleExport"
        @import="persistence.handleImport"
    />

    <!-- Main Content -->
    <main class="flex flex-1 overflow-hidden" role="main">
      <!-- Left Sidebar - Node Palette -->
      <Sidebar title="Nodes" side="left">
        <NodePalette/>
      </Sidebar>

      <!-- Canvas -->
      <div class="flex-1 relative bg-gray-900">
        <WorkflowCanvas/>
      </div>

      <!-- Right Sidebar - Config Panel -->
      <Sidebar title="Configuration" side="right">
        <ConfigPanel/>
      </Sidebar>
    </main>

    <!-- Execution Logs Panel -->
    <div
        v-if="uiStore.isExecutionPanelOpen"
        class="h-64 border-t border-gray-700 flex-shrink-0"
    >
      <ExecutionLogs/>
    </div>

    <!-- Footer -->
    <AppFooter/>

    <!-- Workflow List Modal -->
    <div
        v-if="persistence.showWorkflowList.value"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Workflow list"
        @click.self="persistence.showWorkflowList.value = false"
    >
      <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col border border-gray-700">
        <WorkflowList @close="persistence.showWorkflowList.value = false"/>
      </div>
    </div>

    <!-- Export Dialog -->
    <ExportDialog
        v-model="persistence.showExportDialog.value"
        @download="persistence.downloadExport"
    />

    <!-- Import Dialog -->
    <ImportDialog
        v-model="persistence.showImportDialog.value"
        @import="() => {}"
    />
  </div>
</template>
