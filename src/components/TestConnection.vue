<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApiKeysStore } from '@/stores/apiKeys'
import { testApiKey } from '@/services/key-tester'
import { KeyStatus } from '@/types'

const props = defineProps<{
  apiKeyId: string
}>()

const { t } = useI18n()
const apiKeysStore = useApiKeysStore()

const testing = ref(false)
const result = ref<{ success: boolean; latencyMs?: number; models?: string[]; error?: string } | null>(null)

const apiKey = computed(() => apiKeysStore.apiKeyList.find(k => k._id === props.apiKeyId))

async function runTest() {
  if (!apiKey.value) return

  testing.value = true
  result.value = null

  try {
    const testResult = await testApiKey(apiKey.value)
    result.value = testResult

    // Update key status
    const id = props.apiKeyId.replace('apikey/', '')
    apiKeysStore.updateKey(id, {
      status: testResult.success ? KeyStatus.ACTIVE : KeyStatus.ERROR,
      lastTestedAt: Date.now(),
      lastTestResult: testResult,
    })
  } catch (err) {
    result.value = { success: false, error: (err as Error).message }
    const id = props.apiKeyId.replace('apikey/', '')
    apiKeysStore.updateKey(id, {
      status: KeyStatus.ERROR,
      lastTestedAt: Date.now(),
      lastTestResult: { success: false, error: (err as Error).message },
    })
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="inline-flex items-center gap-2">
    <button
      @click="runTest"
      :disabled="testing || !apiKey"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
      :class="testing
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : result
          ? result.success
            ? 'bg-green-50 text-green-700 hover:bg-green-100'
            : 'bg-red-50 text-red-700 hover:bg-red-100'
          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'"
    >
      <!-- Loading spinner -->
      <span v-if="testing" class="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
      <!-- Success icon -->
      <span v-else-if="result?.success" class="text-green-600">&#10003;</span>
      <!-- Failure icon -->
      <span v-else-if="result && !result.success" class="text-red-600">&#10007;</span>
      <!-- Idle icon -->
      <span v-else>&#9654;</span>

      <span v-if="testing">{{ t('apiKeys.testing') }}</span>
      <span v-else-if="result?.success && result.latencyMs != null">{{ result.latencyMs }}ms</span>
      <span v-else-if="result && !result.success">{{ t('apiKeys.testFail') }}</span>
      <span v-else>{{ t('apiKeys.test') }}</span>
    </button>

    <!-- Detail message -->
    <span v-if="result && !testing" class="text-xs max-w-[200px] truncate">
      <span v-if="result.success && result.models && result.models.length" class="text-green-600">
        Models: {{ result.models.join(', ') }}
      </span>
      <span v-else-if="!result.success && result.error" class="text-red-500">
        {{ result.error }}
      </span>
    </span>
  </div>
</template>
