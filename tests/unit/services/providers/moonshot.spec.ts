import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MoonshotAdapter } from '@/services/providers/moonshot'

describe('MoonshotAdapter', () => {
  let adapter: MoonshotAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new MoonshotAdapter()
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
    it('should parse balance response correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 100.0 }),
      })

      const result = await adapter.checkQuota('sk-test')
      expect(result).not.toBeNull()
      expect(result!.monthly?.total).toBe(100.0)
      expect(result!.monthly?.unit).toBe('CNY')
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
