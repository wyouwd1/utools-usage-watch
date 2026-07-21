<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApiKeysStore } from '@/stores/apiKeys'
import { useProvidersStore } from '@/stores/providers'
import { ProviderType, KeyStatus } from '@/types'
import type { IProviderInfo } from '@/types'
import { isValidApiKey } from '@/utils/validators'
import { encrypt } from '@/services/encrypt'

const { t } = useI18n()
const apiKeysStore = useApiKeysStore()
const providersStore = useProvidersStore()

const emit = defineEmits<{
  close: []
  saved: []
}>()

// Form state
const provider = ref<ProviderType | ''>('')
const label = ref('')
const key = ref('')
const showKey = ref(false)
const baseUrl = ref('')
const modelsInput = ref('')
const modelsList = ref<string[]>([])

// UI state
const saving = ref(false)
const error = ref<string | null>(null)
const keyHint = ref('')

const filteredProviders = computed(() => providersStore.filteredProviders)

const providerInfo = computed(() => {
  if (!provider.value) return null
  return providersStore.getProvider(provider.value as ProviderType) ?? null
})

// Provider key format hints
const providerKeyHints: Partial<Record<ProviderType, string>> = {
  [ProviderType.OPENAI]: 'sk-... (starts with sk-, 20+ characters)',
  [ProviderType.ANTHROPIC]: 'sk-ant-... (starts with sk-ant-)',
  [ProviderType.DEEPSEEK]: 'sk-... (starts with sk-)',
  [ProviderType.GOOGLE]: 'AIza... (Google AI API key)',
  [ProviderType.AZURE]: 'Azure OpenAI key',
  [ProviderType.OPENROUTER]: 'sk-or-... (starts with sk-or-)',
  [ProviderType.MOONSHOT]: 'sk-... (Moonshot API key)',
  [ProviderType.GROQ]: 'gsk_... (starts with gsk_)',
  [ProviderType.QWEN]: 'sk-... (DashScope API key)',
  [ProviderType.GLM]: 'GLM API key',
  [ProviderType.OLLAMA]: 'Not required (leave empty)',
  [ProviderType.CUSTOM]: 'Custom provider key',
}

watch(provider, (val) => {
  if (val) {
    const pInfo = providersStore.getProvider(val as ProviderType)
    if (pInfo) {
      baseUrl.value = pInfo.defaultBaseUrl
    }
    keyHint.value = providerKeyHints[val as ProviderType] ?? ''
  } else {
    keyHint.value = ''
    baseUrl.value = ''
  }
})

function addModel() {
  const m = modelsInput.value.trim()
  if (m && !modelsList.value.includes(m)) {
    modelsList.value.push(m)
  }
  modelsInput.value = ''
}

function removeModel(model: string) {
  modelsList.value = modelsList.value.filter(m => m !== model)
}

function isFormValid(): boolean {
  if (!provider.value) return false
  if (!key.value.trim() && provider.value !== ProviderType.OLLAMA) return false
  if (provider.value !== ProviderType.OLLAMA && provider.value !== ProviderType.CUSTOM) {
    if (!isValidApiKey(key.value.trim(), provider.value as ProviderType)) return false
  }
  if (!label.value.trim()) return false
  return true
}

async function handleSave() {
  if (!isFormValid()) return

  saving.value = true
  error.value = null

  try {
    const encryptedKey = await encrypt(key.value.trim())
    const keyPreview = key.value.trim().length > 8
      ? key.value.trim().slice(0, 4) + '...' + key.value.trim().slice(-4)
      : key.value.trim().slice(0, 4) + '...'

    const result = await apiKeysStore.addKey({
      provider: provider.value as ProviderType,
      label: label.value.trim(),
      key: key.value.trim(),
      baseUrl: baseUrl.value.trim() || null,
      models: modelsList.value,
      status: KeyStatus.UNTESTED,
      lastTestedAt: null,
      lastTestResult: null,
      sortOrder: Date.now(),
    })

    if (result) {
      emit('saved')
      emit('close')
    } else {
      error.value = apiKeysStore.error || 'Failed to save key'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" @click.self="$emit('close')">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-800">{{ t('apiKeys.addKey') }}</h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >&times;</button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5">
        <!-- Provider dropdown -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('apiKeys.provider') }} <span class="text-red-500">*</span></label>
          <select
            v-model="provider"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="" disabled>{{ t('common.loading') }}</option>
            <option
              v-for="p in filteredProviders"
              :key="p.type"
              :value="p.type"
            >
              {{ p.icon }} {{ p.label }}
            </option>
          </select>
        </div>

        <!-- Label input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('apiKeys.label') }} <span class="text-red-500">*</span></label>
          <input
            v-model="label"
            type="text"
            :placeholder="t('apiKeys.placeholder.label')"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- API Key input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            {{ t('apiKeys.key') }}
            <span v-if="provider !== ProviderType.OLLAMA" class="text-red-500">*</span>
          </label>
          <div class="relative">
            <input
              v-model="key"
              :type="showKey ? 'text' : 'password'"
              :placeholder="t('apiKeys.placeholder.key')"
              class="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              @click="showKey = !showKey"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              {{ showKey ? '🙈' : '👁️' }}
            </button>
          </div>
          <p v-if="keyHint" class="mt-1 text-xs text-gray-400">{{ keyHint }}</p>
        </div>

        <!-- Base URL input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('apiKeys.baseUrl') }}</label>
          <input
            v-model="baseUrl"
            type="text"
            :placeholder="providerInfo?.defaultBaseUrl ?? 'https://...'"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Models multi-select (tag-style chips) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('apiKeys.models') }}</label>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="model in modelsList"
              :key="model"
              class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
            >
              {{ model }}
              <button
                type="button"
                @click="removeModel(model)"
                class="text-blue-400 hover:text-blue-600 leading-none"
              >&times;</button>
            </span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="modelsInput"
              type="text"
              :placeholder="t('apiKeys.placeholder.model')"
              class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keydown.enter.prevent="addModel"
            />
            <button
              type="button"
              @click="addModel"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >+</button>
          </div>
        </div>

        <!-- Error message -->
        <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>
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
