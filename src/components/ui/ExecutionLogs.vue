<script setup lang="ts">
import { computed, ref } from 'vue'
import { useExecutionStore } from '@/stores'
import type { NodeExecutionStatus } from '@/types'
import { IconSvg } from '@/components/ui/icons'

// Icon paths
const clipboardIcon = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
const chevronRightIcon = 'M9 5l7 7-7 7'

const executionStore = useExecutionStore()

// Filter and search state
const searchQuery = ref('')
const statusFilter = ref<NodeExecutionStatus | 'all'>('all')
const expandedLogIds = ref<Set<string>>(new Set())

// Status filter options
const statusOptions: { label: string; value: NodeExecutionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Error', value: 'error' },
  { label: 'Skipped', value: 'skipped' },
  { label: 'Running', value: 'running' },
  { label: 'Pending', value: 'pending' },
]

// Filtered logs
const filteredLogs = computed(() => {
  let logs = [...executionStore.logs].reverse() // Most recent first

  // Apply status filter
  if (statusFilter.value !== 'all') {
    logs = logs.filter(log => log.status === statusFilter.value)
  }

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    logs = logs.filter(log =>
      log.nodeName.toLowerCase().includes(query) ||
      log.message.toLowerCase().includes(query) ||
      (log.error && log.error.toLowerCase().includes(query))
    )
  }

  return logs
})

// Toggle log expansion
function toggleLogExpanded(logId: string) {
  if (expandedLogIds.value.has(logId)) {
    expandedLogIds.value.delete(logId)
  } else {
    expandedLogIds.value.add(logId)
  }
}

function isExpanded(logId: string): boolean {
  return expandedLogIds.value.has(logId)
}

// Format timestamp
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// Format duration
function formatDuration(duration?: number): string {
  if (!duration) return '-'
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(2)}s`
}

// Status badge styles
const statusStyles: Record<NodeExecutionStatus, { bg: string; text: string }> = {
  idle: { bg: 'bg-gray-600', text: 'text-gray-200' },
  pending: { bg: 'bg-yellow-600', text: 'text-yellow-100' },
  running: { bg: 'bg-blue-600', text: 'text-blue-100' },
  success: { bg: 'bg-green-600', text: 'text-green-100' },
  error: { bg: 'bg-red-600', text: 'text-red-100' },
  skipped: { bg: 'bg-gray-500', text: 'text-gray-200' },
}

// Export logs as JSON
function exportLogs() {
  const exportData = {
    exportedAt: new Date().toISOString(),
    executionStatus: executionStore.status,
    startedAt: executionStore.startedAt,
    completedAt: executionStore.completedAt,
    logs: executionStore.logs,
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `execution-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Clear logs
function clearLogs() {
  executionStore.reset()
}

// Format data for display
function formatData(data: Record<string, unknown> | undefined): string {
  if (!data) return 'No data'
  return JSON.stringify(data, null, 2)
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-800 text-gray-100">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
      <h3 class="text-sm font-semibold">Execution Logs</h3>
      <div class="flex items-center gap-2">
        <button
          class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Export logs"
          :disabled="executionStore.logs.length === 0"
          @click="exportLogs"
        >
          Export
        </button>
        <button
          class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Clear logs"
          :disabled="executionStore.logs.length === 0"
          @click="clearLogs"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-700 bg-gray-750">
      <!-- Search -->
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search logs..."
          class="w-full px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 placeholder-gray-400"
        />
      </div>

      <!-- Status Filter -->
      <select
        v-model="statusFilter"
        class="px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
      >
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Log Entries -->
    <div class="flex-1 overflow-y-auto">
      <!-- Empty state -->
      <div
        v-if="filteredLogs.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-500"
      >
        <IconSvg :path="clipboardIcon" size="w-12 h-12" class="mb-2" />
        <p class="text-sm">
          {{ executionStore.logs.length === 0 ? 'No execution logs yet' : 'No matching logs' }}
        </p>
        <p v-if="executionStore.logs.length === 0" class="text-xs mt-1">
          Run a workflow to see logs here
        </p>
      </div>

      <!-- Log list -->
      <div v-else class="divide-y divide-gray-700">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="hover:bg-gray-750 transition-colors"
        >
          <!-- Log header (clickable) -->
          <div
            class="flex items-center gap-3 px-4 py-2 cursor-pointer"
            @click="toggleLogExpanded(log.id)"
          >
            <!-- Expand icon -->
            <span
              class="transition-transform"
              :class="{ 'rotate-90': isExpanded(log.id) }"
            >
              <IconSvg :path="chevronRightIcon" class="text-gray-500" />
            </span>

            <!-- Timestamp -->
            <span class="text-xs text-gray-500 font-mono w-20 shrink-0">
              {{ formatTime(log.timestamp) }}
            </span>

            <!-- Status badge -->
            <span
              class="px-2 py-0.5 text-xs font-medium rounded shrink-0"
              :class="[statusStyles[log.status].bg, statusStyles[log.status].text]"
            >
              {{ log.status }}
            </span>

            <!-- Node name -->
            <span class="text-sm font-medium truncate">
              {{ log.nodeName }}
            </span>

            <!-- Duration -->
            <span class="text-xs text-gray-500 ml-auto shrink-0">
              {{ formatDuration(log.duration) }}
            </span>
          </div>

          <!-- Log details (expanded) -->
          <div
            v-if="isExpanded(log.id)"
            class="px-4 pb-3 pl-11 space-y-2"
          >
            <!-- Message -->
            <div>
              <span class="text-xs text-gray-500">Message:</span>
              <p class="text-sm text-gray-300">{{ log.message }}</p>
            </div>

            <!-- Error (if any) -->
            <div v-if="log.error" class="mt-2">
              <span class="text-xs text-red-400">Error:</span>
              <p class="text-sm text-red-300 font-mono bg-red-900/20 px-2 py-1 rounded mt-1">
                {{ log.error }}
              </p>
            </div>

            <!-- Input data -->
            <div v-if="log.input && Object.keys(log.input).length > 0" class="mt-2">
              <span class="text-xs text-gray-500">Input:</span>
              <pre class="text-xs text-gray-300 font-mono bg-gray-900 px-2 py-1 rounded mt-1 overflow-x-auto max-h-32">{{ formatData(log.input) }}</pre>
            </div>

            <!-- Output data -->
            <div v-if="log.output && Object.keys(log.output).length > 0" class="mt-2">
              <span class="text-xs text-gray-500">Output:</span>
              <pre class="text-xs text-gray-300 font-mono bg-gray-900 px-2 py-1 rounded mt-1 overflow-x-auto max-h-32">{{ formatData(log.output) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer with stats -->
    <div class="flex items-center justify-between px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
      <span>
        {{ filteredLogs.length }} of {{ executionStore.logs.length }} logs
      </span>
      <span v-if="executionStore.startedAt">
        Started: {{ formatTime(executionStore.startedAt) }}
        <template v-if="executionStore.completedAt">
          | Completed: {{ formatTime(executionStore.completedAt) }}
        </template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.bg-gray-750 {
  background-color: rgb(38, 42, 51);
}
</style>
