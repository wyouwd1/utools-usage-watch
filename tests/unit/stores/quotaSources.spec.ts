import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { QuotaSourceType } from '@/types'

// Mock the repo module
vi.mock('@/db/quotaSources.repo', () => ({
  getAll: vi.fn(() => []),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(() => true),
}))

describe('quotaSources store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function addSourceToStore(
    store: ReturnType<typeof useQuotaSourcesStore>,
    id: string,
    overrides: Partial<{
      lastCheckSucceeded: boolean | undefined
      credentialExpiredAt: number | undefined
      lastError: string | undefined
    }> = {},
  ) {
    store.sourceList.push({
      _id: `quota-source/${id}`,
      _rev: undefined,
      type: 'quota-source',
      sourceType: QuotaSourceType.OPENCODE_GO,
      label: `Source ${id}`,
      encryptedCredential: 'mock-credential',
      credentialHint: 'mock-...cred',
      baseUrl: undefined,
      config: undefined,
      enabled: true,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    })
  }

  describe('markCheckResult', () => {
    it('should set lastCheckSucceeded=true and clear expiry on success', () => {
      const store = useQuotaSourcesStore()
      addSourceToStore(store, 'src-1', {
        lastCheckSucceeded: false,
        credentialExpiredAt: 1000,
        lastError: 'old error',
      })

      store.markCheckResult('src-1', true)

      const source = store.sourceList[0]
      expect(source.lastCheckSucceeded).toBe(true)
      expect(source.credentialExpiredAt).toBeUndefined()
      expect(source.lastError).toBeUndefined()
    })

    it('should set credentialExpiredAt on failure with error message', () => {
      const store = useQuotaSourcesStore()
      addSourceToStore(store, 'src-1')

      const before = Date.now()
      store.markCheckResult('src-1', false, '401 Unauthorized')

      const source = store.sourceList[0]
      expect(source.lastCheckSucceeded).toBe(false)
      expect(source.credentialExpiredAt).toBeGreaterThanOrEqual(before)
      expect(source.lastError).toBe('401 Unauthorized')
    })

    it('should do nothing for non-existent source', () => {
      const store = useQuotaSourcesStore()

      // Should not throw
      expect(() => store.markCheckResult('nonexistent', true)).not.toThrow()
      expect(() => store.markCheckResult('nonexistent', false)).not.toThrow()
    })
  })

  describe('expiredSources', () => {
    it('should return sources where lastCheckSucceeded is false', () => {
      const store = useQuotaSourcesStore()
      addSourceToStore(store, 'src-1', { lastCheckSucceeded: true })
      addSourceToStore(store, 'src-2', { lastCheckSucceeded: false })
      addSourceToStore(store, 'src-3', { lastCheckSucceeded: false })
      addSourceToStore(store, 'src-4') // undefined

      expect(store.expiredSources).toHaveLength(2)
      expect(store.expiredSources.map((s) => s._id)).toEqual([
        'quota-source/src-2',
        'quota-source/src-3',
      ])
    })

    it('should return empty array when no sources are expired', () => {
      const store = useQuotaSourcesStore()
      addSourceToStore(store, 'src-1', { lastCheckSucceeded: true })
      addSourceToStore(store, 'src-2', { lastCheckSucceeded: true })

      expect(store.expiredSources).toHaveLength(0)
    })
  })
})
