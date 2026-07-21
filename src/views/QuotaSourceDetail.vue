<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { QuotaSourceType, isCurlParseError } from '@/types/quota'
import type { CurlParseResult } from '@/types/quota'
import { parseCurl } from '@/services/curl-parser'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const quotaSourcesStore = useQuotaSourcesStore()

const id = computed(() => route.params.id as string)
const isNew = computed(() => id.value === 'new')

// Source type config: default base URLs and extra config fields
const sourceTypeConfig: Record<
  QuotaSourceType,
  { label: string; defaultBaseUrl: string; configFields?: { key: string; label: string; type: 'text' | 'password'; required?: boolean }[] }
> = {
  [QuotaSourceType.OPENCODE_GO]: {
    label: 'OpenCode Go',
    defaultBaseUrl: 'https://opencode.ai',
    configFields: [
      { key: 'workspaceId', label: 'Workspace ID', type: 'text', required: false },
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
const enabled = ref(true)

// Config fields (dynamic per source type)
const configValues = ref<Record<string, string>>({})
const showConfigFields = ref<Record<string, boolean>>({})

// UI state
const saving = ref(false)
const error = ref<string | null>(null)
const formLoaded = ref(false)

// Existing entity (for editing)
const existingSource = computed(() => {
  if (isNew.value) return null
  return quotaSourcesStore.sourceList.find(
    (s) => s._id === `quota-source/${id.value}`,
  ) ?? null
})

// cURL paste
const showCurlInput = ref(false)
const curlCommand = ref('')
const parsedResult = ref<CurlParseResult | null>(null)
const parseError = ref<string | null>(null)
const showPreview = ref(false)

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

const hasCurlHint = computed(() => {
  return sourceType.value === QuotaSourceType.OPENCODE_GO || 
         sourceType.value === QuotaSourceType.BAILIAN
})

// Load existing source data into form
onMounted(() => {
  if (!isNew.value) {
    loadExistingSource()
  } else {
    formLoaded.value = true
  }
})

function loadExistingSource() {
  const es = existingSource.value
  if (!es) {
    // Source not found in store, try to load from repo
    quotaSourcesStore.fetchAll().then(() => {
      const reloaded = quotaSourcesStore.sourceList.find(
        (s) => s._id === `quota-source/${id.value}`,
      )
      if (reloaded) {
        fillForm(reloaded)
      } else {
        error.value = 'Quota source not found'
      }
      formLoaded.value = true
    })
    return
  }
  fillForm(es)
  formLoaded.value = true
}

function fillForm(es: NonNullable<typeof existingSource.value>) {
  sourceType.value = es.sourceType
  label.value = es.label
  credential.value = es.credentialHint ?? ''
  baseUrl.value = es.baseUrl ?? ''
  enabled.value = es.enabled
  configValues.value = es.config ? { ...es.config } : {}
}

watch(sourceType, (val) => {
  if (val) {
    const cfg = sourceTypeConfig[val]
    // Only set default base URL if not editing or if baseUrl is empty
    if (isNew.value || !baseUrl.value) {
      baseUrl.value = cfg.defaultBaseUrl
    }
  }
})

function handleParseCurl(): void {
  parseError.value = null
  parsedResult.value = null
  showPreview.value = false
  
  const result = parseCurl(curlCommand.value)
  if (isCurlParseError(result)) {
    parseError.value = result.userMessage.zh
    return
  }
  
  parsedResult.value = result
  showPreview.value = true
}

function applyCurlResult(): void {
  if (!parsedResult.value) return
  
  const r = parsedResult.value
  baseUrl.value = r.baseUrl
  
  // Auto-fill label if empty (use source type name)
  if (!label.value.trim()) {
    const cfg = sourceTypeConfig[sourceType.value as QuotaSourceType]
    if (cfg) label.value = cfg.label
  }
  
  // Fill credential from cookies
  const cookieEntries = Object.entries(r.cookies)
  if (cookieEntries.length > 0) {
    credential.value = Object.entries(r.headers)
      .find(([k]) => k.toLowerCase() === 'cookie')?.[1] 
      ?? cookieEntries.map(([k, v]) => `${k}=${v}`).join('; ')
  }
  
  // Fill workspaceId
  if (r.workspaceId) {
    configValues.value['workspaceId'] = r.workspaceId
  }
  
  // Fill sec_token (for Bailian)
  if (r.secToken) {
    configValues.value['sec_token'] = r.secToken
  }
  
  showPreview.value = false
  parsedResult.value = null
  curlCommand.value = ''
  showCurlInput.value = false
}

function cancelPreview(): void {
  showPreview.value = false
  parsedResult.value = null
}

function getCredentialFromResult(): string {
  if (!parsedResult.value) return ''
  const cookieHeader = Object.entries(parsedResult.value.headers)
    .find(([k]) => k.toLowerCase() === 'cookie')
  if (cookieHeader) return cookieHeader[1]
  return Object.entries(parsedResult.value.cookies)
    .map(([k, v]) => `${k}=${v}`).join('; ')
}

function maskCredential(cred: string): string {
  if (!cred || cred.length < 8) return cred
  return cred.slice(0, 4) + '****' + cred.slice(-4)
}

function isFormValid(): boolean {
  if (!sourceType.value) return false
  if (!label.value.trim()) return false
  // Credential is required when adding new
  if (isNew.value && !credential.value.trim()) return false

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
    const commonData = {
      sourceType: sourceType.value as QuotaSourceType,
      label: label.value.trim(),
      baseUrl: baseUrl.value.trim() || undefined,
      config: configValues.value,
      enabled: enabled.value,
    }

    if (isNew.value) {
      // Adding new quota source
      if (!credential.value.trim()) {
        error.value = 'Credential is required'
        saving.value = false
        return
      }

      const result = await quotaSourcesStore.addSource({
        ...commonData,
        credential: credential.value.trim(),
        sortOrder: Date.now(),
      })

      if (result) {
        router.push('/quota')
      } else {
        error.value = quotaSourcesStore.error || 'Failed to save quota source'
      }
    } else {
      // Updating existing quota source
      const updateData: Record<string, any> = { ...commonData }

      // If user entered a new credential value (different from hint), encrypt it
      if (
        credential.value.trim() &&
        credential.value.trim() !== existingSource.value?.credentialHint
      ) {
        updateData.credential = credential.value.trim()
      }

      const result = await quotaSourcesStore.updateSource(id.value, updateData)
      if (result) {
        router.push('/quota')
      } else {
        error.value = quotaSourcesStore.error || 'Failed to update quota source'
      }
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-6">
    <!-- Back button -->
    <button
      @click="router.push('/quota')"
      class="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
    >
      <span>&larr;</span>
      <span>{{ t('common.back') }}</span>
    </button>

    <!-- Title -->
    <h1 class="text-2xl font-bold text-gray-800 mb-6">
      {{ isNew ? t('quotaSources.addSource') : t('quotaSources.editSource') }}
    </h1>

    <!-- Loading state -->
    <div v-if="!formLoaded" class="text-center py-12">
      <p class="text-gray-400">{{ t('common.loading') }}</p>
    </div>

    <!-- Error: source not found -->
    <div v-else-if="!isNew && !existingSource && error" class="text-center py-12">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <!-- Form -->
    <div v-else class="max-w-lg mx-auto space-y-5">
      <!-- Source type dropdown -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ t('quotaSources.sourceType') }} <span class="text-red-500">*</span>
        </label>
        <select
          v-model="sourceType"
          :disabled="!isNew"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value="" disabled>{{ t('common.pleaseSelect') }}</option>
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
          {{ isNew ? t('quotaSources.credential') : t('quotaSources.credential') + ' (' + t('common.edit') + ')' }}
          <span v-if="isNew" class="text-red-500">*</span>
        </label>
        <div class="relative">
          <input
            v-model="credential"
            :type="showCredential ? 'text' : 'password'"
            :placeholder="isNew ? t('quotaSources.placeholder.credential') : (existingSource?.credentialHint ?? '')"
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
        <p v-if="!isNew" class="mt-1 text-xs text-gray-400">
          {{ t('quotaSources.keepExistingCredential') }}
        </p>
      </div>

      <!-- cURL paste (OpenCode Go / Bailian) -->
      <div v-if="hasCurlHint" class="border-t border-gray-100 pt-4">
        <button
          type="button"
          @click="showCurlInput = !showCurlInput"
          class="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {{ showCurlInput ? '− ' : '+ ' }}{{ t('quotaSources.pasteCurl') }}
        </button>
        
        <div v-if="showCurlInput" class="mt-2 space-y-2">
          <textarea
            v-model="curlCommand"
            rows="4"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="t('quotaSources.curlPlaceholder')"
          ></textarea>
          
          <button
            type="button"
            @click="handleParseCurl"
            class="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            {{ t('quotaSources.parseCurl') }}
          </button>
          
          <!-- Error message -->
          <p v-if="parseError" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {{ parseError }}
          </p>
          
          <!-- Preview section -->
          <div v-if="showPreview && parsedResult" class="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-1.5">
            <p class="text-xs font-medium text-gray-700 mb-2">{{ t('quotaSources.parseResult') }}</p>
            
            <div class="flex items-center gap-2 text-xs">
              <span class="text-green-600">✅</span>
              <span class="text-gray-500 w-20">{{ t('quotaSources.baseUrl') }}:</span>
              <span class="text-gray-800 font-mono">{{ parsedResult.baseUrl }}</span>
            </div>
            
            <div class="flex items-center gap-2 text-xs">
              <span class="text-green-600">✅</span>
              <span class="text-gray-500 w-20">{{ t('quotaSources.credential') }}:</span>
              <span class="text-gray-800 font-mono">{{ maskCredential(getCredentialFromResult()) }}</span>
            </div>
            
            <div v-if="parsedResult.workspaceId" class="flex items-center gap-2 text-xs">
              <span class="text-green-600">✅</span>
              <span class="text-gray-500 w-20">Workspace ID:</span>
              <span class="text-gray-800 font-mono">{{ parsedResult.workspaceId }}</span>
            </div>
            
            <div class="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                @click="cancelPreview"
                class="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="button"
                @click="applyCurlResult"
                class="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                {{ t('quotaSources.confirmFill') }}
              </button>
            </div>
          </div>
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

      <!-- Enabled toggle -->
      <div class="flex items-center gap-3">
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            v-model="enabled"
            type="checkbox"
            class="sr-only peer"
          />
          <div
            class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"
          />
        </label>
        <span class="text-sm text-gray-700">{{ t('quotaSources.enabled') }}</span>
      </div>

      <!-- Error message -->
      <p
        v-if="error"
        class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
      >
        {{ error }}
      </p>

      <!-- Action buttons -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <button
          @click="router.push('/quota')"
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
