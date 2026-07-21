import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DeepSeekQuotaAdapter } from '@/services/quota-sources/deepseek'

describe('DeepSeekQuotaAdapter (Quota Source)', () => {
  let adapter: DeepSeekQuotaAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new DeepSeekQuotaAdapter()
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
        json: async () => ({
          balance_infos: [{ total_balance: 50.0 }],
        }),
      })

      const result = await adapter.checkQuota('sk-test')
      expect(result).not.toBeNull()
      expect(result!.monthly).not.toBeNull()
      expect(result!.monthly!.total).toBe(50.0)
      expect(result!.monthly!.used).toBe(0)
      expect(result!.monthly!.usedPercent).toBe(0)
      expect(result!.monthly!.unit).toBe('CNY')
      expect(result!.monthly!.resetsAt).toBeNull()
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      const result = await adapter.checkQuota('sk-invalid')
      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('sk-test')
      expect(result).toBeNull()
    })
  })
})
