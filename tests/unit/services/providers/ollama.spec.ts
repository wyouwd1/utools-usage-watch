import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OllamaAdapter } from '@/services/providers/ollama'

describe('OllamaAdapter', () => {
  let adapter: OllamaAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new OllamaAdapter()
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

      const result = await adapter.testConnection('')
      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(200)
    })

    it('should return error on network failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'))

      const result = await adapter.testConnection('')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection refused')
    })
  })

  describe('checkQuota', () => {
    it('should return null (no quota concept)', async () => {
      const result = await adapter.checkQuota('')
      expect(result).toBeNull()
    })
  })

  describe('fetchModels', () => {
    it('should parse model names from API response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama3:latest' },
            { name: 'mistral:7b' },
          ],
        }),
      })

      const result = await adapter.fetchModels('')
      expect(result).toEqual(['llama3:latest', 'mistral:7b'])
    })

    it('should return null when API call fails', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.fetchModels('')
      expect(result).toBeNull()
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      const result = await adapter.fetchModels('')
      expect(result).toBeNull()
    })
  })
})
