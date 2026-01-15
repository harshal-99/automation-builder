import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type {
  ExecutionStatus,
  ExecutionLog,
  NodeExecutionState,
  NodeExecutionStatus,
} from '@/types'
import {
  replaceRef,
  updateRecordItem,
  addArrayItem,
  updateRef,
} from '@/utils/storeHelpers'

export const useExecutionStore = defineStore('execution', () => {
  // State
  const status = ref<ExecutionStatus>('idle')
  const currentNodeId = ref<string | null>(null)
  // Use shallowRef for better performance with large records
  // Store helpers create new object references on updates
  const nodeStates = shallowRef<Record<string, NodeExecutionState>>({})
  const logs = ref<ExecutionLog[]>([])
  const executionData = shallowRef<Record<string, unknown>>({})
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
    replaceRef(status, 'running')
    replaceRef(startedAt, new Date().toISOString())
    replaceRef(completedAt, null)
    replaceRef(logs, [])
    replaceRef(executionData, {})
  }

  function pauseExecution() {
    if (status.value === 'running') {
      replaceRef(status, 'paused')
    }
  }

  function resumeExecution() {
    if (status.value === 'paused') {
      replaceRef(status, 'running')
    }
  }

  function stopExecution() {
    replaceRef(status, 'idle')
    replaceRef(currentNodeId, null)
    replaceRef(completedAt, new Date().toISOString())
  }

  function completeExecution() {
    replaceRef(status, 'completed')
    replaceRef(currentNodeId, null)
    replaceRef(completedAt, new Date().toISOString())
  }

  function setError() {
    replaceRef(status, 'error')
    replaceRef(completedAt, new Date().toISOString())
  }

  function setCurrentNode(nodeId: string | null) {
    replaceRef(currentNodeId, nodeId)
  }

  function setNodeState(nodeId: string, state: Partial<NodeExecutionState>) {
    updateRecordItem(nodeStates, nodeId, (draft) => {
      if (!draft) {
        return { ...state } as NodeExecutionState
      }
      Object.assign(draft, state)
    })
  }

  function addLog(log: Omit<ExecutionLog, 'id' | 'timestamp'>) {
    const newLog: ExecutionLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    }
    addArrayItem(logs, newLog)
  }

  function setExecutionData(nodeId: string, data: unknown) {
    updateRef(executionData, (draft) => {
      draft[nodeId] = data
    })
  }

  function setExecutionSpeed(speed: number) {
    replaceRef(executionSpeed, speed)
  }

  function reset() {
    replaceRef(status, 'idle')
    replaceRef(currentNodeId, null)
    replaceRef(nodeStates, {})
    replaceRef(logs, [])
    replaceRef(executionData, {})
    replaceRef(startedAt, null)
    replaceRef(completedAt, null)
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
