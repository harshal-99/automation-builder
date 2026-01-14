<script setup lang="ts">
import { computed } from 'vue'
import { useExecutionStore, useWorkflowStore } from '@/stores'
import { executionEngine } from '@/services'
import IconButton from './IconButton.vue'

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()

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
</script>

<template>
  <footer class="flex items-center justify-between h-12 px-4 bg-gray-800 border-t border-gray-700">
    <!-- Execution Controls -->
    <div class="flex items-center gap-1">
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
        <span class="text-xs text-gray-500 mr-1">Speed:</span>
        <select
          :value="executionStore.executionSpeed"
          class="bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
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
        <div class="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full transition-all duration-300"
            :class="{
              'bg-blue-500': executionStore.status === 'running',
              'bg-yellow-500': executionStore.status === 'paused',
              'bg-green-500': executionStore.status === 'completed',
              'bg-red-500': executionStore.status === 'error',
            }"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <span class="text-xs text-gray-400">{{ progressPercent }}%</span>
      </div>

      <!-- Status Text -->
      <span :class="['text-xs', statusColor]">{{ statusText }}</span>
    </div>
  </footer>
</template>
