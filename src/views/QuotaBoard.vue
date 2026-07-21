<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { useQuotasStore } from '@/stores/quotas'
import { refreshAll } from '@/services/quota-checker'
import { autoRefreshScheduler } from '@/services/auto-refresh'
import QuotaGauge from '@/components/QuotaGauge.vue'

const { t } = useI18n()
const router = useRouter()
const quotasStore = useQuotasStore()
const quotaSourcesStore = useQuotaSourcesStore()

onMounted(() => {
  quotaSourcesStore.fetchAll()
  autoRefreshScheduler.start()
})

onUnmounted(() => {
  autoRefreshScheduler.stop()
})

// Emoji map for source types
const sourceTypeIcons: Record<string, string> = {
  'opencode-go': '\uD83D\uDD13',
  'bailian': '\u2601\uFE0F',
  'deepseek': '\uD83D\uDD2E',
  'moonshot': '\uD83C\uDF19',
  'groq': '\u26A1',
  'qwen': '\uD83C\uDF10',
  'glm': '\uD83D\uDCA0',
  'minimax': '\uD83E\uDD16',
}

function sourceIcon(type: string): string {
  return sourceTypeIcons[type] ?? '🔔'
}

// Counts
const enabledCount = computed(() => quotaSourcesStore.enabledSources.length)

const sourcesWithData = computed(() => {
  return quotaSourcesStore.sourceList.filter(s => {
    const id = s._id.replace('quota-source/', '')
    const entry = quotasStore.quotaMap[`source:${id}`]
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

function goToSourceDetail(sourceId: string) {
  router.push(`/quota/${sourceId}`)
}

function goToAddSource() {
  router.push('/quota-source/new')
}

function getCacheEntry(sourceId: string) {
  return quotasStore.quotaMap[`source:${sourceId}`]
}

function isCacheOutdated(sourceId: string): boolean {
  const entry = quotasStore.quotaMap[`source:${sourceId}`]
  if (!entry || entry.fetchedAt === 0) return false
  // Consider outdated if older than 30 minutes
  return Date.now() - entry.fetchedAt > 30 * 60 * 1000
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
        <span>{{ enabledCount }} {{ t('quotaSources.title') }}</span>
      </div>
      <div v-if="sourcesWithData.length > 0" class="flex items-center gap-1.5 text-gray-500">
        <span class="text-base">✅</span>
        <span>{{ sourcesWithData.length }} {{ t('common.withData') }}</span>
      </div>
      <div v-if="alertCount > 0" class="flex items-center gap-1.5 text-red-500 font-medium">
        <span class="text-base">🔔</span>
        <span>{{ alertCount }} {{ t('dashboard.alertKeys') }}</span>
      </div>
      <div v-if="lastRefreshDisplay" class="ml-auto text-gray-400">
        {{ t('quota.lastRefresh') }}: {{ lastRefreshDisplay }}
      </div>
    </div>

    <!-- Add Source button -->
    <div class="mb-4">
      <button
        @click="goToAddSource"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
      >
        <span>+</span>
        <span>{{ t('quotaSources.addSource') }}</span>
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="quotaSourcesStore.sourceList.length === 0 && !quotaSourcesStore.loading" class="text-center py-16">
      <div class="text-4xl mb-4">📊</div>
      <p class="text-gray-400 mb-4">{{ t('quota.noData') }}</p>
      <button
        @click="goToAddSource"
        class="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        {{ t('quotaSources.addSource') }}
      </button>
    </div>

    <!-- Loading skeleton for initial load -->
    <div v-if="quotaSourcesStore.loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="n in 3" :key="n" class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div class="h-5 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        <div class="space-y-3">
          <div class="h-4 bg-gray-100 rounded animate-pulse" />
          <div class="h-4 bg-gray-100 rounded animate-pulse" />
          <div class="h-4 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Source cards grid -->
    <div v-if="quotaSourcesStore.sourceList.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="source in quotaSourcesStore.sourceList"
        :key="source._id"
        @click="goToSourceDetail(source._id.replace('quota-source/', ''))"
        class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
      >
        <!-- Card header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xl" :title="source.sourceType">{{ sourceIcon(source.sourceType) }}</span>
            <span class="text-sm font-medium text-gray-800 truncate">{{ source.label }}</span>
          </div>
          <span
            v-if="source.enabled"
            class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"
          >
            {{ t('quotaSources.enabled') }}
          </span>
          <span
            v-else
            class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium"
          >
            {{ t('common.disabled') }}
          </span>
        </div>

        <!-- Outdated indicator -->
        <div
          v-if="isCacheOutdated(source._id.replace('quota-source/', ''))"
          class="text-xs text-orange-500 mb-2 flex items-center gap-1"
        >
          <span>\u26A0\uFE0F</span>
          <span>{{ t('common.stale') }}</span>
        </div>

        <!-- Quota gauges -->
        <template v-if="getCacheEntry(source._id.replace('quota-source/', ''))">
          <template
            v-for="(win, winKey) in getCacheEntry(source._id.replace('quota-source/', ''))!.windows"
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
        </template>

        <!-- Loading skeleton -->
        <div v-else-if="getCacheEntry(source._id.replace('quota-source/', ''))?.loading" class="space-y-2">
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
