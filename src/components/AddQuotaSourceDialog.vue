<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { QuotaSourceType, isCurlParseError } from '@/types/quota'
import { parseCurlToRequest } from '@/services/curl-parser'
import { executeCurl } from '@/services/curl-executor'
import { responseParsers } from '@/services/response-parsers'

const { t } = useI18n()
const quotaSourcesStore = useQuotaSourcesStore()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const sourceTypeConfig: Record<
  QuotaSourceType,
  {
    label: string
    defaultBaseUrl: string
    configFields?: { key: string; label: string; type: 'text' | 'password'; required?: boolean }[]
    guide?: string[]
  }
> = {
  [QuotaSourceType.OPENCODE_GO]: {
    label: 'OpenCode Go',
    defaultBaseUrl: 'https://opencode.ai',
    configFields: [
      { key: 'workspaceId', label: 'Workspace ID', type: 'text', required: false },
    ],
    guide: [
      '1. 登录 https://opencode.ai 并打开你的 Workspace',
      '2. F12 → Network → 找到 workspace 请求',
      '3. 右键 Copy as cURL → 粘贴到下方输入框',
    ],
  },
  [QuotaSourceType.BAILIAN]: {
    label: 'Bailian (DashScope)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    configFields: [
      { key: 'sec_token', label: 'SEC Token', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', required: false },
    ],
    guide: [
      '1. 登录阿里云百炼控制台 → 模型部署 → Coding Plan',
      '2. F12 → Network → 找到请求 → Copy as cURL',
    ],
  },
  [QuotaSourceType.DEEPSEEK]: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    guide: [
      '1. 登录 https://platform.deepseek.com',
      '2. F12 → Network → 找 balance 请求 → Copy as cURL',
      '3. 或切换到手动模式输入 API Key',
    ],
  },
  [QuotaSourceType.MOONSHOT]: {
    label: 'Moonshot',
    defaultBaseUrl: 'https://api.moonshot.cn',
    guide: [
      '1. 登录 https://platform.moonshot.cn',
      '2. F12 → Network → 找 billing 请求 → Copy as cURL',
    ],
  },
  [QuotaSourceType.GROQ]: {
    label: 'Groq',
    defaultBaseUrl: 'https://api.groq.com',
    guide: [
      '1. 登录 https://console.groq.com',
      '2. F12 → Network → 找 usage 请求 → Copy as cURL',
    ],
  },
  [QuotaSourceType.QWEN]: {
    label: 'Qwen (DashScope)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    guide: [
      '1. 登录 https://dashscope.aliyun.com',
      '2. F12 → Network → 找 billing 请求 → Copy as cURL',
    ],
  },
  [QuotaSourceType.GLM]: {
    label: 'GLM (BigModel)',
    defaultBaseUrl: 'https://open.bigmodel.cn',
    guide: [
      '1. 登录 https://open.bigmodel.cn',
      '2. F12 → Network → 找 account 请求 → Copy as cURL',
    ],
  },
  [QuotaSourceType.MINIMAX]: {
    label: 'MiniMax',
    defaultBaseUrl: 'https://api.minimax.chat',
    guide: [
      '1. 登录 https://platform.minimaxi.com',
      '2. F12 → Network → 找 token 请求 → Copy as cURL',
    ],
  },
}

const sourceType = ref<QuotaSourceType | ''>('')
const label = ref('')
const credential = ref('')
const showCredential = ref(false)
const baseUrl = ref('')
const configValues = ref<Record<string, string>>({})
const showConfigFields = ref<Record<string, boolean>>({})
const showCurlInput = ref(true)
const curlCommand = ref('')
const manualMode = ref(false)
const verifying = ref(false)
const curlError = ref<string | null>(null)
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

const selectedGuide = computed(() => {
  if (!sourceType.value) return null
  return sourceTypeConfig[sourceType.value]?.guide ?? null
})

watch(sourceType, (val) => {
  if (val) {
    const cfg = sourceTypeConfig[val]
    baseUrl.value = cfg.defaultBaseUrl
    configValues.value = {}
    showConfigFields.value = {}
    showCurlInput.value = true
    curlCommand.value = ''
    curlError.value = null
    manualMode.value = false
  } else {
    baseUrl.value = ''
    configValues.value = {}
    showConfigFields.value = {}
    showCurlInput.value = true
    curlCommand.value = ''
    curlError.value = null
    manualMode.value = false
  }
})

async function verifyCurl(): Promise<void> {
  if (!sourceType.value || !curlCommand.value.trim()) return
  verifying.value = true
  curlError.value = null
  error.value = null
  try {
    const parsed = parseCurlToRequest(curlCommand.value)
    if (isCurlParseError(parsed)) {
      curlError.value = parsed.userMessage.zh
      return
    }
    const body = await executeCurl(parsed)
    const parser = responseParsers[sourceType.value as QuotaSourceType]
    if (!parser) {
      curlError.value = '不支持的额度源类型'
      return
    }
    const windows = parser(body)
    if (!windows || Object.keys(windows).length === 0) {
      curlError.value = '无法从响应中解析出额度数据，请确认 cURL 是否正确'
      return
    }
    await saveWithCurl()
  } catch (err) {
    const msg = (err as Error).message
    if (/401|403|unauthorized/i.test(msg)) curlError.value = 'cURL 凭证已过期，请重新从浏览器复制'
    else if (/timeout/i.test(msg)) curlError.value = '请求超时，请检查网络连接'
    else if (/Failed to fetch|Network/i.test(msg)) curlError.value = '网络请求失败，请检查 cURL 的 URL 是否正确'
    else curlError.value = `请求失败: ${msg}`
  } finally {
    verifying.value = false
  }
}

async function saveWithCurl(): Promise<void> {
  saving.value = true
  try {
    if (!label.value.trim() && sourceType.value) {
      const cfg = sourceTypeConfig[sourceType.value]
      if (cfg) label.value = cfg.label
    }
    const result = await quotaSourcesStore.addSource({
      sourceType: sourceType.value as QuotaSourceType,
      label: label.value.trim(),
      credential: '',
      baseUrl: baseUrl.value.trim() || undefined,
      config: { ...configValues.value },
      curlRaw: curlCommand.value.trim(),
      enabled: true,
      sortOrder: Date.now(),
    })
    if (result) { emit('saved'); emit('close') }
    else error.value = quotaSourcesStore.error || '保存失败'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

function isFormValid(): boolean {
  if (!sourceType.value) return false
  if (!label.value.trim()) return false
  if (!manualMode && !curlCommand.value.trim()) return false
  if (manualMode && !credential.value.trim()) return false
  for (const field of configFields.value) {
    if (field.required && !configValues.value[field.key]?.trim()) return false
  }
  return true
}

async function handleSave() {
  if (!isFormValid()) return
  if (!manualMode && curlCommand.value.trim()) {
    await verifyCurl()
    return
  }
  saving.value = true
  error.value = null
  try {
    const result = await quotaSourcesStore.addSource({
      sourceType: sourceType.value as QuotaSourceType,
      label: label.value.trim(),
      credential: credential.value.trim(),
      baseUrl: baseUrl.value.trim() || undefined,
      config: { ...configValues.value },
      enabled: true,
      sortOrder: Date.now(),
    })
    if (result) { emit('saved'); emit('close') }
    else error.value = quotaSourcesStore.error || '保存失败'
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

        <!-- cURL input (default mode for all types) -->
        <div v-if="!manualMode" class="border-t border-gray-100 pt-4">
          <button
            type="button"
            @click="showCurlInput = !showCurlInput"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {{ showCurlInput ? '− ' : '+ ' }}{{ t('quotaSources.pasteCurl') }}
          </button>

          <div v-if="showCurlInput" class="mt-2 space-y-3">
            <textarea
              v-model="curlCommand"
              rows="4"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :placeholder="t('quotaSources.curlPlaceholder')"
            ></textarea>

            <!-- cURL error message -->
            <p
              v-if="curlError"
              class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"
            >
              {{ curlError }}
            </p>

            <!-- Verify & Save button -->
            <button
              type="button"
              @click="verifyCurl"
              :disabled="verifying || !curlCommand.trim()"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="verifying">{{ t('common.loading') }}</span>
              <span v-else>{{ t('quotaSources.verifyAndSave') }}</span>
            </button>
          </div>

          <!-- Switch to manual mode -->
          <div class="text-center pt-3">
            <button
              type="button"
              @click="manualMode = true"
              class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✏️ {{ t('quotaSources.switchToManual') }}
            </button>
          </div>
        </div>

        <!-- Manual mode: credential + config fields -->
        <template v-if="manualMode">
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

          <div v-if="configFields.length > 0" class="space-y-4">
            <div v-for="field in configFields" :key="field.key">
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

          <!-- Switch back to curl mode -->
          <div class="text-center pt-2">
            <button
              type="button"
              @click="manualMode = false"
              class="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              📋 {{ t('quotaSources.switchToCurl') }}
            </button>
          </div>
        </template>

        <!-- Getting credentials guide -->
        <div v-if="selectedGuide && !manualMode" class="bg-blue-50 rounded-lg px-4 py-3">
          <p class="text-xs font-medium text-blue-700 mb-1.5">{{ t('quotaSources.howToGet') }}</p>
          <ol class="list-decimal list-inside text-xs text-blue-600 space-y-1">
            <li v-for="(step, i) in selectedGuide" :key="i" class="text-blue-700/80">
              {{ step }}
            </li>
          </ol>
        </div>

        <!-- Error message -->
        <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {{ error }}
        </p>
      </div>

      <!-- Footer: Save button for manual mode only -->
      <div v-if="manualMode" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
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
