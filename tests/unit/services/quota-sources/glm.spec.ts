import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GlmQuotaAdapter } from '@/services/quota-sources/glm'

describe('GlmQuotaAdapter (Quota Source)', () => {
  let adapter: GlmQuotaAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new GlmQuotaAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('checkQuota', () => {
    it('should parse account report response correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 0,
          data: { totalBalance: 500.0 },
        }),
      })

      const result = await adapter.checkQuota('glm-test')
      expect(result).not.toBeNull()
      expect(result!.monthly).not.toBeNull()
      expect(result!.monthly!.total).toBe(500.0)
      expect(result!.monthly!.used).toBe(0)
      expect(result!.monthly!.usedPercent).toBe(0)
      expect(result!.monthly!.unit).toBe('CNY')
      expect(result!.monthly!.resetsAt).toBeNull()
    })

    it('should handle flat response without nested data', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          totalBalance: 300.0,
        }),
      })

      const result = await adapter.checkQuota('glm-test')
      expect(result).not.toBeNull()
      expect(result!.monthly!.total).toBe(300.0)
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      const result = await adapter.checkQuota('glm-test')
      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('glm-test')
      expect(result).toBeNull()
    })
  })
})
