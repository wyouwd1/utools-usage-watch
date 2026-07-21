import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IQuotaCacheEntry, IQuotaWindows, IQuotaHistoryEntry } from '@/types'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useQuotasStore = defineStore('quotas', () => {
  // 额度缓存（内存，不写 utools.db — 程序运行数据 ⚠️）
  const quotaMap = ref<Record<string, IQuotaCacheEntry>>({})
  const historyMap = ref<Record<string, IQuotaHistoryEntry[]>>({})
  const lastRefreshAt = ref<number | null>(null)
  const refreshing = ref(false)

  const cachedItemIds = computed(() => Object.keys(quotaMap.value))

  function getCached(itemId: string): IQuotaCacheEntry | null {
    const entry = quotaMap.value[itemId]
    if (!entry) return null
    if (Date.now() - entry.fetchedAt < CACHE_TTL) return entry
    return null // expired
  }

  function getStale(itemId: string): IQuotaCacheEntry | null {
    return quotaMap.value[itemId] ?? null
  }

  function updateQuota(itemId: string, windows: IQuotaWindows): void {
    quotaMap.value[itemId] = {
      windows,
      fetchedAt: Date.now(),
      loading: false,
    }
    // Record history
    const windowsToRecord = [windows.rolling, windows.weekly, windows.monthly].find(w => w != null)
    if (windowsToRecord) {
      if (!historyMap.value[itemId]) historyMap.value[itemId] = []
      historyMap.value[itemId].push({
        itemId,
        usedPercent: windowsToRecord.usedPercent,
        recordedAt: Date.now(),
        source: 'manual',
      })
      // Keep only last 100 entries per item
      if (historyMap.value[itemId].length > 100) {
        historyMap.value[itemId] = historyMap.value[itemId].slice(-100)
      }
    }
    lastRefreshAt.value = Date.now()
  }

  function setLoading(itemId: string, loading: boolean): void {
    if (!quotaMap.value[itemId]) {
      quotaMap.value[itemId] = { windows: {}, fetchedAt: 0, loading }
    } else {
      quotaMap.value[itemId].loading = loading
    }
  }

  function clearCache(): void {
    quotaMap.value = {}
    historyMap.value = {}
    lastRefreshAt.value = null
  }

  function getHistory(itemId: string): IQuotaHistoryEntry[] {
    return historyMap.value[itemId] ?? []
  }

  const lowestQuotas = computed(() => {
    return Object.entries(quotaMap.value)
      .filter(([, entry]) => !entry.loading && entry.fetchedAt > 0)
      .map(([id, entry]) => {
        const all = [entry.windows.rolling, entry.windows.weekly, entry.windows.monthly].filter(w => w != null)
        const maxPercent = all.length > 0 ? Math.max(...all.map(w => w!.usedPercent)) : 0
        return { itemId: id, maxPercent }
      })
      .sort((a, b) => b.maxPercent - a.maxPercent)
  })

  return {
    quotaMap, historyMap, lastRefreshAt, refreshing,
    cachedItemIds,
    getCached, getStale, updateQuota, setLoading, clearCache,
    getHistory, lowestQuotas,
  }
})
