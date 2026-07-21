import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { checkSingleKey, refreshAll, forceRefreshKey } from '@/services/quota-checker'
import { adapterRegistry } from '@/services/providers/registry'
import { useApiKeysStore } from '@/stores/apiKeys'
import { useQuotasStore } from '@/stores/quotas'
import { ProviderType, type IProviderAdapter, type IQuotaWindows } from '@/types'

// Mock adapter implementing IProviderAdapter
class MockQuotaAdapter implements IProviderAdapter {
  readonly type = ProviderType.OPENAI
  readonly info = {
    type: ProviderType.OPENAI,
    label: 'Mock AI',
    labelEn: 'Mock AI',
    defaultBaseUrl: 'https://api.mock.ai',
    hasQuota: true,
    icon: '🧪',
  }

  checkQuotaImpl = vi.fn<[], Promise<IQuotaWindows | null>>()

  async testConnection() {
    return { success: true, statusCode: 200, latencyMs: 100 }
  }

  async checkQuota(_apiKey: string, _baseUrl?: string) {
    return this.checkQuotaImpl()
  }
}

class MockNoQuotaAdapter implements IProviderAdapter {
  readonly type = ProviderType.OLLAMA
  readonly info = {
    type: ProviderType.OLLAMA,
    label: 'Mock Local',
    labelEn: 'Mock Local',
    defaultBaseUrl: 'http://127.0.0.1:11434',
    hasQuota: false,
    icon: '🦙',
  }

  async testConnection() {
    return { success: true, statusCode: 200, latencyMs: 50 }
  }

  async checkQuota() {
    return null
  }
}

describe('quota-checker', () => {
  let adapter: MockQuotaAdapter
  let noQuotaAdapter: MockNoQuotaAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    adapter = new MockQuotaAdapter()
    noQuotaAdapter = new MockNoQuotaAdapter()
    adapterRegistry.register(adapter)
    adapterRegistry.register(noQuotaAdapter)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setupStore(keys: Array<{ id: string; provider: ProviderType }>) {
    const apiKeysStore = useApiKeysStore()
    for (const k of keys) {
      apiKeysStore.apiKeyList.push({
        _id: `apikey/${k.id}`,
        type: 'apikey',
        provider: k.provider,
        label: `Key ${k.id}`,
        encryptedKey: 'sk-mock',
        keyPreview: `sk-...${k.id.slice(-4)}`,
        baseUrl: null,
        models: [],
        status: 'active' as any,
        quotaAlertThreshold: 80,
        lastTestedAt: null,
        lastTestResult: null,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  }

  describe('checkSingleKey', () => {
    it('should fetch quota and update the store', async () => {
      setupStore([{ id: 'key-1', provider: ProviderType.OPENAI }])
      const quotasStore = useQuotasStore()

      adapter.checkQuotaImpl.mockResolvedValue({
        monthly: { usedPercent: 45, resetsAt: null, used: 45, total: 100, unit: 'USD' },
      })

      await checkSingleKey('key-1')

      const entry = quotasStore.quotaMap['key-1']
      expect(entry).toBeDefined()
      expect(entry!.windows.monthly?.usedPercent).toBe(45)
      expect(entry!.loading).toBe(false)
      expect(entry!.fetchedAt).toBeGreaterThan(0)
    })

    it('should skip if fresh cache exists', async () => {
      setupStore([{ id: 'key-1', provider: ProviderType.OPENAI }])
      const quotasStore = useQuotasStore()

      // Pre-populate cache
      quotasStore.updateQuota('key-1', {
        monthly: { usedPercent: 10, resetsAt: null, used: 10, total: 100, unit: 'USD' },
      })

      adapter.checkQuotaImpl.mockResolvedValue({
        monthly: { usedPercent: 90, resetsAt: null, used: 90, total: 100, unit: 'USD' },
      })

      await checkSingleKey('key-1')

      // Should still have the old value (cache hit)
      expect(quotasStore.quotaMap['key-1']!.windows.monthly?.usedPercent).toBe(10)
    })

    it('should do nothing for keys with no adapter', async () => {
      setupStore([{ id: 'key-1', provider: 'unknown' as ProviderType }])
      const quotasStore = useQuotasStore()

      await checkSingleKey('key-1')
      expect(quotasStore.quotaMap['key-1']).toBeUndefined()
    })

    it('should do nothing for keys with hasQuota=false adapter', async () => {
      setupStore([{ id: 'key-1', provider: ProviderType.OLLAMA }])
      const quotasStore = useQuotasStore()

      await checkSingleKey('key-1')
      expect(quotasStore.quotaMap['key-1']).toBeUndefined()
    })

    it('should handle adapter throwing an error', async () => {
      setupStore([{ id: 'key-1', provider: ProviderType.OPENAI }])
      const quotasStore = useQuotasStore()

      adapter.checkQuotaImpl.mockRejectedValue(new Error('Network error'))

      await checkSingleKey('key-1')
      // Should not crash; loading should be false
      expect(quotasStore.quotaMap['key-1']?.loading).toBe(false)
    })

    it('should preserve stale cache on error', async () => {
      setupStore([{ id: 'key-1', provider: ProviderType.OPENAI }])
      const quotasStore = useQuotasStore()

      // First successful fetch
      adapter.checkQuotaImpl.mockResolvedValueOnce({
        monthly: { usedPercent: 30, resetsAt: null, used: 30, total: 100, unit: 'USD' },
      })
      await checkSingleKey('key-1')
      expect(quotasStore.quotaMap['key-1']!.windows.monthly?.usedPercent).toBe(30)

      // Second fetch fails
      adapter.checkQuotaImpl.mockRejectedValueOnce(new Error('Timeout'))
      // Simulate expired cache for second call to skip TTL
      quotasStore.quotaMap['key-1']!.fetchedAt = Date.now() - 10 * 60 * 1000

      await checkSingleKey('key-1')

      // Should still have the old stale data
      const entry = quotasStore.getStale('key-1')
      expect(entry).not.toBeNull()
      expect(entry!.windows.monthly?.usedPercent).toBe(30)
    })
  })

  describe('refreshAll', () => {
    it('should refresh all active keys with quota support', async () => {
      setupStore([
        { id: 'key-1', provider: ProviderType.OPENAI },
        { id: 'key-2', provider: ProviderType.OPENAI },
        { id: 'key-3', provider: ProviderType.OLLAMA }, // no quota
      ])
      const quotasStore = useQuotasStore()

      adapter.checkQuotaImpl.mockResolvedValue({
        monthly: { usedPercent: 50, resetsAt: null, used: 50, total: 100, unit: 'USD' },
      })

      await refreshAll()

      expect(quotasStore.quotaMap['key-1']).toBeDefined()
      expect(quotasStore.quotaMap['key-2']).toBeDefined()
      // key-3 has no quota adapter, should not be in the map
      expect(quotasStore.quotaMap['key-3']).toBeUndefined()
      expect(quotasStore.refreshing).toBe(false)
    })

    it('should handle mixed success gracefully', async () => {
      setupStore([
        { id: 'key-1', provider: ProviderType.OPENAI },
        { id: 'key-2', provider: ProviderType.OPENAI },
      ])
      const quotasStore = useQuotasStore()

      adapter.checkQuotaImpl
        .mockResolvedValueOnce({ monthly: { usedPercent: 20, resetsAt: null, used: 20, total: 100, unit: 'USD' } })
        .mockRejectedValueOnce(new Error('Server error'))

      await refreshAll()

      expect(quotasStore.quotaMap['key-1']?.windows.monthly?.usedPercent).toBe(20)
      // key-2 failed but loading should be cleared
      expect(quotasStore.quotaMap['key-2']?.loading).toBe(false)
    })
  })

  describe('forceRefreshKey', () => {
    it('should force refresh even if cache exists', async () => {
      setupStore([{ id: 'key-1', provider: ProviderType.OPENAI }])
      const quotasStore = useQuotasStore()

      // Pre-populate cache
      quotasStore.updateQuota('key-1', {
        monthly: { usedPercent: 10, resetsAt: null, used: 10, total: 100, unit: 'USD' },
      })

      adapter.checkQuotaImpl.mockResolvedValue({
        monthly: { usedPercent: 75, resetsAt: null, used: 75, total: 100, unit: 'USD' },
      })

      await forceRefreshKey('key-1')

      // Should have the new value
      expect(quotasStore.quotaMap['key-1']!.windows.monthly?.usedPercent).toBe(75)
    })
  })
})
