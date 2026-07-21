import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MoonshotQuotaAdapter } from '@/services/quota-sources/moonshot'

describe('MoonshotQuotaAdapter (Quota Source)', () => {
  let adapter: MoonshotQuotaAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new MoonshotQuotaAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('checkQuota', () => {
    it('should parse balance response correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 100.0 }),
      })

      const result = await adapter.checkQuota('sk-test')
      expect(result).not.toBeNull()
      expect(result!.monthly).not.toBeNull()
      expect(result!.monthly!.total).toBe(100.0)
      expect(result!.monthly!.used).toBe(0)
      expect(result!.monthly!.usedPercent).toBe(0)
      expect(result!.monthly!.unit).toBe('CNY')
      expect(result!.monthly!.resetsAt).toBeNull()
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      const result = await adapter.checkQuota('sk-test')
      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('sk-test')
      expect(result).toBeNull()
    })
  })
})
