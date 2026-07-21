import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { testApiKey, batchTestKeys } from '@/services/key-tester'
import { adapterRegistry } from '@/services/providers/registry'
import { OpenAIAdapter } from '@/services/providers/openai'
import { ProviderType } from '@/types'

describe('key-tester', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    // Register the OpenAI adapter for testing
    adapterRegistry.register(new OpenAIAdapter())
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('testApiKey', () => {
    it('should test a single API key successfully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const apiKey = {
        _id: 'key1',
        provider: ProviderType.OPENAI,
        encryptedKey: 'sk-test',
        baseUrl: null,
      } as any

      const result = await testApiKey(apiKey)
      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(200)
    })

    it('should return error for unsupported provider', async () => {
      const apiKey = {
        _id: 'key2',
        provider: 'unknown' as ProviderType,
        encryptedKey: 'sk-test',
        baseUrl: null,
      } as any

      const result = await testApiKey(apiKey)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported provider')
    })
  })

  describe('batchTestKeys', () => {
    it('should test multiple keys and return a Map of results', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const keys = [
        { _id: 'key1', provider: ProviderType.OPENAI, encryptedKey: 'sk-test-1', baseUrl: null } as any,
        { _id: 'key2', provider: ProviderType.OPENAI, encryptedKey: 'sk-test-2', baseUrl: null } as any,
      ]

      const results = await batchTestKeys(keys)
      expect(results.size).toBe(2)
      expect(results.get('key1')?.success).toBe(true)
      expect(results.get('key2')?.success).toBe(true)
    })

    it('should handle mixed success and failure gracefully', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockRejectedValueOnce(new Error('Network Error'))

      const keys = [
        { _id: 'key1', provider: ProviderType.OPENAI, encryptedKey: 'sk-test-1', baseUrl: null } as any,
        { _id: 'key2', provider: ProviderType.OPENAI, encryptedKey: 'sk-test-2', baseUrl: null } as any,
      ]

      const results = await batchTestKeys(keys)
      expect(results.size).toBe(2)
      expect(results.get('key1')?.success).toBe(true)
      expect(results.get('key2')?.success).toBe(false)
    })
  })
})
