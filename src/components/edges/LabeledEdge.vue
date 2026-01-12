<script setup lang="ts">
import { computed } from 'vue'
import { EdgeLabelRenderer, getBezierPath } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'

interface EdgeData {
  condition?: 'true' | 'false'
}

const props = defineProps<EdgeProps<EdgeData>>()

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

  return { edgePath, labelX, labelY }
})

// Edge styling based on selection state
const strokeColor = computed(() =>
  props.selected ? 'var(--color-edge-selected)' : 'var(--color-edge-default)'
)
const strokeWidth = computed(() => (props.selected ? 3 : 2))

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
</style>
