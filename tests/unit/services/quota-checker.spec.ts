import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { checkSingleSource, refreshAll, forceRefreshSource } from '@/services/quota-checker'
import { quotaSourceRegistry } from '@/services/quota-sources/registry'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { useQuotasStore } from '@/stores/quotas'
import { QuotaSourceType, type IQuotaWindows } from '@/types'
import type { IQuotaSourceAdapter } from '@/services/quota-sources'

// Mock adapter implementing IQuotaSourceAdapter
class MockQuotaAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.OPENCODE_GO
  readonly label = 'Mock Quota Source'
  readonly defaultBaseUrl = 'https://api.mock.ai'

  checkQuotaImpl = vi.fn<[], Promise<IQuotaWindows | null>>()

  async checkQuota(_credential: string, _config?: Record<string, any>) {
    return this.checkQuotaImpl()
  }
}

describe('quota-checker', () => {
  let adapter: MockQuotaAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    adapter = new MockQuotaAdapter()
    quotaSourceRegistry.register(adapter)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setupStore(sources: Array<{ id: string; sourceType: QuotaSourceType }>) {
    const sourcesStore = useQuotaSourcesStore()
    for (const s of sources) {
      sourcesStore.sourceList.push({
        _id: `quota-source/${s.id}`,
        _rev: undefined,
        type: 'quota-source',
        sourceType: s.sourceType,
        label: `Source ${s.id}`,
        encryptedCredential: 'mock-credential',
        credentialHint: 'mock-...cred',
        baseUrl: undefined,
        config: undefined,
        enabled: true,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  }

  describe('checkSingleSource', () => {
    it('should fetch quota and update the store', async () => {
      setupStore([{ id: 'source-1', sourceType: QuotaSourceType.OPENCODE_GO }])
      const quotasStore = useQuotasStore()

      adapter.checkQuotaImpl.mockResolvedValue({
        monthly: { usedPercent: 45, resetsAt: null, used: 45, total: 100, unit: 'USD' },
      })

      await checkSingleSource('source-1')

      const entry = quotasStore.quotaMap['source:source-1']
      expect(entry).toBeDefined()
      expect(entry!.windows.monthly?.usedPercent).toBe(45)
      expect(entry!.loading).toBe(false)
      expect(entry!.fetchedAt).toBeGreaterThan(0)
    })

    it('should skip if fresh cache exists', async () => {
      setupStore([{ id: 'source-1', sourceType: QuotaSourceType.OPENCODE_GO }])
      const quotasStore = useQuotasStore()

      // Pre-populate cache with prefixed key
      quotasStore.updateQuota('source:source-1', {
        monthly: { usedPercent: 10, resetsAt: null, used: 10, total: 100, unit: 'USD' },
      })

      adapter.checkQuotaImpl.mockResolvedValue({
        monthly: { usedPercent: 90, resetsAt: null, used: 90, total: 100, unit: 'USD' },
      })

      await checkSingleSource('source-1')

      // Should still have the old value (cache hit)
      expect(quotasStore.quotaMap['source:source-1']!.windows.monthly?.usedPercent).toBe(10)
    })

    it('should do nothing for sources with no adapter', async () => {
      // Use a source type that is not registered by the auto-loaded adapters
      setupStore([{ id: 'source-1', sourceType: 'nonexistent-protocol' as QuotaSourceType }])
      const quotasStore = useQuotasStore()

      await checkSingleSource('source-1')
      expect(quotasStore.quotaMap['source:source-1']).toBeUndefined()
    })

    it('should handle adapter throwing an error', async () => {
      setupStore([{ id: 'source-1', sourceType: QuotaSourceType.OPENCODE_GO }])
      const quotasStore = useQuotasStore()

      adapter.checkQuotaImpl.mockRejectedValue(new Error('Network error'))

      await checkSingleSource('source-1')
      // Should not crash; loading should be false
      expect(quotasStore.quotaMap['source:source-1']?.loading).toBe(false)
    })

    it('should preserve stale cache on error', async () => {
      setupStore([{ id: 'source-1', sourceType: QuotaSourceType.OPENCODE_GO }])
      const quotasStore = useQuotasStore()

      // First successful fetch
      adapter.checkQuotaImpl.mockResolvedValueOnce({
        monthly: { usedPercent: 30, resetsAt: null, used: 30, total: 100, unit: 'USD' },
      })
      await checkSingleSource('source-1')
      expect(quotasStore.quotaMap['source:source-1']!.windows.monthly?.usedPercent).toBe(30)

      // Second fetch fails
      adapter.checkQuotaImpl.mockRejectedValueOnce(new Error('Timeout'))
      // Simulate expired cache for second call to skip TTL
      quotasStore.quotaMap['source:source-1']!.fetchedAt = Date.now() - 10 * 60 * 1000

      await checkSingleSource('source-1')

      // Should still have the old stale data
      const entry = quotasStore.getStale('source:source-1')
      expect(entry).not.toBeNull()
      expect(entry!.windows.monthly?.usedPercent).toBe(30)
    })
  })

  describe('refreshAll', () => {
    it('should refresh all enabled sources', async () => {
      setupStore([
        { id: 'source-1', sourceType: QuotaSourceType.OPENCODE_GO },
        { id: 'source-2', sourceType: QuotaSourceType.OPENCODE_GO },
      ])
      const quotasStore = useQuotasStore()

      adapter.checkQuotaImpl.mockResolvedValue({
        monthly: { usedPercent: 50, resetsAt: null, used: 50, total: 100, unit: 'USD' },
      })

      await refreshAll()

      expect(quotasStore.quotaMap['source:source-1']).toBeDefined()
      expect(quotasStore.quotaMap['source:source-2']).toBeDefined()
      expect(quotasStore.refreshing).toBe(false)
    })

    it('should handle mixed success gracefully', async () => {
      setupStore([
        { id: 'source-1', sourceType: QuotaSourceType.OPENCODE_GO },
        { id: 'source-2', sourceType: QuotaSourceType.OPENCODE_GO },
      ])
      const quotasStore = useQuotasStore()

      adapter.checkQuotaImpl
        .mockResolvedValueOnce({ monthly: { usedPercent: 20, resetsAt: null, used: 20, total: 100, unit: 'USD' } })
        .mockRejectedValueOnce(new Error('Server error'))

      await refreshAll()

      expect(quotasStore.quotaMap['source:source-1']?.windows.monthly?.usedPercent).toBe(20)
      // source-2 failed but loading should be cleared
      expect(quotasStore.quotaMap['source:source-2']?.loading).toBe(false)
    })
  })

  describe('forceRefreshSource', () => {
    it('should force refresh even if cache exists', async () => {
      setupStore([{ id: 'source-1', sourceType: QuotaSourceType.OPENCODE_GO }])
      const quotasStore = useQuotasStore()

      // Pre-populate cache
      quotasStore.updateQuota('source:source-1', {
        monthly: { usedPercent: 10, resetsAt: null, used: 10, total: 100, unit: 'USD' },
      })

      adapter.checkQuotaImpl.mockResolvedValue({
        monthly: { usedPercent: 75, resetsAt: null, used: 75, total: 100, unit: 'USD' },
      })

      await forceRefreshSource('source-1')

      // Should have the new value
      expect(quotasStore.quotaMap['source:source-1']!.windows.monthly?.usedPercent).toBe(75)
    })
  })
})
