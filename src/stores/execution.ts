import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type {
  ExecutionStatus,
  ExecutionLog,
  NodeExecutionState,
  NodeExecutionStatus,
} from '@/types'

export const useExecutionStore = defineStore('execution', () => {
  // State
  const status = ref<ExecutionStatus>('idle')
  const currentNodeId = ref<string | null>(null)
  const nodeStates = ref<Record<string, NodeExecutionState>>({})
  const logs = ref<ExecutionLog[]>([])
  const executionData = ref<Record<string, unknown>>({})
  const startedAt = ref<string | null>(null)
  const completedAt = ref<string | null>(null)
  const executionSpeed = ref<number>(1000) // ms between steps

  // Getters
  const isRunning = computed(() => status.value === 'running')
  const isPaused = computed(() => status.value === 'paused')
  const isCompleted = computed(() => status.value === 'completed')
  const isError = computed(() => status.value === 'error')

  const getNodeStatus = computed(() => {
    return (nodeId: string): NodeExecutionStatus => {
      return nodeStates.value[nodeId]?.status || 'idle'
    }
  })

  // Actions
  function startExecution() {
    status.value = 'running'
    startedAt.value = new Date().toISOString()
    completedAt.value = null
    logs.value = []
    executionData.value = {}
  }

  function pauseExecution() {
    if (status.value === 'running') {
      status.value = 'paused'
    }
  }

  function resumeExecution() {
    if (status.value === 'paused') {
      status.value = 'running'
    }
  }

  function stopExecution() {
    status.value = 'idle'
    currentNodeId.value = null
    completedAt.value = new Date().toISOString()
  }

  function completeExecution() {
    status.value = 'completed'
    currentNodeId.value = null
    completedAt.value = new Date().toISOString()
  }

  function setError() {
    status.value = 'error'
    completedAt.value = new Date().toISOString()
  }

  function setCurrentNode(nodeId: string | null) {
    currentNodeId.value = nodeId
  }

  function setNodeState(nodeId: string, state: Partial<NodeExecutionState>) {
    nodeStates.value = {
      ...nodeStates.value,
      [nodeId]: {
        ...nodeStates.value[nodeId],
        ...state,
      } as NodeExecutionState,
    }
  }

  function addLog(log: Omit<ExecutionLog, 'id' | 'timestamp'>) {
    logs.value.push({
      ...log,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    })
  }

  function setExecutionData(nodeId: string, data: unknown) {
    executionData.value = {
      ...executionData.value,
      [nodeId]: data,
    }
  }

  function setExecutionSpeed(speed: number) {
    executionSpeed.value = speed
  }

  function reset() {
    status.value = 'idle'
    currentNodeId.value = null
    nodeStates.value = {}
    logs.value = []
    executionData.value = {}
    startedAt.value = null
    completedAt.value = null
  }

  return {
    // State
    status,
    currentNodeId,
    nodeStates,
    logs,
    executionData,
    startedAt,
    completedAt,
    executionSpeed,

    // Getters
    isRunning,
    isPaused,
    isCompleted,
    isError,
    getNodeStatus,

    // Actions
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    completeExecution,
    setError,
    setCurrentNode,
    setNodeState,
    addLog,
    setExecutionData,
    setExecutionSpeed,
    reset,
  }
})
