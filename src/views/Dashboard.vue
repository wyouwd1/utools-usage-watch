<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useApiKeysStore } from '@/stores/apiKeys'
import { useQuotasStore } from '@/stores/quotas'
import { useProvidersStore } from '@/stores/providers'
import { refreshAll } from '@/services/quota-checker'
import ProviderIcon from '@/components/ProviderIcon.vue'
import KeyStatusBadge from '@/components/KeyStatusBadge.vue'
import QuotaGauge from '@/components/QuotaGauge.vue'

const { t } = useI18n()
const router = useRouter()
const apiKeysStore = useApiKeysStore()
const quotasStore = useQuotasStore()
const providersStore = useProvidersStore()

const totalKeys = computed(() => apiKeysStore.apiKeyList.length)
const activeKeysCount = computed(() => apiKeysStore.activeKeys.length)

// Keys in alert: keys with usage > 80% from lowestQuotas
const alertKeysCount = computed(() => {
  return quotasStore.lowestQuotas.filter(item => item.maxPercent > 80).length
})

// Recent test results: last 5 tested keys sorted by lastTestedAt desc
const recentTests = computed(() => {
  return apiKeysStore.apiKeyList
    .filter(k => k.lastTestedAt != null)
    .sort((a, b) => (b.lastTestedAt ?? 0) - (a.lastTestedAt ?? 0))
    .slice(0, 5)
})

// Quota alerts: keys with highest usage percent from quotas store
const quotaAlerts = computed(() => {
  const alerts: { apiKeyId: string; label: string; provider: import('@/types').ProviderType; usedPercent: number }[] = []
  const keyMap = new Map(apiKeysStore.apiKeyList.map(k => [k._id.replace('apikey/', ''), k]))
  for (const item of quotasStore.lowestQuotas) {
    const apiKey = keyMap.get(item.apiKeyId)
    if (apiKey) {
      alerts.push({
        apiKeyId: item.apiKeyId,
        label: apiKey.label,
        provider: apiKey.provider,
        usedPercent: item.maxPercent,
      })
    }
  }
  return alerts.slice(0, 10)
})

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return t('common.timeJustNow')
  if (diffMin < 60) return t('common.timeMinutesAgo', { n: diffMin })
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return t('common.timeHoursAgo', { n: diffH })
  const diffD = Math.floor(diffH / 24)
  return t('common.timeDaysAgo', { n: diffD })
}

function goTo(path: string) {
  router.push(path)
}

async function handleRefreshAll() {
  await refreshAll()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-gray-800">{{ t('dashboard.title') }}</h1>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">{{ t('dashboard.totalKeys') }}</p>
        <p class="text-3xl font-bold text-gray-800 mt-1">{{ totalKeys }}</p>
      </div>
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">{{ t('dashboard.activeKeys') }}</p>
        <p class="text-3xl font-bold text-green-600 mt-1">{{ activeKeysCount }}</p>
      </div>
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">{{ t('dashboard.alertKeys') }}</p>
        <p class="text-3xl font-bold text-red-500 mt-1">{{ alertKeysCount }}</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="flex flex-wrap gap-3">
      <button
        @click="goTo('/api-keys')"
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <span>+</span>
        <span>{{ t('dashboard.quickAdd') }}</span>
      </button>
      <button
        @click="handleRefreshAll"
        :disabled="quotasStore.refreshing"
        class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="quotasStore.refreshing" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span v-else>&#x21bb;</span>
        <span>{{ t('dashboard.quickRefresh') }}</span>
      </button>
      <button
        @click="goTo('/quota')"
        class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
      >
        <span>&#x25B6;</span>
        <span>{{ t('dashboard.quickQuota') }}</span>
      </button>
    </div>

    <!-- Recent Test Results -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
      <div class="px-5 py-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-800">{{ t('dashboard.recentTests') }}</h2>
      </div>
      <div v-if="recentTests.length > 0" class="divide-y divide-gray-50">
        <div
          v-for="key in recentTests"
          :key="key._id"
          class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
          @click="goTo(`/api-keys/${key._id.replace('apikey/', '')}`)"
        >
          <ProviderIcon :provider="key.provider" size="sm" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ key.label }}</p>
            <p class="text-xs text-gray-400">{{ key.keyPreview }}</p>
          </div>
          <KeyStatusBadge :status="key.status" />
          <div class="text-right">
            <p class="text-xs font-medium" :class="key.lastTestResult?.success ? 'text-green-600' : 'text-red-600'">
              {{ key.lastTestResult?.success ? t('apiKeys.testSuccess') : t('apiKeys.testFail') }}
            </p>
            <p class="text-xs text-gray-400">
              {{ key.lastTestedAt ? formatDate(key.lastTestedAt) : t('apiKeys.neverTested') }}
            </p>
          </div>
        </div>
      </div>
      <p v-else class="text-gray-400 text-center py-8">{{ t('common.noData') }}</p>
    </div>

    <!-- Quota Alerts -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
      <div class="px-5 py-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-800">{{ t('dashboard.alertKeys') }}</h2>
      </div>
      <div v-if="quotaAlerts.length > 0" class="divide-y divide-gray-50">
        <div
          v-for="alert in quotaAlerts"
          :key="alert.apiKeyId"
          class="px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
          @click="goTo(`/quota/${alert.apiKeyId}`)"
        >
          <div class="flex items-center gap-3 mb-1">
            <ProviderIcon :provider="alert.provider" size="sm" />
            <span class="text-sm font-medium text-gray-800 truncate">{{ alert.label }}</span>
            <span v-if="alert.usedPercent > 80" class="text-xs font-bold text-red-500 ml-auto">{{ alert.usedPercent }}%</span>
            <span v-else-if="alert.usedPercent > 50" class="text-xs font-bold text-yellow-600 ml-auto">{{ alert.usedPercent }}%</span>
            <span v-else class="text-xs font-bold text-green-600 ml-auto">{{ alert.usedPercent }}%</span>
          </div>
          <QuotaGauge :used-percent="alert.usedPercent" :label="alert.label" compact />
        </div>
      </div>
      <p v-else class="text-gray-400 text-center py-8">{{ t('common.noData') }}</p>
    </div>
  </div>
</template>
