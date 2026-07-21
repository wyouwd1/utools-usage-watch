import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DeepSeekAdapter } from '@/services/providers/deepseek'

describe('DeepSeekAdapter', () => {
  let adapter: DeepSeekAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new DeepSeekAdapter()
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
    it('should parse balance response correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          balance_infos: [{ total_balance: 50.0 }],
        }),
      })

      const result = await adapter.checkQuota('sk-test')
      expect(result).not.toBeNull()
      expect(result!.monthly?.total).toBe(50.0)
      expect(result!.monthly?.unit).toBe('USD')
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('sk-test')
      expect(result).toBeNull()
    })
  })
})
