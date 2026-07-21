import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQuotasStore } from '@/stores/quotas'
import type { IQuotaWindows, IQuotaHistoryEntry } from '@/types'

describe('quotas store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('getCached', () => {
    it('should return null when no entry exists', () => {
      const store = useQuotasStore()
      expect(store.getCached('key-1')).toBeNull()
    })

    it('should return entry when within TTL', () => {
      const store = useQuotasStore()
      const windows: IQuotaWindows = { monthly: { usedPercent: 30, resetsAt: null, used: 30, total: 100, unit: 'USD' } }
      store.updateQuota('key-1', windows)

      const cached = store.getCached('key-1')
      expect(cached).not.toBeNull()
      expect(cached!.windows.monthly?.usedPercent).toBe(30)
    })

    it('should return null when entry is expired (beyond TTL)', () => {
      const store = useQuotasStore()
      const windows: IQuotaWindows = { monthly: { usedPercent: 50, resetsAt: null, used: 50, total: 100, unit: 'USD' } }
      store.updateQuota('key-1', windows)

      // Manually set fetchedAt to 6 minutes ago
      const entry = store.quotaMap['key-1']
      if (entry) entry.fetchedAt = Date.now() - 6 * 60 * 1000

      expect(store.getCached('key-1')).toBeNull()
    })
  })

  describe('getStale', () => {
    it('should return entry even when expired', () => {
      const store = useQuotasStore()
      const windows: IQuotaWindows = { monthly: { usedPercent: 70, resetsAt: null, used: 70, total: 100, unit: 'USD' } }
      store.updateQuota('key-1', windows)

      // Manually set fetchedAt to 10 minutes ago (expired)
      const entry = store.quotaMap['key-1']
      if (entry) entry.fetchedAt = Date.now() - 10 * 60 * 1000

      const stale = store.getStale('key-1')
      expect(stale).not.toBeNull()
      expect(stale!.windows.monthly?.usedPercent).toBe(70)
    })

    it('should return null for missing key', () => {
      const store = useQuotasStore()
      expect(store.getStale('nonexistent')).toBeNull()
    })
  })

  describe('updateQuota', () => {
    it('should set the entry and record history', () => {
      const store = useQuotasStore()
      const windows: IQuotaWindows = { monthly: { usedPercent: 25, resetsAt: null, used: 25, total: 100, unit: 'USD' } }
      store.updateQuota('key-1', windows)

      const entry = store.quotaMap['key-1']
      expect(entry).toBeDefined()
      expect(entry!.loading).toBe(false)
      expect(entry!.windows.monthly?.usedPercent).toBe(25)

      const history = store.getHistory('key-1')
      expect(history.length).toBe(1)
      expect(history[0].usedPercent).toBe(25)
      expect(history[0].source).toBe('manual')
    })

    it('should cap history at 100 entries', () => {
      const store = useQuotasStore()
      // Add 101 entries
      for (let i = 0; i < 101; i++) {
        store.updateQuota('key-1', {
          monthly: { usedPercent: i % 100, resetsAt: null, used: i, total: 100, unit: 'USD' },
        })
      }
      expect(store.getHistory('key-1').length).toBe(100)
    })
  })

  describe('setLoading', () => {
    it('should set loading state for existing entry', () => {
      const store = useQuotasStore()
      store.updateQuota('key-1', { monthly: { usedPercent: 10, resetsAt: null, used: 10, total: 100, unit: 'USD' } })

      store.setLoading('key-1', true)
      expect(store.quotaMap['key-1']!.loading).toBe(true)

      store.setLoading('key-1', false)
      expect(store.quotaMap['key-1']!.loading).toBe(false)
    })

    it('should create entry when setting loading on missing key', () => {
      const store = useQuotasStore()
      store.setLoading('new-key', true)
      expect(store.quotaMap['new-key']).toBeDefined()
      expect(store.quotaMap['new-key']!.loading).toBe(true)
    })
  })

  describe('clearCache', () => {
    it('should clear quota map, history, and lastRefreshAt', () => {
      const store = useQuotasStore()
      store.updateQuota('key-1', { monthly: { usedPercent: 10, resetsAt: null, used: 10, total: 100, unit: 'USD' } })
      store.updateQuota('key-2', { weekly: { usedPercent: 50, resetsAt: null, used: 50, total: 100, unit: 'USD' } })
      expect(store.cachedItemIds.length).toBe(2)

      store.clearCache()
      expect(store.cachedItemIds.length).toBe(0)
      expect(store.getHistory('key-1').length).toBe(0)
      expect(store.lastRefreshAt).toBeNull()
    })
  })

  describe('getHistory', () => {
    it('should return empty array when no history exists', () => {
      const store = useQuotasStore()
      expect(store.getHistory('nonexistent')).toEqual([])
    })
  })

  describe('lowestQuotas', () => {
    it('should return keys sorted by highest usedPercent', () => {
      const store = useQuotasStore()
      store.updateQuota('key-low', { monthly: { usedPercent: 20, resetsAt: null, used: 20, total: 100, unit: 'USD' } })
      store.updateQuota('key-high', { monthly: { usedPercent: 90, resetsAt: null, used: 90, total: 100, unit: 'USD' } })
      store.updateQuota('key-mid', { monthly: { usedPercent: 50, resetsAt: null, used: 50, total: 100, unit: 'USD' } })

      const sorted = store.lowestQuotas
      expect(sorted.length).toBe(3)
      expect(sorted[0].itemId).toBe('key-high')
      expect(sorted[0].maxPercent).toBe(90)
      expect(sorted[1].itemId).toBe('key-mid')
      expect(sorted[2].itemId).toBe('key-low')
    })

    it('should pick the max percent across all windows', () => {
      const store = useQuotasStore()
      store.updateQuota('key-1', {
        rolling: { usedPercent: 30, resetsAt: null, used: 30, total: 100, unit: 'USD' },
        monthly: { usedPercent: 80, resetsAt: null, used: 80, total: 100, unit: 'USD' },
      })

      const sorted = store.lowestQuotas
      expect(sorted[0].maxPercent).toBe(80)
    })

    it('should skip loading entries', () => {
      const store = useQuotasStore()
      store.updateQuota('key-1', { monthly: { usedPercent: 50, resetsAt: null, used: 50, total: 100, unit: 'USD' } })
      store.setLoading('key-loading', true)

      const sorted = store.lowestQuotas
      expect(sorted.length).toBe(1)
      expect(sorted[0].itemId).toBe('key-1')
    })
  })
})
