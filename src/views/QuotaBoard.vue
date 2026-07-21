<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuotasStore } from '@/stores/quotas'
import { useApiKeysStore } from '@/stores/apiKeys'
import { refreshAll, forceRefreshKey } from '@/services/quota-checker'
import { autoRefreshScheduler } from '@/services/auto-refresh'
import ProviderIcon from '@/components/ProviderIcon.vue'
import KeyStatusBadge from '@/components/KeyStatusBadge.vue'
import QuotaGauge from '@/components/QuotaGauge.vue'

const { t } = useI18n()
const router = useRouter()
const quotasStore = useQuotasStore()
const apiKeysStore = useApiKeysStore()

onMounted(() => {
  apiKeysStore.fetchAll()
  autoRefreshScheduler.start()
})

onUnmounted(() => {
  autoRefreshScheduler.stop()
})

// Keys that support quota and have data or are loading
const quotaKeys = computed(() => {
  return apiKeysStore.activeKeys.filter(k => {
    const id = k._id.replace('apikey/', '')
    const entry = quotasStore.quotaMap[id]
    return entry !== undefined || quotasStore.getStale(id) !== null
  })
})

const keysWithData = computed(() => {
  return quotaKeys.value.filter(k => {
    const id = k._id.replace('apikey/', '')
    const entry = quotasStore.quotaMap[id]
    return entry && !entry.loading && entry.fetchedAt > 0
  })
})

const alertCount = computed(() => {
  return quotasStore.lowestQuotas.filter(q => q.maxPercent > 85).length
})

const lastRefreshDisplay = computed(() => {
  if (!quotasStore.lastRefreshAt) return null
  const d = new Date(quotasStore.lastRefreshAt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
})

async function handleRefreshAll() {
  await refreshAll()
}

function getKeyForId(apiKeyId: string) {
  return apiKeysStore.apiKeyList.find(k => k._id === `apikey/${apiKeyId}`)
}

function goToDetail(apiKeyId: string) {
  router.push(`/quota/${apiKeyId}`)
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('quota.title') }}</h1>
      <button
        @click="handleRefreshAll"
        :disabled="quotasStore.refreshing"
        class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg v-if="quotasStore.refreshing" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>{{ quotasStore.refreshing ? t('quota.refreshing') : t('quota.refreshNow') }}</span>
      </button>
    </div>

    <!-- Summary bar -->
    <div class="flex items-center gap-4 mb-6 text-sm">
      <div class="flex items-center gap-1.5 text-gray-500">
        <span class="text-base">📊</span>
        <span>{{ keysWithData.length }} {{ t('apiKeys.title') }}</span>
      </div>
      <div v-if="alertCount > 0" class="flex items-center gap-1.5 text-red-500 font-medium">
        <span class="text-base">🔔</span>
        <span>{{ alertCount }} {{ t('dashboard.alertKeys') }}</span>
      </div>
      <div v-if="lastRefreshDisplay" class="ml-auto text-gray-400">
        {{ t('quota.lastRefresh') }}: {{ lastRefreshDisplay }}
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="quotaKeys.length === 0 && !quotasStore.refreshing" class="text-center py-16">
      <div class="text-4xl mb-4">📈</div>
      <p class="text-gray-400">{{ t('quota.noData') }}</p>
      <button
        @click="handleRefreshAll"
        class="mt-4 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        {{ t('common.refresh') }}
      </button>
    </div>

    <!-- Quota cards grid -->
    <div v-if="quotaKeys.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="keyItem in quotaKeys"
        :key="keyItem._id"
        @click="goToDetail(keyItem._id.replace('apikey/', ''))"
        class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
      >
        <!-- Card header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 min-w-0">
            <ProviderIcon :provider="keyItem.provider" size="sm" />
            <span class="text-sm font-medium text-gray-800 truncate">{{ keyItem.label }}</span>
          </div>
          <KeyStatusBadge :status="keyItem.status" />
        </div>

        <!-- Quota gauges -->
        <div v-if="quotasStore.quotaMap[keyItem._id.replace('apikey/', '')]">
          <template
            v-for="(win, winKey) in quotasStore.quotaMap[keyItem._id.replace('apikey/', '')].windows"
            :key="winKey"
          >
            <QuotaGauge
              v-if="win"
              :used-percent="win.usedPercent"
              :label="t(`quota.${winKey}`)"
              :resets-at="win.resetsAt"
              compact
            />
          </template>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="quotasStore.quotaMap[keyItem._id.replace('apikey/', '')]?.loading" class="space-y-2">
          <div class="h-4 bg-gray-100 rounded animate-pulse" />
          <div class="h-4 bg-gray-100 rounded animate-pulse" />
          <div class="h-4 bg-gray-100 rounded animate-pulse" />
        </div>

        <!-- No data yet -->
        <div v-else class="text-center py-4">
          <p class="text-xs text-gray-400">{{ t('common.loading') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
