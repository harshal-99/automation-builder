<script setup lang="ts">
import type { WorkflowNode } from '@/types'

interface Props {
  node: WorkflowNode
}

const props = defineProps<Props>()

function formatNodeType(type: string): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    trigger: 'Trigger',
    action: 'Action',
    logic: 'Logic',
  }
  return labels[category] || category
}
</script>

<template>
  <details class="pt-2 border-t border-gray-700">
    <summary class="text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-300">
      Metadata
    </summary>
    <div class="space-y-3 mt-3">
      <div v-if="node.data">
        <div class="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Type
        </div>
        <p class="text-sm text-white mt-1">
          {{ formatNodeType(node.data.type) }}
        </p>
      </div>

      <div v-if="node.data">
        <div class="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Category
        </div>
        <p class="text-sm text-white mt-1">
          {{ getCategoryLabel(node.data.category) }}
        </p>
      </div>

      <div v-if="node">
        <div class="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Node ID
        </div>
        <p class="text-xs text-gray-500 mt-1 font-mono break-all">
          {{ node.id }}
        </p>
      </div>

      <div>
        <div class="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Position
        </div>
        <p class="text-sm text-white mt-1">
          ({{ Math.round(node.position.x) }}, {{ Math.round(node.position.y) }})
        </p>
      </div>

      <div>
        <div class="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Status
        </div>
        <p class="text-sm text-white mt-1">
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            :class="{
              'bg-gray-700 text-gray-300': node.data?.isValid === undefined,
              'bg-green-900 text-green-300': node.data?.isValid,
              'bg-red-900 text-red-300': !node.data?.isValid,
            }"
          >
            {{
              node.data?.isValid === true ? 'Valid' : !node.data?.isValid ? 'Invalid' : 'Not validated'
            }}
          </span>
        </p>
      </div>
    </div>
  </details>
</template>
