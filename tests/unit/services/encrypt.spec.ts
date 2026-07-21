import { describe, it, expect, beforeEach } from 'vitest'

/**
 * In-memory mock of utools.db that persists across dynamic imports
 * of settings.repo inside encrypt.ts.
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
        dbStore.delete(id)
        return { ok: true }
      },
      allDocs(prefix: string) {
        return Array.from(dbStore.values()).filter((doc) => doc._id?.startsWith(prefix))
      },
    },
  }
})

describe('encrypt / decrypt', () => {
  it('encrypts and decrypts a string correctly (roundtrip)', async () => {
    const { encrypt, decrypt } = await import('@/services/encrypt')

    const plaintext = 'sk-test-api-key-123456789'
    const encrypted = await encrypt(plaintext)
    expect(encrypted).toBeTruthy()
    expect(typeof encrypted).toBe('string')

    const decrypted = await decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertext each time for the same plaintext (random IV)', async () => {
    const { encrypt, decrypt } = await import('@/services/encrypt')

    const plaintext = 'sk-test-api-key-123456789'

    // Override the mock so the key is already stored (prevents re-generation)
    // The first encrypt call already stored a key in dbStore via settings.repo.set
    const result1 = await encrypt(plaintext)
    const result2 = await encrypt(plaintext)

    expect(result1).not.toBe(result2)

    // Both should still decrypt to the original
    expect(await decrypt(result1)).toBe(plaintext)
    expect(await decrypt(result2)).toBe(plaintext)
  })

  it('handles empty string', async () => {
    const { encrypt, decrypt } = await import('@/services/encrypt')

    const encrypted = await encrypt('')
    const decrypted = await decrypt(encrypted)
    expect(decrypted).toBe('')
  })

  it('handles special characters', async () => {
    const { encrypt, decrypt } = await import('@/services/encrypt')

    const special = '!@#$%^&*()_+={}[]|\\:;"\'<>,.?/~`\n\t'
    const encrypted = await encrypt(special)
    const decrypted = await decrypt(encrypted)
    expect(decrypted).toBe(special)
  })
})
