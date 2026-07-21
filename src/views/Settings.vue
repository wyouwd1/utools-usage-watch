<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { useApiKeysStore } from '@/stores/apiKeys'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { autoRefreshScheduler } from '@/services/auto-refresh'
import * as apiKeysRepo from '@/db/apiKeys.repo'
import { COLLECTION } from '@/db/index'
import * as quotaSourcesRepo from '@/db/quotaSources.repo'
import { encrypt } from '@/services/encrypt'

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()
const apiKeysStore = useApiKeysStore()

// Language selector
const languageModel = computed({
  get: () => settingsStore.settings.language,
  set: (val: 'zh-CN' | 'en-US') => {
    settingsStore.save('language', val)
    locale.value = val
  },
})

// Refresh interval dropdown options
const refreshOptions = [5, 15, 30, 60]

const refreshIntervalModel = computed({
  get: () => settingsStore.settings.refreshInterval,
  set: (val: number) => {
    settingsStore.save('refreshInterval', val)
    autoRefreshScheduler.start(val)
  },
})

	// UI state
const importStatus = ref<string | null>(null)
const exportStatus = ref<string | null>(null)
const showResetConfirm = ref(false)

onMounted(() => {
  if (!settingsStore.loaded) {
    settingsStore.load()
  }
  // Run migration to ensure defaults exist
  settingsStore.migrate()
})

	// Export all data as JSON file download
	function handleExport() {
	  try {
	    // Load quota sources for export
		    const quotaSources = quotaSourcesRepo.getAll()

	    const apiKeys = apiKeysStore.apiKeyList.map(k => ({
      provider: k.provider,
      label: k.label,
      encryptedKey: k.encryptedKey,
      keyPreview: k.keyPreview,
      baseUrl: k.baseUrl,
      models: k.models,
      status: k.status,
      lastTestedAt: k.lastTestedAt,
      lastTestResult: k.lastTestResult,
      sortOrder: k.sortOrder,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }))

	    const exportData = {
	      version: '1.0.0',
	      exportedAt: new Date().toISOString(),
	      settings: { ...settingsStore.settings },
	      apiKeys,
	      quotaSources,  // NEW: export quota sources
	    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-usage-watch-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportStatus.value = 'success'
    setTimeout(() => { exportStatus.value = null }, 3000)
  } catch {
    exportStatus.value = 'error'
    setTimeout(() => { exportStatus.value = null }, 3000)
  }
}

// Import data from JSON file
function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)

      // Validate basic structure
      if (!data.apiKeys || !Array.isArray(data.apiKeys)) {
        throw new Error('Invalid import file: missing apiKeys array')
      }

      // Import settings
      if (data.settings) {
        if (data.settings.language) {
          settingsStore.save('language', data.settings.language)
          locale.value = data.settings.language
        }
        if (data.settings.refreshInterval) {
          settingsStore.save('refreshInterval', data.settings.refreshInterval)
          autoRefreshScheduler.start(data.settings.refreshInterval)
        }
        if (data.settings.defaultAlertThreshold != null) {
          settingsStore.save('defaultAlertThreshold', data.settings.defaultAlertThreshold)
        }
      }

      // Clear existing keys and import from backup
      apiKeysRepo.clearAll()
      for (const keyData of data.apiKeys) {
        if (keyData.provider && keyData.label) {
          try {
            const encryptedKey = keyData.encryptedKey || (keyData.key ? await encrypt(keyData.key) : '')
            const keyPreview = keyData.keyPreview
              ?? (keyData.encryptedKey
                ? keyData.encryptedKey.slice(0, 4) + '...' + keyData.encryptedKey.slice(-4)
                : (keyData.key
                  ? keyData.key.slice(0, 4) + '...' + keyData.key.slice(-4)
                  : '...'))
            apiKeysRepo.importEntity({
              _id: COLLECTION.API_KEY + (keyData._id?.replace('apikey/', '') ?? crypto.randomUUID()),
              type: 'apikey',
              provider: keyData.provider,
              label: keyData.label,
              encryptedKey,
              keyPreview,
              baseUrl: keyData.baseUrl ?? null,
              models: keyData.models ?? [],
              status: keyData.status ?? 'untested',
              lastTestedAt: keyData.lastTestedAt ?? null,
              lastTestResult: keyData.lastTestResult ?? null,
              sortOrder: keyData.sortOrder ?? Date.now(),
              createdAt: keyData.createdAt ?? Date.now(),
              updatedAt: keyData.updatedAt ?? Date.now(),
            })
          } catch {
            // Skip keys that fail to import
          }
        }
	      }

	      // Import quota sources
	      if (data.quotaSources && Array.isArray(data.quotaSources)) {
	        quotaSourcesRepo.clearAll()
	        for (const qs of data.quotaSources) {
	          if (qs.sourceType && qs.label) {
	            try {
              quotaSourcesRepo.importEntity({
                _id: qs._id ?? `quota-source/${crypto.randomUUID()}`,
                type: 'quota-source',
                sourceType: qs.sourceType,
                label: qs.label,
                encryptedCredential: qs.encryptedCredential ?? '',
                credentialHint: qs.credentialHint ?? '',
                curlRaw: qs.curlRaw ?? undefined,
                baseUrl: qs.baseUrl ?? undefined,
                config: qs.config ?? {},
                enabled: qs.enabled ?? true,
                sortOrder: qs.sortOrder ?? Date.now(),
                createdAt: qs.createdAt ?? Date.now(),
                updatedAt: qs.updatedAt ?? Date.now(),
              })
	            } catch {
	              // Skip sources that fail to import
	            }
	          }
	        }
	      }

		      // Reload the stores
		      await apiKeysStore.fetchAll()
		      const quotaSourcesStore = useQuotaSourcesStore()
		      await quotaSourcesStore.fetchAll()


	      importStatus.value = 'success'
      setTimeout(() => { importStatus.value = null }, 3000)
    } catch (err) {
      importStatus.value = 'error'
      setTimeout(() => { importStatus.value = null }, 3000)
    }
  }
  reader.readAsText(file)

  // Reset the input so the same file can be re-imported
  input.value = ''
}

// Reset settings to defaults
function handleReset() {
  settingsStore.reset()
  locale.value = settingsStore.settings.language
  autoRefreshScheduler.start(settingsStore.settings.refreshInterval)
  showResetConfirm.value = false
}
</script>

<template>
  <div class="p-6 max-w-2xl">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">{{ t('settings.title') }}</h1>

    <!-- Language selector -->
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
      <h2 class="text-base font-semibold text-gray-800 mb-1">{{ t('settings.languageLabel') }}</h2>
      <p class="text-xs text-gray-400 mb-3">{{ t('settings.languageDescription') }}</p>
      <select
        v-model="languageModel"
        class="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        <option value="zh-CN">中文</option>
        <option value="en-US">English</option>
      </select>
    </section>

    <!-- Refresh interval -->
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
      <h2 class="text-base font-semibold text-gray-800 mb-1">{{ t('settings.refreshIntervalLabel') }}</h2>
      <p class="text-xs text-gray-400 mb-3">{{ t('settings.refreshIntervalDescription') }}</p>
      <select
        v-model.number="refreshIntervalModel"
        class="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        <option
          v-for="opt in refreshOptions"
          :key="opt"
          :value="opt"
        >
          {{ opt }} {{ t('settings.minutes') }}
        </option>
      </select>
    </section>

	    <!-- Export / Import -->
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
      <h2 class="text-base font-semibold text-gray-800 mb-1">{{ t('settings.export') }} / {{ t('settings.import') }}</h2>
      <p class="text-xs text-gray-400 mb-4">{{ t('settings.exportDescription') }}</p>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Export button -->
        <button
          @click="handleExport"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {{ t('settings.exportData') }}
        </button>

        <!-- Import: file picker -->
        <label class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
          {{ t('settings.importData') }}
          <input
            type="file"
            accept=".json"
            class="hidden"
            @change="handleImport"
          />
        </label>
      </div>

      <!-- Import description -->
      <p class="text-xs text-gray-400 mt-2">{{ t('settings.importDescription') }}</p>

      <!-- Status messages -->
      <p
        v-if="exportStatus === 'success'"
        class="mt-3 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2"
      >
        {{ t('settings.exportSuccess') }}
      </p>
      <p
        v-if="importStatus === 'success'"
        class="mt-3 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2"
      >
        {{ t('settings.importSuccess') }}
      </p>
      <p
        v-if="importStatus === 'error'"
        class="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
      >
        {{ t('settings.importError') }}
      </p>
    </section>

    <!-- Reset settings -->
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
      <h2 class="text-base font-semibold text-gray-800 mb-1">{{ t('settings.reset') }}</h2>
      <p class="text-xs text-gray-400 mb-4">{{ t('settings.resetConfirm') }}</p>
      <button
        @click="showResetConfirm = true"
        class="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
      >
        {{ t('settings.reset') }}
      </button>

      <!-- Reset confirm dialog -->
      <div
        v-if="showResetConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        @click.self="showResetConfirm = false"
      >
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ t('settings.reset') }}</h3>
          <p class="text-sm text-gray-600 mb-6">{{ t('settings.resetConfirm') }}</p>
          <div class="flex items-center justify-end gap-3">
            <button
              @click="showResetConfirm = false"
              class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              @click="handleReset"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              {{ t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- About section -->
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 class="text-base font-semibold text-gray-800 mb-3">{{ t('settings.about') }}</h2>
      <div class="space-y-2 text-sm text-gray-600">
        <div class="flex items-center gap-2">
          <span class="text-gray-400 w-16">{{ t('settings.version') }}:</span>
          <span class="font-medium text-gray-800">1.0.0</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-400 w-16">{{ t('settings.author') }}:</span>
          <span class="text-gray-800">utools-usage-watch</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-400 w-16">GitHub:</span>
          <a
            href="https://github.com/your-username/ai-usage-watch"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-800 hover:underline"
          >
            github.com/your-username/ai-usage-watch
          </a>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-4">{{ t('app.subtitle') }}</p>
    </section>
  </div>
</template>
