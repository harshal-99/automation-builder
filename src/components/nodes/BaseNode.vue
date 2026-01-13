<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { WorkflowNodeData, NodeExecutionStatus } from '@/types'
import { getNodeDefinition } from '@/utils/nodeDefinitions'
import { IconSvg, ExclamationTriangleIcon } from '@/components/ui/icons'

const props = defineProps<NodeProps<WorkflowNodeData>>()

// Get node definition for handles configuration
const nodeDefinition = computed(() => getNodeDefinition(props.data.type))

// Determine if this node has input handles
const hasInputs = computed(() => nodeDefinition.value.inputs > 0)

// Determine output handles configuration
const outputHandles = computed(() => {
  const outputs = nodeDefinition.value.outputs
  if (typeof outputs === 'number') {
    return outputs > 0 ? [{ id: 'output', label: null }] : []
  }
  
  // For condition nodes with true/false branches
  if ('true' in outputs && 'false' in outputs) {
    return [
      { id: 'true', label: 'Yes' },
      { id: 'false', label: 'No' },
    ]
  }
  
  // For action nodes with named outputs (output, error, success)
  return Object.entries(outputs).map(([id, count]) => {
    if (count > 0) {
      const labels: Record<string, string> = {
        output: 'Output',
        success: 'Success',
        error: 'Error',
      }
      return { id, label: labels[id] || null }
    }
    return null
  }).filter((handle): handle is { id: string; label: string | null } => handle !== null)
})

// Category-based colors
const categoryColors = {
  trigger: {
    bg: 'bg-emerald-900/50',
    border: 'border-emerald-500',
    icon: 'text-emerald-400',
    header: 'bg-emerald-800/50',
  },
  action: {
    bg: 'bg-blue-900/50',
    border: 'border-blue-500',
    icon: 'text-blue-400',
    header: 'bg-blue-800/50',
  },
  logic: {
    bg: 'bg-purple-900/50',
    border: 'border-purple-500',
    icon: 'text-purple-400',
    header: 'bg-purple-800/50',
  },
}

const colors = computed(() => categoryColors[props.data.category])

// Status indicator colors
const statusColors: Record<NodeExecutionStatus, string> = {
  idle: 'bg-gray-500',
  pending: 'bg-yellow-500',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  error: 'bg-red-500',
  skipped: 'bg-gray-400',
}

// Get icon SVG based on a node type
const iconPath = computed(() => {
  const iconMap: Record<string, string> = {
    play: 'M5 3l14 9-14 9V3z',
    webhook: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
    globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 0 1 7.75 6H4.25A8 8 0 0 1 12 4zm0 16a8 8 0 0 1-7.75-6h15.5A8 8 0 0 1 12 20z',
    mail: 'M3 5h18v14H3V5zm0 0l9 7 9-7',
    message: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
    clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42V7z',
    'git-branch': 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
    shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  }
  return iconMap[nodeDefinition.value.icon] || iconMap.play
})
</script>

<template>
  <div
    class="relative min-w-45 max-w-60 rounded-lg border-2 shadow-lg transition-all duration-200"
    :class="[
      colors.bg,
      colors.border,
      {
        'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900 scale-105': selected,
        'opacity-60': !data.isValid,
      },
    ]"
  >
    <!-- Input Handle -->
    <Handle
      v-if="hasInputs"
      type="target"
      :position="Position.Left"
      class="w-3! h-3! bg-gray-400! border-2! border-gray-600! hover:bg-blue-400! hover:border-blue-500! transition-colors"
    />

    <!-- Node Header -->
    <div
      class="flex items-center gap-2 px-3 py-2 rounded-t-md"
      :class="colors.header"
    >
      <!-- Status Indicator -->
      <div
        class="w-2 h-2 rounded-full shrink-0"
        :class="statusColors.idle"
        :title="'Status: idle'"
      />

      <!-- Icon -->
      <IconSvg
        :path="iconPath"
        :class="colors.icon"
      />

      <!-- Label -->
      <span class="text-sm font-medium text-gray-100 truncate">
        {{ data.label }}
      </span>
    </div>

    <!-- Node Body -->
    <div class="px-3 py-2 text-xs text-gray-400">
      <div class="truncate">
        {{ nodeDefinition.description }}
      </div>

      <!-- Validation indicator -->
      <div v-if="!data.isValid" class="mt-1 flex items-center gap-1 text-amber-400">
        <ExclamationTriangleIcon />
        <span>Needs configuration</span>
      </div>
    </div>

    <!-- Output Handles -->
    <template v-if="outputHandles.length === 1">
      <Handle
        :id="outputHandles[0].id"
        type="source"
        :position="Position.Right"
        class="w-3! h-3! bg-gray-400! border-2! border-gray-600! hover:bg-blue-400! hover:border-blue-500! transition-colors"
      />
    </template>

    <!-- Multiple output handles (for condition nodes and action nodes) -->
    <template v-else-if="outputHandles.length > 1">
      <Handle
        v-for="(handle, index) in outputHandles"
        :key="handle.id"
        :id="handle.id"
        type="source"
        :position="Position.Right"
        class="w-3! h-3! border-2! transition-colors"
        :class="[
          handle.id === 'true' || handle.id === 'success' || handle.id === 'output'
            ? 'bg-green-500! border-green-600! hover:bg-green-400!'
            : handle.id === 'false' || handle.id === 'error'
            ? 'bg-red-500! border-red-600! hover:bg-red-400!'
            : 'bg-gray-400! border-gray-600! hover:bg-blue-400!'
        ]"
        :style="{ top: `${30 + index * 30}%` }"
      />
      <!-- Handle labels -->
      <div
        v-for="(handle, index) in outputHandles"
        :key="`label-${handle.id}`"
        class="absolute right-5 text-[10px] font-medium"
        :class="[
          handle.id === 'true' || handle.id === 'success' || handle.id === 'output'
            ? 'text-green-400'
            : handle.id === 'false' || handle.id === 'error'
            ? 'text-red-400'
            : 'text-gray-400'
        ]"
        :style="{ top: `${25 + index * 30}%` }"
      >
        {{ handle.label }}
      </div>
    </template>
  </div>
</template>
