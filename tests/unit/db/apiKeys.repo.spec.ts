import { describe, it, expect, beforeEach } from 'vitest'
import type { IApiKeyEntity } from '@/types/apikey'
import { ProviderType, KeyStatus } from '@/types/apikey'

/**
 * In-memory mock of utools.db
 */
const dbStore = new Map<string, any>()

beforeEach(() => {
  dbStore.clear()
  ;(window as any).utools = {
    db: {
      get(id: string) {
        return dbStore.get(id) ?? null
      },
      put(doc: any) {
        const existing = dbStore.get(doc._id)
        const rev = existing?._rev ?? '1-abc'
        const stored = { ...doc, _rev: rev }
        dbStore.set(doc._id, stored)
        return { ok: true, rev: stored._rev }
      },
      remove(id: string) {
        const existing = dbStore.get(id)
        if (!existing) return { ok: false, error: 'not_found' }
        dbStore.delete(id)
        return { ok: true, rev: existing._rev }
      },
      allDocs(prefix: string) {
        return Array.from(dbStore.values()).filter((doc) => doc._id?.startsWith(prefix))
      },
    },
  }
})

function seedKey(overrides: Partial<IApiKeyEntity> = {}): IApiKeyEntity {
  const doc: IApiKeyEntity = {
    _id: 'apikey/' + crypto.randomUUID(),
    type: 'apikey',
    provider: ProviderType.OPENAI,
    label: 'Test Key',
    encryptedKey: 'encrypted-value',
    keyPreview: 'sk-t...4567',
    baseUrl: null,
    models: ['gpt-4'],
    status: KeyStatus.ACTIVE,
    lastTestedAt: null,
    lastTestResult: null,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
  dbStore.set(doc._id, { ...doc })
  return doc
}

describe('apiKeys.repo', () => {
  describe('getAll', () => {
    it('returns empty array when no keys exist', async () => {
      const { getAll } = await import('@/db/apiKeys.repo')
      const result = getAll()
      expect(result).toEqual([])
    })

    it('returns all keys sorted by sortOrder', async () => {
      const { getAll } = await import('@/db/apiKeys.repo')
      seedKey({ sortOrder: 2, label: 'Key C' })
      seedKey({ sortOrder: 0, label: 'Key A' })
      seedKey({ sortOrder: 1, label: 'Key B' })

      const result = getAll()
      expect(result).toHaveLength(3)
      expect(result[0].label).toBe('Key A')
      expect(result[1].label).toBe('Key B')
      expect(result[2].label).toBe('Key C')
    })
  })

  describe('getById', () => {
    it('returns a key by id', async () => {
      const { getById } = await import('@/db/apiKeys.repo')
      const seeded = seedKey()

      const result = getById(seeded._id.replace('apikey/', ''))
      expect(result).not.toBeNull()
      expect(result!._id).toBe(seeded._id)
    })

    it('returns null for non-existent id', async () => {
      const { getById } = await import('@/db/apiKeys.repo')
      const result = getById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('add', () => {
    it('creates a new api key entity with encrypted key', async () => {
      const { add, getById } = await import('@/db/apiKeys.repo')

      const result = await add({
        key: 'sk-test-key-value-1234567890',
        provider: ProviderType.OPENAI,
        label: 'My API Key',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        status: KeyStatus.UNTESTED,
        lastTestedAt: null,
        lastTestResult: null,
        sortOrder: 0,
      })

      expect(result._id).toBeTruthy()
      expect(result._id).toMatch(/^apikey\//)
      expect(result.type).toBe('apikey')
      expect(result.label).toBe('My API Key')
      expect(result.provider).toBe(ProviderType.OPENAI)
      expect(result.encryptedKey).toBeTruthy()
      expect(result.encryptedKey).not.toBe('sk-test-key-value-1234567890')
      expect(result.keyPreview).toBeTruthy()
      expect(result.createdAt).toBeTruthy()
      expect(result.updatedAt).toBeTruthy()

      // Verify it was persisted
      const id = result._id.replace('apikey/', '')
      const fetched = getById(id)
      expect(fetched).not.toBeNull()
      expect(fetched!._id).toBe(result._id)
    })
  })

  describe('update', () => {
    it('updates fields on an existing key', async () => {
      const { update, getById } = await import('@/db/apiKeys.repo')
      const seeded = seedKey()
      const id = seeded._id.replace('apikey/', '')

      const updated = update(id, { label: 'Updated Label', baseUrl: 'https://example.com' })
      expect(updated).not.toBeNull()
      expect(updated!.label).toBe('Updated Label')
      expect(updated!.baseUrl).toBe('https://example.com')
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(seeded.updatedAt)

      // Verify persistence
      const fetched = getById(id)
      expect(fetched!.label).toBe('Updated Label')
    })

    it('returns null when key does not exist', async () => {
      const { update } = await import('@/db/apiKeys.repo')
      const result = update('non-existent', { label: 'Nope' })
      expect(result).toBeNull()
    })
  })

  describe('remove', () => {
    it('removes an existing key', async () => {
      const { remove, getById } = await import('@/db/apiKeys.repo')
      const seeded = seedKey()
      const id = seeded._id.replace('apikey/', '')

      expect(getById(id)).not.toBeNull()
      const result = remove(id)
      expect(result).toBe(true)
      expect(getById(id)).toBeNull()
    })

    it('returns false for non-existent key', async () => {
      const { remove } = await import('@/db/apiKeys.repo')
      const result = remove('non-existent')
      // removeDoc returns false when there's no matching doc
      expect(result).toBe(false)
    })
  })

  describe('search', () => {
    it('filters keys by label', async () => {
      const { search } = await import('@/db/apiKeys.repo')
      seedKey({ label: 'Production Key', provider: ProviderType.OPENAI })
      seedKey({ label: 'Development Key', provider: ProviderType.ANTHROPIC })
      seedKey({ label: 'Test', provider: ProviderType.DEEPSEEK })

      const results = search('production')
      expect(results).toHaveLength(1)
      expect(results[0].label).toBe('Production Key')
    })

    it('filters keys by provider', async () => {
      const { search } = await import('@/db/apiKeys.repo')
      seedKey({ label: 'Key A', provider: ProviderType.OPENAI })
      seedKey({ label: 'Key B', provider: ProviderType.ANTHROPIC })
      seedKey({ label: 'Key C', provider: ProviderType.DEEPSEEK })

      const results = search('anthropic')
      expect(results).toHaveLength(1)
      expect(results[0].provider).toBe(ProviderType.ANTHROPIC)
    })

    it('is case-insensitive', async () => {
      const { search } = await import('@/db/apiKeys.repo')
      seedKey({ label: 'My OpenAI Key', provider: ProviderType.OPENAI })

      const results = search('OPENAI')
      expect(results).toHaveLength(1)
    })

    it('returns empty array when no match', async () => {
      const { search } = await import('@/db/apiKeys.repo')
      seedKey({ label: 'Some Key', provider: ProviderType.OPENAI })

      const results = search('nonexistent')
      expect(results).toHaveLength(0)
    })
  })
})
