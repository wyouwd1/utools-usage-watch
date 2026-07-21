<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { QuotaSourceType, isCurlParseError } from '@/types/quota'
import { parseCurlToRequest } from '@/services/curl-parser'
import { executeCurl } from '@/services/curl-executor'
import { responseParsers } from '@/services/response-parsers'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const quotaSourcesStore = useQuotaSourcesStore()

const id = computed(() => route.params.id as string)
const isNew = computed(() => id.value === 'new')

const sourceTypeConfig: Record<
  QuotaSourceType,
  { label: string; defaultBaseUrl: string; configFields?: { key: string; label: string; type: 'text' | 'password'; required?: boolean }[] }
> = {
  [QuotaSourceType.OPENCODE_GO]: { label: 'OpenCode Go', defaultBaseUrl: 'https://opencode.ai', configFields: [{ key: 'workspaceId', label: 'Workspace ID', type: 'text', required: false }] },
  [QuotaSourceType.BAILIAN]: { label: 'Bailian (DashScope)', defaultBaseUrl: 'https://dashscope.aliyuncs.com', configFields: [{ key: 'sec_token', label: 'SEC Token', type: 'password', required: true }, { key: 'region', label: 'Region', type: 'text' }] },
  [QuotaSourceType.DEEPSEEK]: { label: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com' },
  [QuotaSourceType.MOONSHOT]: { label: 'Moonshot', defaultBaseUrl: 'https://api.moonshot.cn' },
  [QuotaSourceType.GROQ]: { label: 'Groq', defaultBaseUrl: 'https://api.groq.com' },
  [QuotaSourceType.QWEN]: { label: 'Qwen (DashScope)', defaultBaseUrl: 'https://dashscope.aliyuncs.com' },
  [QuotaSourceType.GLM]: { label: 'GLM (BigModel)', defaultBaseUrl: 'https://open.bigmodel.cn' },
  [QuotaSourceType.MINIMAX]: { label: 'MiniMax', defaultBaseUrl: 'https://api.minimax.chat' },
}

const sourceType = ref<QuotaSourceType | ''>(isNew.value ? QuotaSourceType.OPENCODE_GO : '')
const label = ref('')
const credential = ref('')
const showCredential = ref(false)
const baseUrl = ref('')
const enabled = ref(true)
const configValues = ref<Record<string, string>>({})
const showConfigFields = ref<Record<string, boolean>>({})
const manualMode = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const formLoaded = ref(false)
const showCurlInput = ref(true)
const curlCommand = ref('')
const verifying = ref(false)
const curlError = ref<string | null>(null)

const existingSource = computed(() => {
  if (isNew.value) return null
  return quotaSourcesStore.sourceList.find((s) => s._id === `quota-source/${id.value}`) ?? null
})

const selectedConfig = computed(() => {
  if (!sourceType.value) return null
  return sourceTypeConfig[sourceType.value] ?? null
})

const configFields = computed(() => selectedConfig.value?.configFields ?? [])

const sourceTypeOptions = computed(() =>
  Object.entries(sourceTypeConfig).map(([type, cfg]) => ({ value: type as QuotaSourceType, label: cfg.label }))
)

onMounted(() => {
  if (!isNew.value) loadExistingSource()
  else formLoaded.value = true
})

function loadExistingSource() {
  const es = existingSource.value
  if (!es) {
    quotaSourcesStore.fetchAll().then(() => {
      const reloaded = quotaSourcesStore.sourceList.find((s) => s._id === `quota-source/${id.value}`)
      if (reloaded) fillForm(reloaded)
      else error.value = 'Quota source not found'
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
  curlCommand.value = es.curlRaw ?? ''
  // If source has curlRaw, default to curl mode; otherwise manual mode
  manualMode.value = !es.curlRaw
}

watch(sourceType, (val) => {
  if (val) {
    const cfg = sourceTypeConfig[val]
    if (isNew.value || !baseUrl.value) baseUrl.value = cfg.defaultBaseUrl
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
    if (isCurlParseError(parsed)) { curlError.value = parsed.userMessage.zh; return }
    const body = await executeCurl(parsed)
    const parser = responseParsers[sourceType.value as QuotaSourceType]
    if (!parser) { curlError.value = '不支持的额度源类型'; return }
    const windows = parser(body)
    if (!windows || Object.keys(windows).length === 0) {
      curlError.value = '无法从响应中解析出额度数据'
      return
    }
    await saveWithCurl()
  } catch (err) {
    const msg = (err as Error).message
    if (/401|403|unauthorized/i.test(msg)) curlError.value = 'cURL 凭证已过期，请重新从浏览器复制'
    else if (/timeout/i.test(msg)) curlError.value = '请求超时'
    else if (/Failed to fetch/i.test(msg)) curlError.value = '网络请求失败'
    else curlError.value = `请求失败: ${msg}`
  } finally { verifying.value = false }
}

async function saveWithCurl(): Promise<void> {
  saving.value = true
  try {
    if (!label.value.trim() && sourceType.value) {
      const cfg = sourceTypeConfig[sourceType.value]
      if (cfg) label.value = cfg.label
    }
    if (isNew.value) {
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
      if (result) router.push('/quota')
      else error.value = quotaSourcesStore.error || '保存失败'
    } else {
      const updateData: Record<string, any> = {
        sourceType: sourceType.value,
        label: label.value.trim(),
        baseUrl: baseUrl.value.trim() || undefined,
        config: { ...configValues.value },
        enabled: enabled.value,
        curlRaw: curlCommand.value.trim(),
      }
      const result = await quotaSourcesStore.updateSource(id.value, updateData)
      if (result) router.push('/quota')
      else error.value = quotaSourcesStore.error || '保存失败'
    }
  } catch (e) { error.value = (e as Error).message }
  finally { saving.value = false }
}

function isFormValid(): boolean {
  if (!sourceType.value) return false
  if (!label.value.trim()) return false
  if (isNew.value && !manualMode && !curlCommand.value.trim()) return false
  if (manualMode && isNew.value && !credential.value.trim()) return false
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
    const commonData = {
      sourceType: sourceType.value as QuotaSourceType,
      label: label.value.trim(),
      baseUrl: baseUrl.value.trim() || undefined,
      config: { ...configValues.value },
      enabled: enabled.value,
    }
    if (isNew.value) {
      if (!credential.value.trim()) { error.value = '请输入凭证'; saving.value = false; return }
      const result = await quotaSourcesStore.addSource({ ...commonData, credential: credential.value.trim(), sortOrder: Date.now() })
      if (result) router.push('/quota')
      else error.value = quotaSourcesStore.error || '保存失败'
    } else {
      const updateData: Record<string, any> = { ...commonData }
      if (credential.value.trim() && credential.value.trim() !== existingSource.value?.credentialHint) {
        updateData.credential = credential.value.trim()
      }
      const result = await quotaSourcesStore.updateSource(id.value, updateData)
      if (result) router.push('/quota')
      else error.value = quotaSourcesStore.error || '保存失败'
    }
  } catch (e) { error.value = (e as Error).message }
  finally { saving.value = false }
}
</script>

<template>
  <div class="p-6">
    <button @click="router.push('/quota')" class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
      <span>&larr;</span>
      <span>{{ t('common.back') }}</span>
    </button>

    <h1 class="text-2xl font-bold text-gray-800 mb-6">
      {{ isNew ? t('quotaSources.addSource') : t('quotaSources.editSource') }}
    </h1>

    <div v-if="!formLoaded" class="text-center py-12">
      <p class="text-gray-400">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="!isNew && !existingSource && error" class="text-center py-12">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <div v-else class="max-w-lg mx-auto space-y-5">
      <!-- Source type -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ t('quotaSources.sourceType') }} <span class="text-red-500">*</span>
        </label>
        <select v-model="sourceType" :disabled="!isNew"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500">
          <option value="" disabled>{{ t('common.pleaseSelect') }}</option>
          <option v-for="opt in sourceTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <!-- Label -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ t('quotaSources.label') }} <span class="text-red-500">*</span>
        </label>
        <input v-model="label" type="text" :placeholder="t('quotaSources.placeholder.label')"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      <!-- cURL mode (default) -->
      <div v-if="!manualMode" class="border-t border-gray-100 pt-4">
        <p class="text-xs text-gray-500 mb-2">{{ isNew ? '粘贴 cURL 自动获取额度数据' : '修改 cURL 后点击"验证并保存"更新' }}</p>
        <textarea v-model="curlCommand" rows="4"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :placeholder="t('quotaSources.curlPlaceholder')"></textarea>

        <p v-if="curlError" class="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ curlError }}</p>

        <button type="button" @click="verifyCurl" :disabled="verifying || !curlCommand.trim()"
          class="mt-3 w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <span v-if="verifying">{{ t('common.loading') }}</span>
          <span v-else>{{ t('quotaSources.verifyAndSave') }}</span>
        </button>

        <div class="text-center pt-3">
          <button type="button" @click="manualMode = true" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ✏️ {{ t('quotaSources.switchToManual') }}
          </button>
        </div>
      </div>

      <!-- Manual mode -->
      <template v-if="manualMode">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            {{ t('quotaSources.credential') }} <span v-if="isNew" class="text-red-500">*</span>
          </label>
          <div class="relative">
            <input v-model="credential" :type="showCredential ? 'text' : 'password'"
              :placeholder="isNew ? t('quotaSources.placeholder.credential') : (existingSource?.credentialHint ?? '')"
              class="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <button type="button" @click="showCredential = !showCredential"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
              {{ showCredential ? '🙈' : '👁️' }}
            </button>
          </div>
          <p v-if="!isNew" class="mt-1 text-xs text-gray-400">{{ t('quotaSources.keepExistingCredential') }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('quotaSources.baseUrl') }}</label>
          <input v-model="baseUrl" type="text"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        <div v-if="configFields.length > 0" class="space-y-4">
          <div v-for="field in configFields" :key="field.key">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              {{ field.label }} <span v-if="field.required" class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input v-model="configValues[field.key]"
                :type="field.type === 'password' && !showConfigFields[field.key] ? 'password' : 'text'"
                class="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <button v-if="field.type === 'password'" type="button" @click="showConfigFields[field.key] = !showConfigFields[field.key]"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                {{ showConfigFields[field.key] ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
        </div>

        <div class="text-center pt-2">
          <button type="button" @click="manualMode = false" class="text-xs text-blue-600 hover:text-blue-700 transition-colors">
            📋 {{ t('quotaSources.switchToCurl') }}
          </button>
        </div>
      </template>

      <!-- Enabled toggle (edit only) -->
      <div v-if="!isNew" class="flex items-center gap-3">
        <label class="relative inline-flex items-center cursor-pointer">
          <input v-model="enabled" type="checkbox" class="sr-only peer" />
          <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
        </label>
        <span class="text-sm text-gray-700">{{ t('quotaSources.enabled') }}</span>
      </div>

      <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

      <!-- Footer: manual mode save button -->
      <div v-if="manualMode" class="flex items-center justify-end gap-3 pt-4">
        <button @click="router.push('/quota')" class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          {{ t('common.cancel') }}
        </button>
        <button @click="handleSave" :disabled="!isFormValid() || saving"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <span v-if="saving">{{ t('common.loading') }}</span>
          <span v-else>{{ t('common.save') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
