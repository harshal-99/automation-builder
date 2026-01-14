<script setup lang="ts">
import {computed} from 'vue'
import type {EdgeProps} from '@vue-flow/core'
import {EdgeLabelRenderer, getBezierPath} from '@vue-flow/core'
import {useExecutionStore} from '@/stores'

interface EdgeData {
  condition?: 'true' | 'false'
}

const props = defineProps<EdgeProps<EdgeData>>()

const executionStore = useExecutionStore()

// Check if this edge is part of the execution path (source node completed)
const isExecuted = computed(() => {
  const sourceStatus = executionStore.nodeStates[props.source]?.status
  return sourceStatus === 'success' || sourceStatus === 'error'
})

// Check if source node is currently running
const isActive = computed(() => {
  return executionStore.currentNodeId === props.source && executionStore.status === 'running'
})

// Check if the edge leads to a skipped node
const isSkipped = computed(() => {
  const targetStatus = executionStore.nodeStates[props.target]?.status
  return targetStatus === 'skipped'
})

// Calculate the bezier path for the edge
const path = computed(() => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })

  return {edgePath, labelX, labelY}
})

// Edge styling based on selection and execution state
const strokeColor = computed(() => {
  if (props.selected) return 'var(--color-edge-selected)'
  if (isSkipped.value) return 'var(--color-edge-skipped)'
  if (isActive.value) return 'var(--color-edge-active)'
  if (isExecuted.value) return 'var(--color-edge-executed)'
  return 'var(--color-edge-default)'
})

const strokeWidth = computed(() => {
  if (props.selected) return 3
  if (isActive.value || isExecuted.value) return 3
  return 2
})

// CSS class for edge animation
const edgeClass = computed(() => {
  return {
    'edge-animated': isActive.value,
    'edge-executed': isExecuted.value && !isActive.value,
    'edge-skipped': isSkipped.value,
  }
})

// Label styling based on condition
const labelStyle = computed(() => {
  const condition = props.data?.condition

  if (condition === 'true') {
    return {
      backgroundColor: 'var(--color-label-true-bg)',
      color: 'var(--color-label-true-text)',
      borderColor: 'var(--color-label-true-border)',
    }
  }
  if (condition === 'false') {
    return {
      backgroundColor: 'var(--color-label-false-bg)',
      color: 'var(--color-label-false-text)',
      borderColor: 'var(--color-label-false-border)',
    }
  }

  // Default label style
  return {
    backgroundColor: 'var(--color-label-bg)',
    color: 'var(--color-label-text)',
    borderColor: 'var(--color-label-border)',
  }
})

// Determine if we should show the label
const showLabel = computed(() => !!props.label)
</script>

<template>
  <!-- Edge Path -->
  <path
      :id="id"
      class="vue-flow__edge-path"
      :class="edgeClass"
      :d="path.edgePath"
      :stroke="strokeColor"
      :stroke-width="strokeWidth"
      :marker-end="markerEnd"
      fill="none"
  />

  <!-- Invisible wider path for easier selection -->
  <path
      :d="path.edgePath"
      stroke="transparent"
      stroke-width="20"
      fill="none"
      class="vue-flow__edge-interaction"
  />

  <!-- Edge Label -->
  <EdgeLabelRenderer v-if="showLabel">
    <div
        class="absolute pointer-events-all nodrag nopan"
        :style="{
        transform: `translate(-50%, -50%) translate(${path.labelX}px, ${path.labelY}px)`,
      }"
    >
      <div
          class="px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm"
          :style="{
          backgroundColor: labelStyle.backgroundColor,
          color: labelStyle.color,
          borderColor: labelStyle.borderColor,
        }"
      >
        {{ label }}
      </div>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.vue-flow__edge-path {
  transition: stroke 0.2s, stroke-width 0.2s;
}

.vue-flow__edge-interaction {
  cursor: pointer;
}

/* Animated edge during execution */
.edge-animated {
  stroke-dasharray: 5;
  animation: edge-flow 0.5s linear infinite;
}

@keyframes edge-flow {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Executed edge */
.edge-executed {
  filter: drop-shadow(0 0 2px var(--color-edge-executed-glow));
}

/* Skipped edge */
.edge-skipped {
  opacity: 0.4;
  stroke-dasharray: 4 2;
}
</style>
