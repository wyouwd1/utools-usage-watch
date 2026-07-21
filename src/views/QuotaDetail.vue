<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { useQuotasStore } from '@/stores/quotas'
import { checkSingleSource, forceRefreshSource } from '@/services/quota-checker'
import QuotaGauge from '@/components/QuotaGauge.vue'
import QuotaTrendChart from '@/components/QuotaTrendChart.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const quotasStore = useQuotasStore()
const quotaSourcesStore = useQuotaSourcesStore()

const sourceId = computed(() => route.params.id as string)
const refreshing = ref(false)
const loadingSource = ref(false)

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
  return sourceTypeIcons[type] ?? '\uD83D\uDD14'
}

// Find the source from the store (with lazy fetch)
const source = computed(() =>
  quotaSourcesStore.sourceList.find(s => s._id === `quota-source/${sourceId.value}`) ?? null
)

const cacheKey = computed(() => `source:${sourceId.value}`)

const cacheEntry = computed(() =>
  quotasStore.quotaMap[cacheKey.value]
)

const windows = computed(() => cacheEntry.value?.windows ?? {})
const isLoading = computed(() => cacheEntry.value?.loading ?? false)

const history = computed(() =>
  quotasStore.getHistory(cacheKey.value)
)

onMounted(async () => {
  // Ensure sources are loaded
  if (quotaSourcesStore.sourceList.length === 0) {
    loadingSource.value = true
    await quotaSourcesStore.fetchAll()
    loadingSource.value = false
  }
  // Auto-load quota if not cached
  if (!cacheEntry.value) {
    await checkSingleSource(sourceId.value)
  }
})

async function handleRefresh() {
  refreshing.value = true
  try {
    await forceRefreshSource(sourceId.value)
  } finally {
    refreshing.value = false
  }
}

function formatWindow(win: { usedPercent: number; used: number; total: number; unit: string; resetsAt: number | null } | null | undefined) {
  if (!win) return null
  return {
    usedPercent: win.usedPercent,
    used: win.used,
    total: win.total,
    unit: win.unit,
    remaining: win.total - win.used,
    resetsAt: win.resetsAt,
  }
}

const rollingInfo = computed(() => formatWindow(windows.value.rolling))
const weeklyInfo = computed(() => formatWindow(windows.value.weekly))
const monthlyInfo = computed(() => formatWindow(windows.value.monthly))
</script>

<template>
  <div class="p-6">
    <!-- Back button -->
    <button @click="router.push('/quota')" class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
      <span>&larr;</span>
      <span>{{ t('common.back') }}</span>
    </button>

    <!-- Loading state -->
    <div v-if="isLoading && !cacheEntry || loadingSource" class="space-y-4">
      <div class="h-8 w-48 bg-gray-100 rounded animate-pulse" />
      <div class="h-4 w-32 bg-gray-100 rounded animate-pulse" />
      <div class="h-32 bg-gray-100 rounded animate-pulse mt-6" />
    </div>

    <!-- Source not found -->
    <div v-else-if="!source" class="text-center py-16">
      <p class="text-gray-400">{{ t('common.noData') }}</p>
    </div>

    <!-- Detail content -->
    <template v-else>
      <!-- Source info header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl" :title="source.sourceType">{{ sourceIcon(source.sourceType) }}</span>
          <div>
            <h1 class="text-2xl font-bold text-gray-800">{{ source.label }}</h1>
            <p class="text-sm text-gray-400 mt-0.5">{{ source.credentialHint }}</p>
            <span
              v-if="source.enabled"
              class="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"
            >
              {{ t('quotaSources.enabled') }}
            </span>
            <span
              v-else
              class="inline-block mt-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium"
            >
              {{ t('common.disabled') }}
            </span>
          </div>
        </div>
        <button
          @click="handleRefresh"
          :disabled="refreshing"
          class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg v-if="refreshing" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{{ refreshing ? t('quota.refreshing') : t('common.refresh') }}</span>
        </button>
      </div>

      <!-- Quota windows -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <!-- Rolling window -->
        <div v-if="rollingInfo" class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <QuotaGauge
            :used-percent="rollingInfo.usedPercent"
            :label="t('quota.rolling')"
            :resets-at="rollingInfo.resetsAt"
          />
          <div class="mt-3 space-y-1 text-xs text-gray-500">
            <div class="flex justify-between">
              <span>{{ t('quota.used') }}</span>
              <span class="font-medium text-gray-700">{{ rollingInfo.used.toFixed(2) }} {{ rollingInfo.unit }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('quota.total') }}</span>
              <span class="font-medium text-gray-700">{{ rollingInfo.total.toFixed(2) }} {{ rollingInfo.unit }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('quota.remaining') }}</span>
              <span class="font-medium text-gray-700">{{ rollingInfo.remaining.toFixed(2) }} {{ rollingInfo.unit }}</span>
            </div>
          </div>
        </div>

        <!-- Weekly window -->
        <div v-if="weeklyInfo" class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <QuotaGauge
            :used-percent="weeklyInfo.usedPercent"
            :label="t('quota.weekly')"
            :resets-at="weeklyInfo.resetsAt"
          />
          <div class="mt-3 space-y-1 text-xs text-gray-500">
            <div class="flex justify-between">
              <span>{{ t('quota.used') }}</span>
              <span class="font-medium text-gray-700">{{ weeklyInfo.used.toFixed(2) }} {{ weeklyInfo.unit }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('quota.total') }}</span>
              <span class="font-medium text-gray-700">{{ weeklyInfo.total.toFixed(2) }} {{ weeklyInfo.unit }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('quota.remaining') }}</span>
              <span class="font-medium text-gray-700">{{ weeklyInfo.remaining.toFixed(2) }} {{ weeklyInfo.unit }}</span>
            </div>
          </div>
        </div>

        <!-- Monthly window -->
        <div v-if="monthlyInfo" class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <QuotaGauge
            :used-percent="monthlyInfo.usedPercent"
            :label="t('quota.monthly')"
            :resets-at="monthlyInfo.resetsAt"
          />
          <div class="mt-3 space-y-1 text-xs text-gray-500">
            <div class="flex justify-between">
              <span>{{ t('quota.used') }}</span>
              <span class="font-medium text-gray-700">{{ monthlyInfo.used.toFixed(2) }} {{ monthlyInfo.unit }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('quota.total') }}</span>
              <span class="font-medium text-gray-700">{{ monthlyInfo.total.toFixed(2) }} {{ monthlyInfo.unit }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('quota.remaining') }}</span>
              <span class="font-medium text-gray-700">{{ monthlyInfo.remaining.toFixed(2) }} {{ monthlyInfo.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Trend chart -->
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 class="text-base font-semibold text-gray-800 mb-4">{{ t('quota.trend') }}</h2>
        <QuotaTrendChart :history="history" />
      </div>
    </template>
  </div>
</template>
