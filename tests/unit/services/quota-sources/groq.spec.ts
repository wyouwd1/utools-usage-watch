import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GroqQuotaAdapter } from '@/services/quota-sources/groq'

describe('GroqQuotaAdapter (Quota Source)', () => {
  let adapter: GroqQuotaAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new GroqQuotaAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('checkQuota', () => {
    it('should parse usage response correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total_requests: 1000,
          remaining_requests: 750,
        }),
      })

      const result = await adapter.checkQuota('gsk_test')
      expect(result).not.toBeNull()
      expect(result!.weekly).not.toBeNull()
      expect(result!.weekly!.total).toBe(1000)
      expect(result!.weekly!.used).toBe(250)
      expect(result!.weekly!.usedPercent).toBe(25)
      expect(result!.weekly!.unit).toBe('requests')
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      const result = await adapter.checkQuota('gsk_test')
      expect(result).toBeNull()
    })

    it('should handle zero total gracefully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total_requests: 0,
          remaining_requests: 0,
        }),
      })

      const result = await adapter.checkQuota('gsk_test')
      expect(result).not.toBeNull()
      expect(result!.weekly!.usedPercent).toBe(0)
      expect(result!.weekly!.total).toBe(0)
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('gsk_test')
      expect(result).toBeNull()
    })
  })
})
