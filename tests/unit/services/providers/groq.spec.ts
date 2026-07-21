import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GroqAdapter } from '@/services/providers/groq'

describe('GroqAdapter', () => {
  let adapter: GroqAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new GroqAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('testConnection', () => {
    it('should return success when API responds 200', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const result = await adapter.testConnection('gsk_test')
      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(200)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('should return error when API responds 401', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      const result = await adapter.testConnection('gsk_invalid')
      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(401)
    })

    it('should return error on network failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.testConnection('gsk_test')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network Error')
    })
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
      expect(result!.monthly?.total).toBe(1000)
      expect(result!.monthly?.used).toBe(250)
      expect(result!.monthly?.usedPercent).toBe(25)
      expect(result!.monthly?.unit).toBe('requests')
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      const result = await adapter.checkQuota('gsk_test')
      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('gsk_test')
      expect(result).toBeNull()
    })
  })
})
