import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIAdapter } from '@/services/providers/openai'

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new OpenAIAdapter()
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

      const result = await adapter.testConnection('sk-test')
      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(200)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('should return error when API responds 401', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      const result = await adapter.testConnection('sk-invalid')
      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(401)
    })

    it('should return error on network failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.testConnection('sk-test')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network Error')
    })
  })

  describe('checkQuota', () => {
    it('should parse billing response correctly', async () => {
      globalThis.fetch = vi.fn()
        // First call: usage endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ total_usage: 25.5 }),
        })
        // Second call: subscriptions endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hard_limit_usd: 100 }),
        })

      const result = await adapter.checkQuota('sk-test')
      expect(result).not.toBeNull()
      expect(result!.monthly?.used).toBe(25.5)
      expect(result!.monthly?.total).toBe(100)
      expect(result!.monthly?.usedPercent).toBe(26) // Math.round(25.5 / 100 * 100)
      expect(result!.monthly?.unit).toBe('USD')
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('sk-test')
      expect(result).toBeNull()
    })
  })
})
