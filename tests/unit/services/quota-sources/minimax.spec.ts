import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MiniMaxQuotaAdapter } from '@/services/quota-sources/minimax'

describe('MiniMaxQuotaAdapter (Quota Source)', () => {
  let adapter: MiniMaxQuotaAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new MiniMaxQuotaAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('checkQuota', () => {
    const MOCK_REMAINS = [
      {
        current_interval_status: 1,
        current_interval_remaining_percent: 70,
        remains_time: 7200000,
        current_weekly_remaining_percent: 50,
        weekly_remains_time: 604800000,
      },
    ]

    it('should parse quota response correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model_remains: MOCK_REMAINS,
        }),
      })

      const result = await adapter.checkQuota('sk-test')
      expect(result).not.toBeNull()
      expect(result!.rolling).not.toBeNull()
      expect(result!.weekly).not.toBeNull()

      // rolling: 100 - 70 = 30%
      expect(result!.rolling!.usedPercent).toBe(30)
      expect(result!.rolling!.resetsAt).toBeGreaterThan(Date.now())
      expect(result!.rolling!.unit).toBe('%')

      // weekly: 100 - 50 = 50%
      expect(result!.weekly!.usedPercent).toBe(50)
      expect(result!.weekly!.resetsAt).toBeGreaterThan(Date.now())
      expect(result!.weekly!.unit).toBe('%')
    })

    it('should use first element when no active plan found', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model_remains: [
            {
              current_interval_status: 0,
              current_interval_remaining_percent: 90,
              remains_time: 3600000,
              current_weekly_remaining_percent: 80,
              weekly_remains_time: 604800000,
            },
          ],
        }),
      })

      const result = await adapter.checkQuota('sk-test')
      expect(result).not.toBeNull()
      expect(result!.rolling!.usedPercent).toBe(10) // 100 - 90
      expect(result!.weekly!.usedPercent).toBe(20) // 100 - 80
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      const result = await adapter.checkQuota('sk-test')
      expect(result).toBeNull()
    })

    it('should return null when no model_remains', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ model_remains: [] }),
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
