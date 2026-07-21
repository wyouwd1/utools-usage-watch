<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

const props = defineProps<{
  sourceId: string
  label: string
  lastError?: string
}>()

function handleUpdate() {
  router.push(`/quota-source/${props.sourceId}`)
}
</script>

<template>
  <div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
    <div class="flex items-center gap-2.5">
      <span class="text-amber-500 text-lg">⚠️</span>
      <div>
        <p class="text-sm font-medium text-amber-800">
          {{ t('credentialExpired.title') }}
        </p>
        <p class="text-xs text-amber-600 mt-0.5">
          {{ t('credentialExpired.description', { label }) }}
        </p>
        <p v-if="lastError" class="text-xs text-amber-500 mt-0.5 font-mono">
          {{ lastError }}
        </p>
      </div>
    </div>
    <button
      @click="handleUpdate"
      class="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors whitespace-nowrap"
    >
      {{ t('credentialExpired.updateNow') }}
    </button>
  </div>
</template>
