<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { QuotaSourceType } from '@/types/quota'

const { t } = useI18n()
const quotaSourcesStore = useQuotaSourcesStore()

const emit = defineEmits<{
  close: []
  saved: []
}>()

// Source type config: default base URLs and extra config fields
const sourceTypeConfig: Record<
  QuotaSourceType,
  { label: string; defaultBaseUrl: string; configFields?: { key: string; label: string; type: 'text' | 'password'; required?: boolean }[] }
> = {
  [QuotaSourceType.OPENCODE_GO]: {
    label: 'OpenCode Go',
    defaultBaseUrl: 'https://api.opencode-go.com',
    configFields: [
      { key: 'sec_token', label: 'SEC Token', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text' },
    ],
  },
  [QuotaSourceType.BAILIAN]: {
    label: 'Bailian (DashScope)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    configFields: [
      { key: 'sec_token', label: 'SEC Token', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text' },
    ],
  },
  [QuotaSourceType.DEEPSEEK]: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
  },
  [QuotaSourceType.MOONSHOT]: {
    label: 'Moonshot',
    defaultBaseUrl: 'https://api.moonshot.cn',
  },
  [QuotaSourceType.GROQ]: {
    label: 'Groq',
    defaultBaseUrl: 'https://api.groq.com',
  },
  [QuotaSourceType.QWEN]: {
    label: 'Qwen (DashScope)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
  },
  [QuotaSourceType.GLM]: {
    label: 'GLM (BigModel)',
    defaultBaseUrl: 'https://open.bigmodel.cn',
  },
  [QuotaSourceType.MINIMAX]: {
    label: 'MiniMax',
    defaultBaseUrl: 'https://api.minimax.chat',
  },
}

// Form state
const sourceType = ref<QuotaSourceType | ''>('')
const label = ref('')
const credential = ref('')
const showCredential = ref(false)
const baseUrl = ref('')

// Config fields (dynamic per source type)
const configValues = ref<Record<string, string>>({})
const showConfigFields = ref<Record<string, boolean>>({})

// UI state
const saving = ref(false)
const error = ref<string | null>(null)

const selectedConfig = computed(() => {
  if (!sourceType.value) return null
  return sourceTypeConfig[sourceType.value] ?? null
})

const configFields = computed(() => {
  return selectedConfig.value?.configFields ?? []
})

const sourceTypeOptions = computed(() => {
  return Object.entries(sourceTypeConfig).map(([type, cfg]) => ({
    value: type as QuotaSourceType,
    label: cfg.label,
  }))
})

watch(sourceType, (val) => {
  if (val) {
    const cfg = sourceTypeConfig[val]
    baseUrl.value = cfg.defaultBaseUrl
    configValues.value = {}
    showConfigFields.value = {}
  } else {
    baseUrl.value = ''
    configValues.value = {}
    showConfigFields.value = {}
  }
})

function isFormValid(): boolean {
  if (!sourceType.value) return false
  if (!credential.value.trim()) return false
  if (!label.value.trim()) return false

  // Check required config fields
  for (const field of configFields.value) {
    if (field.required && !configValues.value[field.key]?.trim()) return false
  }

  return true
}

async function handleSave() {
  if (!isFormValid()) return

  saving.value = true
  error.value = null

  try {
    const result = await quotaSourcesStore.addSource({
      sourceType: sourceType.value as QuotaSourceType,
      label: label.value.trim(),
      credential: credential.value.trim(),
      baseUrl: baseUrl.value.trim() || undefined,
      config: configValues.value,
      enabled: true,
      sortOrder: Date.now(),
    })

    if (result) {
      emit('saved')
      emit('close')
    } else {
      error.value = quotaSourcesStore.error || 'Failed to save quota source'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-800">
          {{ t('quotaSources.addSource') }}
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5">
        <!-- Source type dropdown -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            {{ t('quotaSources.sourceType') }} <span class="text-red-500">*</span>
          </label>
          <select
            v-model="sourceType"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="" disabled>{{ t('common.loading') }}</option>
            <option
              v-for="opt in sourceTypeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Label input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            {{ t('quotaSources.label') }} <span class="text-red-500">*</span>
          </label>
          <input
            v-model="label"
            type="text"
            :placeholder="t('quotaSources.placeholder.label')"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Credential input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            {{ t('quotaSources.credential') }} <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <input
              v-model="credential"
              :type="showCredential ? 'text' : 'password'"
              :placeholder="t('quotaSources.placeholder.credential')"
              class="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              @click="showCredential = !showCredential"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              {{ showCredential ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <!-- Base URL input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            {{ t('quotaSources.baseUrl') }}
          </label>
          <input
            v-model="baseUrl"
            type="text"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Dynamic config fields (per source type) -->
        <div v-if="configFields.length > 0" class="space-y-4">
          <div
            v-for="field in configFields"
            :key="field.key"
          >
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              {{ field.label }}
              <span v-if="field.required" class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                v-model="configValues[field.key]"
                :type="field.type === 'password' && !showConfigFields[field.key] ? 'password' : 'text'"
                class="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                v-if="field.type === 'password'"
                type="button"
                @click="showConfigFields[field.key] = !showConfigFields[field.key]"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {{ showConfigFields[field.key] ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Error message -->
        <p
          v-if="error"
          class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
        >
          {{ error }}
        </p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          @click="handleSave"
          :disabled="!isFormValid() || saving"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="saving">{{ t('common.loading') }}</span>
          <span v-else>{{ t('common.save') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
