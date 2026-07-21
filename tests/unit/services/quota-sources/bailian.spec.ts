import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BailianAdapter } from '@/services/quota-sources/bailian'

describe('BailianAdapter', () => {
  let adapter: BailianAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new BailianAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('checkQuota', () => {
    const MOCK_QUOTA_INFO = {
      per5HourUsedQuota: 3000,
      per5HourTotalQuota: 10000,
      per5HourQuotaNextRefreshTime: 1700000000000,
      perWeekUsedQuota: 8000,
      perWeekTotalQuota: 50000,
      perWeekQuotaNextRefreshTime: 1700000000000,
      perBillMonthUsedQuota: 25000,
      perBillMonthTotalQuota: 200000,
      perBillMonthQuotaNextRefreshTime: 1700000000000,
    }

    const MOCK_RESPONSE = {
      code: '200',
      data: {
        DataV2: {
          data: {
            data: {
              codingPlanInstanceInfos: [
                {
                  codingPlanQuotaInfo: MOCK_QUOTA_INFO,
                },
              ],
            },
          },
        },
      },
    }

    it('should parse quota response correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_RESPONSE,
      })

      const result = await adapter.checkQuota('test-cookie', {
        sec_token: 'test-token',
        region: 'cn-beijing',
      })
      expect(result).not.toBeNull()
      expect(result!.rolling).not.toBeNull()
      expect(result!.weekly).not.toBeNull()
      expect(result!.monthly).not.toBeNull()

      // rolling (5-hour): 3000/10000 = 30%
      expect(result!.rolling!.usedPercent).toBe(30)
      expect(result!.rolling!.used).toBe(3000)
      expect(result!.rolling!.total).toBe(10000)

      // weekly: 8000/50000 = 16%
      expect(result!.weekly!.usedPercent).toBe(16)
      expect(result!.weekly!.used).toBe(8000)
      expect(result!.weekly!.total).toBe(50000)

      // monthly: 25000/200000 = 13% (12.5 rounded)
      expect(result!.monthly!.usedPercent).toBe(13)
      expect(result!.monthly!.used).toBe(25000)
      expect(result!.monthly!.total).toBe(200000)

      expect(result!.rolling!.unit).toBe('tokens')
      expect(result!.rolling!.resetsAt).toBe(1700000000000)
    })

    it('should return null when cookie or sec_token is missing', async () => {
      const result = await adapter.checkQuota('', {})
      expect(result).toBeNull()
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      const result = await adapter.checkQuota('test-cookie', {
        sec_token: 'test-token',
      })
      expect(result).toBeNull()
    })

    it('should return null when API returns error code', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: '400', message: 'Bad Request' }),
      })

      const result = await adapter.checkQuota('test-cookie', {
        sec_token: 'test-token',
      })
      expect(result).toBeNull()
    })

    it('should return null when no instances found', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '200',
          data: {
            DataV2: {
              data: {
                data: {
                  codingPlanInstanceInfos: [],
                },
              },
            },
          },
        }),
      })

      const result = await adapter.checkQuota('test-cookie', {
        sec_token: 'test-token',
      })
      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('test-cookie', {
        sec_token: 'test-token',
      })
      expect(result).toBeNull()
    })
  })
})
