<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useApiKeysStore } from '@/stores/apiKeys'
import { useProvidersStore } from '@/stores/providers'
import { ProviderType, KeyStatus } from '@/types'
import { isValidApiKey } from '@/utils/validators'
import { encrypt } from '@/services/encrypt'
import TestConnection from '@/components/TestConnection.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const apiKeysStore = useApiKeysStore()
const providersStore = useProvidersStore()

const id = computed(() => route.params.id as string)
const isNew = computed(() => id.value === 'new')

// Form state
const provider = ref<ProviderType | ''>('')
const label = ref('')
const key = ref('')
const showKey = ref(false)
const baseUrl = ref('')
const modelsInput = ref('')
const modelsList = ref<string[]>([])
const alertThreshold = ref(30)

// UI state
const saving = ref(false)
const error = ref<string | null>(null)
const keyHint = ref('')
const formLoaded = ref(false)

// Existing key entity (for editing)
const existingKey = computed(() => {
  if (isNew.value) return null
  return apiKeysStore.apiKeyList.find(k => k._id === `apikey/${id.value}`) ?? null
})

const existingKeyFullId = computed(() => {
  if (isNew.value || !existingKey.value) return ''
  return existingKey.value!._id
})

// Load existing key data into form
onMounted(() => {
  if (!isNew.value) {
    loadExistingKey()
  } else {
    formLoaded.value = true
  }
})

function loadExistingKey() {
  const ek = existingKey.value
  if (!ek) {
    // Key not found in store, try to load from repo
    apiKeysStore.fetchAll().then(() => {
      const reloaded = apiKeysStore.apiKeyList.find(k => k._id === `apikey/${id.value}`)
      if (reloaded) {
        fillForm(reloaded)
      } else {
        error.value = 'Key not found'
      }
      formLoaded.value = true
    })
    return
  }
  fillForm(ek)
  formLoaded.value = true
}

function fillForm(ek: NonNullable<typeof existingKey.value>) {
  provider.value = ek.provider
  label.value = ek.label
  baseUrl.value = ek.baseUrl ?? ''
  modelsList.value = [...ek.models]
  alertThreshold.value = ek.quotaAlertThreshold
  // Show key preview in the key field
  key.value = ek.keyPreview ?? ''

  const pInfo = providersStore.getProvider(ek.provider)
  if (pInfo) {
    keyHint.value = providerKeyHints[ek.provider] ?? ''
  }
}

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

const filteredProviders = computed(() => providersStore.filteredProviders)

watch(provider, (val) => {
  if (val) {
    const pInfo = providersStore.getProvider(val as ProviderType)
    if (pInfo) {
      // Only set default base URL if not editing or if baseUrl is empty
      if (isNew.value || !baseUrl.value) {
        baseUrl.value = pInfo.defaultBaseUrl
      }
    }
    keyHint.value = providerKeyHints[val as ProviderType] ?? ''
  } else {
    keyHint.value = ''
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
  if (!label.value.trim()) return false
  return true
}

async function handleSave() {
  if (!isFormValid()) return

  saving.value = true
  error.value = null

  try {
    const commonData = {
      provider: provider.value as ProviderType,
      label: label.value.trim(),
      baseUrl: baseUrl.value.trim() || null,
      models: modelsList.value,
      quotaAlertThreshold: alertThreshold.value,
    }

    if (isNew.value) {
      // Adding new key
      if (!key.value.trim()) {
        error.value = 'API Key is required'
        saving.value = false
        return
      }
      const encryptedKey = await encrypt(key.value.trim())
      const keyPreview = key.value.trim().length > 8
        ? key.value.trim().slice(0, 4) + '...' + key.value.trim().slice(-4)
        : key.value.trim().slice(0, 4) + '...'

      const result = await apiKeysStore.addKey({
        ...commonData,
        key: key.value.trim(),
        status: KeyStatus.UNTESTED,
        lastTestedAt: null,
        lastTestResult: null,
        sortOrder: Date.now(),
      })

      if (result) {
        router.push('/api-keys')
      } else {
        error.value = apiKeysStore.error || 'Failed to save key'
      }
    } else {
      // Updating existing key
      const updateData: Record<string, any> = { ...commonData }

      // If user entered a new key value (different from preview), encrypt it
      if (key.value.trim() && key.value.trim() !== existingKey.value?.keyPreview) {
        const encryptedKey = await encrypt(key.value.trim())
        const keyPreview = key.value.trim().length > 8
          ? key.value.trim().slice(0, 4) + '...' + key.value.trim().slice(-4)
          : key.value.trim().slice(0, 4) + '...'
        updateData.encryptedKey = encryptedKey
        updateData.keyPreview = keyPreview
      }

      const result = apiKeysStore.updateKey(id.value, updateData)
      if (result) {
        router.push('/api-keys')
      } else {
        error.value = apiKeysStore.error || 'Failed to update key'
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
    <button @click="router.push('/api-keys')" class="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
      <span>&larr;</span>
      <span>{{ t('common.back') }}</span>
    </button>

    <!-- Title -->
    <h1 class="text-2xl font-bold text-gray-800 mb-6">
      {{ isNew ? t('apiKeys.addKey') : t('apiKeys.editKey') }}
    </h1>

    <!-- Loading state -->
    <div v-if="!formLoaded" class="text-center py-12">
      <p class="text-gray-400">{{ t('common.loading') }}</p>
    </div>

    <!-- Error: key not found -->
    <div v-else-if="!isNew && !existingKey && error" class="text-center py-12">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <!-- Form -->
    <div v-else class="max-w-lg mx-auto space-y-5">
      <!-- Test connection (only for existing keys) -->
      <div v-if="!isNew && existingKey" class="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <TestConnection :api-key-id="existingKey!._id" />
      </div>

      <!-- Provider dropdown -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('apiKeys.provider') }} <span class="text-red-500">*</span></label>
        <select
          v-model="provider"
          :disabled="!isNew"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
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
          {{ isNew ? t('apiKeys.key') : t('apiKeys.key') + ' (' + t('common.edit') + ')' }}
          <span v-if="isNew && provider !== ProviderType.OLLAMA" class="text-red-500">*</span>
        </label>
        <div class="relative">
          <input
            v-model="key"
            :type="showKey ? 'text' : 'password'"
            :placeholder="isNew ? t('apiKeys.placeholder.key') : (existingKey?.keyPreview ?? '')"
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
        <p v-if="!isNew" class="mt-1 text-xs text-gray-400">{{ t('apiKeys.keepExistingKey') }}</p>
      </div>

      <!-- Base URL input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('apiKeys.baseUrl') }}</label>
        <input
          v-model="baseUrl"
          type="text"
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

      <!-- Alert threshold slider (10-50%) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ t('apiKeys.alertThreshold') }}: {{ alertThreshold }}%
        </label>
        <input
          v-model.number="alertThreshold"
          type="range"
          min="10"
          max="50"
          step="5"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div class="flex justify-between text-xs text-gray-400 mt-1">
          <span>10%</span>
          <span>50%</span>
        </div>
      </div>

      <!-- Error message -->
      <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

      <!-- Action buttons -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <button
          @click="router.push('/api-keys')"
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
