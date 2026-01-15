<script setup lang="ts">
import { computed } from 'vue'
import { useExecutionStore, useWorkflowStore, useUIStore } from '@/stores'
import { executionEngine } from '@/services'
import IconButton from './IconButton.vue'
import { IconSvg } from './icons'

// Icon paths
const clipboardIcon = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const uiStore = useUIStore()

// Computed properties for button states
const canPlay = computed(() => {
  const hasNodes = workflowStore.nodes.length > 0
  return hasNodes && (executionStore.status === 'idle' || executionStore.status === 'completed' || executionStore.status === 'error')
})

const canResume = computed(() => executionStore.status === 'paused')
const canPause = computed(() => executionStore.status === 'running')
const canStep = computed(() => {
  const hasNodes = workflowStore.nodes.length > 0
  return hasNodes && (executionStore.status === 'idle' || executionStore.status === 'paused' || executionStore.status === 'completed')
})
const canStop = computed(() => executionStore.status === 'running' || executionStore.status === 'paused')

// Execution progress
const executedNodeCount = computed(() => {
  return Object.values(executionStore.nodeStates).filter(
    state => state.status === 'success' || state.status === 'error' || state.status === 'skipped'
  ).length
})

const totalNodeCount = computed(() => workflowStore.nodes.length)

const progressPercent = computed(() => {
  if (totalNodeCount.value === 0) return 0
  return Math.round((executedNodeCount.value / totalNodeCount.value) * 100)
})

const currentNodeName = computed(() => {
  if (!executionStore.currentNodeId) return null
  const node = workflowStore.nodes.find(n => n.id === executionStore.currentNodeId)
  return node?.data?.label || null
})

// Status display
const statusText = computed(() => {
  switch (executionStore.status) {
    case 'idle':
      return 'Ready'
    case 'running':
      return currentNodeName.value ? `Running: ${currentNodeName.value}` : 'Running...'
    case 'paused':
      return currentNodeName.value ? `Paused at: ${currentNodeName.value}` : 'Paused'
    case 'completed':
      return `Completed (${executedNodeCount.value}/${totalNodeCount.value} nodes)`
    case 'error':
      return 'Error'
    default:
      return 'Ready'
  }
})

const statusColor = computed(() => {
  switch (executionStore.status) {
    case 'running':
      return 'text-blue-400'
    case 'paused':
      return 'text-yellow-400'
    case 'completed':
      return 'text-green-400'
    case 'error':
      return 'text-red-400'
    default:
      return 'text-gray-500'
  }
})

const progressColor = computed(() => {
  switch (executionStore.status) {
    case 'running':
      return 'var(--color-status-running)'
    case 'paused':
      return 'var(--color-status-paused)'
    case 'completed':
      return 'var(--color-status-completed)'
    case 'error':
      return 'var(--color-status-error)'
    default:
      return 'var(--color-status-idle)'
  }
})

// Speed control
const speedOptions = [
  { label: '0.5x', value: 2000 },
  { label: '1x', value: 1000 },
  { label: '2x', value: 500 },
  { label: '4x', value: 250 },
]

function setSpeed(value: number) {
  executionStore.setExecutionSpeed(value)
}

// Actions
async function handlePlay() {
  if (canResume.value) {
    executionEngine.resume()
  } else if (canPlay.value) {
    await executionEngine.start()
  }
}

function handlePause() {
  if (canPause.value) {
    executionEngine.pause()
  }
}

async function handleStep() {
  if (canStep.value) {
    await executionEngine.step()
  }
}

function handleStop() {
  if (canStop.value) {
    executionEngine.stop()
  }
}

// Toggle logs panel
function toggleLogsPanel() {
  if (uiStore.isExecutionPanelOpen) {
    uiStore.closeExecutionPanel()
  } else {
    uiStore.openExecutionPanel()
  }
}
</script>

<template>
  <footer class="flex items-center justify-between h-12 px-4 bg-gray-800 border-t border-gray-700" role="contentinfo">
    <!-- Execution Controls -->
    <div class="flex items-center gap-1" aria-label="Execution controls">
      <!-- Play/Resume Button -->
      <IconButton
        :title="canResume ? 'Resume' : 'Play'"
        :disabled="!canPlay && !canResume"
        @click="handlePlay"
      >
        ▶
      </IconButton>

      <!-- Pause Button -->
      <IconButton
        title="Pause"
        :disabled="!canPause"
        @click="handlePause"
      >
        ⏸
      </IconButton>

      <!-- Step Button -->
      <IconButton
        title="Step (execute one node)"
        :disabled="!canStep"
        @click="handleStep"
      >
        ⏭
      </IconButton>

      <!-- Stop Button -->
      <IconButton
        title="Stop"
        :disabled="!canStop"
        @click="handleStop"
      >
        ⏹
      </IconButton>

      <!-- Speed Control -->
      <div class="flex items-center gap-1 ml-3 pl-3 border-l border-gray-700">
        <label for="execution-speed" class="text-xs text-gray-500 mr-1">Speed:</label>
        <select
          id="execution-speed"
          :value="executionStore.executionSpeed"
          aria-label="Execution speed"
          class="bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          @change="setSpeed(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="option in speedOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Progress Display -->
    <div class="flex items-center gap-3">
      <!-- Progress Bar (only shown during/after execution) -->
      <div
        v-if="executionStore.status !== 'idle'"
        class="flex items-center gap-2"
      >
        <progress
          class="execution-progress"
          :style="{ '--progress-color': progressColor }"
          :value="progressPercent"
          min="0"
          max="100"
          :aria-label="`Execution progress: ${progressPercent}%`"
        />
        <span class="text-xs text-gray-400">{{ progressPercent }}%</span>
      </div>

      <!-- Status Text -->
      <output :class="['text-xs', statusColor]" aria-live="polite">{{ statusText }}</output>

      <!-- Logs Toggle Button -->
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ml-2 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
        :class="uiStore.isExecutionPanelOpen
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
        :aria-label="uiStore.isExecutionPanelOpen ? 'Close execution logs' : 'Open execution logs'"
        :aria-expanded="uiStore.isExecutionPanelOpen"
        title="Toggle execution logs"
        @click="toggleLogsPanel"
      >
        <IconSvg :path="clipboardIcon" size="w-3.5 h-3.5" />
        Logs
        <span
          v-if="executionStore.logs.length > 0"
          class="px-1.5 py-0.5 text-[10px] font-medium rounded-full"
          :class="uiStore.isExecutionPanelOpen ? 'bg-blue-500' : 'bg-gray-600'"
        >
          {{ executionStore.logs.length }}
        </span>
      </button>
    </div>
  </footer>
</template>

<style scoped>
.execution-progress {
  width: 6rem;
  height: 0.375rem;
  border-radius: 9999px;
  overflow: hidden;
  background-color: var(--color-progress-bg);
  border: none;
}

.execution-progress::-webkit-progress-bar {
  background-color: var(--color-progress-bg);
  border-radius: 9999px;
}

.execution-progress::-webkit-progress-value {
  background-color: var(--progress-color);
  border-radius: 9999px;
  transition: background-color 0.3s;
}

.execution-progress::-moz-progress-bar {
  background-color: var(--progress-color);
  border-radius: 9999px;
  transition: background-color 0.3s;
}
</style>
