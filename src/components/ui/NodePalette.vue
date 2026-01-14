<script setup lang="ts">
import {computed, ref} from 'vue'
import {nodesByCategory} from '@/utils/nodeDefinitions'
import type {NodeCategory, NodeDefinition} from '@/types'

const searchQuery = ref('')

// Category labels
const categoryLabels: Record<NodeCategory, string> = {
  trigger: 'Triggers',
  action: 'Actions',
  logic: 'Logic',
}

// Category icons (using simple text for now)
const categoryIcons: Record<NodeCategory, string> = {
  trigger: '⚡',
  action: '⚙️',
  logic: '🔀',
}

// Filter nodes based on a search query
const filteredNodesByCategory = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()

  if (!query) {
    return nodesByCategory
  }

  const filtered: Record<NodeCategory, NodeDefinition[]> = {
    trigger: [],
    action: [],
    logic: [],
  }

  Object.entries(nodesByCategory).forEach(([category, nodes]) => {
    filtered[category as NodeCategory] = nodes.filter(
        (node) =>
            node.label.toLowerCase().includes(query) ||
            node.description.toLowerCase().includes(query) ||
            node.type.toLowerCase().includes(query)
    )
  })

  return filtered
})

// Check if a category has any visible nodes
const hasVisibleNodes = (category: NodeCategory): boolean => {
  return filteredNodesByCategory.value[category].length > 0
}

// Node icon mapping (using simple text for now)
const nodeIcons: Record<string, string> = {
  'manual-trigger': '▶️',
  'webhook-trigger': '🔗',
  'http-request': '🌐',
  'send-email': '📧',
  'send-sms': '💬',
  delay: '⏱️',
  condition: '🔀',
  transform: '🔄',
}

// Drag and drop handlers
function handleDragStart(event: DragEvent, nodeType: string) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/node-type', nodeType)
    // Add a visual indicator
    if (event.target instanceof HTMLElement) {
      event.target.style.opacity = '0.5'
    }
  }
}

function handleDragEnd(event: DragEvent) {
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '1'
  }
}
</script>

<template>
  <nav class="flex flex-col h-full" aria-label="Node palette">
    <!-- Search Input -->
    <div class="p-3 border-b border-gray-700">
      <label for="node-search" class="sr-only">Search nodes</label>
      <input
          id="node-search"
          v-model="searchQuery"
          type="text"
          placeholder="Search nodes..."
          aria-label="Search nodes"
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- Node List by Category -->
    <div class="flex-1 overflow-y-auto">
      <template v-for="category in ['trigger', 'action', 'logic'] as NodeCategory[]" :key="category">
        <div v-if="hasVisibleNodes(category)" class="mb-4">
          <!-- Category Header -->
          <div class="px-4 py-2 bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
            <div class="flex items-center gap-2">
              <span class="text-sm" :aria-label="`${categoryLabels[category]} category`">{{ categoryIcons[category] }}</span>
              <h3 class="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                {{ categoryLabels[category] }}
              </h3>
              <span class="text-xs text-gray-500 ml-auto" :aria-label="`${filteredNodesByCategory[category].length} nodes in ${categoryLabels[category]} category`">
                {{ filteredNodesByCategory[category].length }}
              </span>
            </div>
          </div>

          <!-- Node Items -->
          <div class="px-2 py-2">
            <div
                v-for="node in filteredNodesByCategory[category]"
                :key="node.type"
                draggable="true"
                :data-node-type="node.type"
                role="button"
                :aria-label="`Add ${node.label} node to canvas`"
                :aria-describedby="`node-desc-${node.type}`"
                tabindex="0"
                class="group flex items-start gap-3 p-3 mb-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 rounded cursor-move transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                @dragstart="handleDragStart($event, node.type)"
                @dragend="handleDragEnd($event)"
            >
              <!-- Node Icon -->
              <div class="shrink-0 mt-0.5">
                <span class="text-lg">{{ nodeIcons[node.type] || '📦' }}</span>
              </div>

              <!-- Node Info -->
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-white mb-0.5">
                  {{ node.label }}
                </div>
                <div :id="`node-desc-${node.type}`" class="text-xs text-gray-400 line-clamp-2">
                  {{ node.description }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div
          v-if="searchQuery && !hasVisibleNodes('trigger') && !hasVisibleNodes('action') && !hasVisibleNodes('logic')"
          class="flex flex-col items-center justify-center py-12 px-4 text-center"
          role="status"
          aria-live="polite"
      >
        <div class="text-4xl mb-2" aria-hidden="true">🔍</div>
        <div class="text-sm text-gray-400 mb-1">No nodes found</div>
        <div class="text-xs text-gray-500">Try a different search term</div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
