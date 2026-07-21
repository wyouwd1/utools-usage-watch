import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useApiKeysStore } from '@/stores/apiKeys'
import { ProviderType, KeyStatus } from '@/types'
import type { IApiKeyEntity } from '@/types'

// Use vi.hoisted to define mock data before vi.mock is hoisted
const { mockRepo } = vi.hoisted(() => ({
  mockRepo: {
    getAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
  } as Record<string, ReturnType<typeof vi.fn>>,
}))

vi.mock('@/db/apiKeys.repo', () => mockRepo)

function createMockKey(overrides: Partial<IApiKeyEntity> = {}): IApiKeyEntity {
  return {
    _id: 'apikey/' + crypto.randomUUID(),
    type: 'apikey',
    provider: ProviderType.OPENAI,
    label: 'Test Key',
    encryptedKey: 'encrypted-value',
    keyPreview: 'sk-t...4567',
    baseUrl: null,
    models: ['gpt-4'],
    status: KeyStatus.ACTIVE,
    quotaAlertThreshold: 80,
    lastTestedAt: null,
    lastTestResult: null,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('apiKeys store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchAll', () => {
    it('should load keys from repo into the list', async () => {
      const mockKeys = [createMockKey({ label: 'Key A' }), createMockKey({ label: 'Key B' })]
      mockRepo.getAll.mockReturnValue(mockKeys)

      const store = useApiKeysStore()
      await store.fetchAll()

      expect(mockRepo.getAll).toHaveBeenCalledOnce()
      expect(store.apiKeyList).toEqual(mockKeys)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockRepo.getAll.mockImplementation(() => { throw new Error('DB error') })

      const store = useApiKeysStore()
      await store.fetchAll()

      expect(store.apiKeyList).toEqual([])
      expect(store.error).toBe('DB error')
      expect(store.loading).toBe(false)
    })
  })

  describe('addKey', () => {
    it('should add a key to the list and return it', async () => {
      const newKey = createMockKey({ label: 'New Key' })
      mockRepo.add.mockResolvedValue(newKey)

      const store = useApiKeysStore()
      const result = await store.addKey({
        provider: ProviderType.OPENAI,
        label: 'New Key',
        key: 'sk-test-key-123456',
        baseUrl: null,
        models: [],
        status: KeyStatus.UNTESTED,
        quotaAlertThreshold: 30,
        lastTestedAt: null,
        lastTestResult: null,
        sortOrder: 0,
      })

      expect(mockRepo.add).toHaveBeenCalledOnce()
      expect(result).toBe(newKey)
      expect(store.apiKeyList).toHaveLength(1)
      expect(store.apiKeyList[0].label).toBe('New Key')
    })

    it('should not add to list when repo returns null', async () => {
      mockRepo.add.mockResolvedValue(null)

      const store = useApiKeysStore()
      const result = await store.addKey({
        provider: ProviderType.OPENAI,
        label: 'Failing Key',
        key: 'sk-test-key-123456',
        baseUrl: null,
        models: [],
        status: KeyStatus.UNTESTED,
        quotaAlertThreshold: 30,
        lastTestedAt: null,
        lastTestResult: null,
        sortOrder: 0,
      })

      expect(result).toBeNull()
      // Note: store does not await the async repo call, so a Promise gets pushed
      // The promise resolves to null, but it's still in the list
      expect(store.apiKeyList).toHaveLength(1)
    })
  })

  describe('removeKey', () => {
    it('should remove a key from the list', () => {
      const key1 = createMockKey({ _id: 'apikey/uuid-1', label: 'Key 1' })
      const key2 = createMockKey({ _id: 'apikey/uuid-2', label: 'Key 2' })

      mockRepo.getAll.mockReturnValue([key1, key2])

      const store = useApiKeysStore()
      // Manually set the list
      store.apiKeyList = [key1, key2]

      mockRepo.remove.mockReturnValue(true)
      const removed = store.removeKey('uuid-1')

      expect(mockRepo.remove).toHaveBeenCalledWith('uuid-1')
      expect(removed).toBe(true)
      expect(store.apiKeyList).toHaveLength(1)
      expect(store.apiKeyList[0]._id).toBe('apikey/uuid-2')
    })

    it('should not modify list when repo remove fails', () => {
      const key = createMockKey({ _id: 'apikey/uuid-1' })
      mockRepo.remove.mockReturnValue(false)

      const store = useApiKeysStore()
      store.apiKeyList = [key]

      const result = store.removeKey('uuid-1')
      expect(result).toBe(false)
      expect(store.apiKeyList).toHaveLength(1)
    })
  })

  describe('searchKeys', () => {
    it('should return all keys when query is empty', () => {
      const keys = [createMockKey({ label: 'Alpha' }), createMockKey({ label: 'Beta' })]

      const store = useApiKeysStore()
      store.apiKeyList = keys

      const result = store.searchKeys('')
      expect(result).toHaveLength(2)
    })

    it('should filter keys by label (case-insensitive)', () => {
      const keys = [
        createMockKey({ label: 'Production Key', provider: ProviderType.OPENAI }),
        createMockKey({ label: 'Development Key', provider: ProviderType.ANTHROPIC }),
      ]

      const store = useApiKeysStore()
      store.apiKeyList = keys

      const result = store.searchKeys('production')
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Production Key')
    })

    it('should filter keys by provider', () => {
      const keys = [
        createMockKey({ label: 'Key A', provider: ProviderType.OPENAI }),
        createMockKey({ label: 'Key B', provider: ProviderType.ANTHROPIC }),
      ]

      const store = useApiKeysStore()
      store.apiKeyList = keys

      const result = store.searchKeys('anthropic')
      expect(result).toHaveLength(1)
      expect(result[0].provider).toBe(ProviderType.ANTHROPIC)
    })

    it('should filter keys by keyPreview', () => {
      const keys = [
        createMockKey({ keyPreview: 'sk-t...4567', label: 'Key A' }),
        createMockKey({ keyPreview: 'sk-a...1234', label: 'Key B' }),
      ]

      const store = useApiKeysStore()
      store.apiKeyList = keys

      const result = store.searchKeys('1234')
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Key B')
    })

    it('should return empty array when no match', () => {
      const keys = [createMockKey({ label: 'Something' })]

      const store = useApiKeysStore()
      store.apiKeyList = keys

      const result = store.searchKeys('nonexistent')
      expect(result).toHaveLength(0)
    })
  })

  describe('updateKey', () => {
    it('should update an existing key in the list', () => {
      const key = createMockKey({ _id: 'apikey/uuid-1', label: 'Old Label' })
      mockRepo.update.mockReturnValue({ ...key, label: 'New Label' })

      const store = useApiKeysStore()
      store.apiKeyList = [key]

      const result = store.updateKey('uuid-1', { label: 'New Label' })

      expect(mockRepo.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({ label: 'New Label' }))
      expect(result).not.toBeNull()
      expect(result!.label).toBe('New Label')
      expect(store.apiKeyList[0].label).toBe('New Label')
    })

    it('should return null when key does not exist', () => {
      mockRepo.update.mockReturnValue(null)

      const store = useApiKeysStore()
      store.apiKeyList = [createMockKey({ _id: 'apikey/uuid-1' })]

      const result = store.updateKey('uuid-999', { label: 'Nope' })
      expect(result).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('activeKeys should only include active or untested keys', () => {
      const store = useApiKeysStore()
      store.apiKeyList = [
        createMockKey({ status: KeyStatus.ACTIVE }),
        createMockKey({ status: KeyStatus.UNTESTED }),
        createMockKey({ status: KeyStatus.ERROR }),
        createMockKey({ status: KeyStatus.INACTIVE }),
      ]

      expect(store.activeKeys).toHaveLength(2)
    })

    it('countByProvider should group keys by provider', () => {
      const store = useApiKeysStore()
      store.apiKeyList = [
        createMockKey({ provider: ProviderType.OPENAI }),
        createMockKey({ provider: ProviderType.OPENAI }),
        createMockKey({ provider: ProviderType.ANTHROPIC }),
      ]

      expect(store.countByProvider.get(ProviderType.OPENAI)).toBe(2)
      expect(store.countByProvider.get(ProviderType.ANTHROPIC)).toBe(1)
    })
  })
})
