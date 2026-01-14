<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TemplatesService, type WorkflowTemplate } from '@/utils/templates'
import { useWorkflowStore } from '@/stores'
import Button from './Button.vue'
import IconButton from './IconButton.vue'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const workflowStore = useWorkflowStore()
const templates = ref<WorkflowTemplate[]>([])
const selectedTemplateId = ref<string | null>(null)

onMounted(() => {
  templates.value = TemplatesService.getTemplates()
})

function close() {
  emit('update:modelValue', false)
}

function handleLoadTemplate(templateId: string) {
  if (workflowStore.hasUnsavedChanges) {
    const confirmed = confirm('You have unsaved changes. Do you want to discard them and load this template?')
    if (!confirmed) {
      return
    }
  }

  const workflow = TemplatesService.loadTemplate(templateId)
  if (workflow) {
    workflowStore.loadWorkflow(workflow)
    selectedTemplateId.value = templateId
    close()
  } else {
    alert('Failed to load template')
  }
}
</script>

<template>
  <dialog
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    aria-modal="true"
    aria-labelledby="templates-dialog-title"
    @click.self="close"
  >
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col border border-gray-700">
      <div class="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 id="templates-dialog-title" class="text-lg font-semibold text-white">Workflow Templates</h2>
        <IconButton title="Close" aria-label="Close templates dialog" @click="close">×</IconButton>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <output v-if="templates.length === 0" class="text-center text-gray-400 py-8" aria-live="polite">
          <p>No templates available.</p>
        </output>
        <ul v-else class="space-y-3 list-none">
          <li
            v-for="template in templates"
            :key="template.id"
            :aria-label="`Template: ${template.name}`"
            :aria-selected="selectedTemplateId === template.id"
            class="p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
            :class="{
              'bg-gray-800 border-blue-500': selectedTemplateId === template.id,
              'bg-gray-900': selectedTemplateId !== template.id,
            }"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-white mb-2">{{ template.name }}</h3>
                <p class="text-sm text-gray-400 mb-3">{{ template.description }}</p>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>{{ template.workflow.nodes.length }} node{{ template.workflow.nodes.length !== 1 ? 's' : '' }}</span>
                  <span>{{ template.workflow.edges.length }} connection{{ template.workflow.edges.length !== 1 ? 's' : '' }}</span>
                </div>
              </div>
              <Button
                class="ml-4"
                @click="handleLoadTemplate(template.id)"
              >
                Use Template
              </Button>
            </div>
          </li>
        </ul>
      </div>
      <div class="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
        <Button @click="close" aria-label="Close templates dialog">Close</Button>
      </div>
    </div>
  </dialog>
</template>
