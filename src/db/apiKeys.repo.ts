import { COLLECTION, docId, getByPrefix, putDoc, removeDoc } from './index'
import type { IApiKeyEntity } from '@/types/apikey'
import { KeyStatus } from '@/types/apikey'
import { encrypt } from '@/services/encrypt'

export function getAll(): IApiKeyEntity[] {
  const keys = getByPrefix<IApiKeyEntity>(COLLECTION.API_KEY)
  return keys.sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getById(id: string): IApiKeyEntity | null {
  const utools = (window as any).utools
  if (!utools?.db) return null
  return utools.db.get(docId(COLLECTION.API_KEY, id)) as IApiKeyEntity | null
}

export async function add(
  data: Omit<
    IApiKeyEntity,
    '_id' | '_rev' | 'type' | 'encryptedKey' | 'keyPreview' | 'createdAt' | 'updatedAt'
  > & { key: string },
): Promise<IApiKeyEntity> {
  const _id = docId(COLLECTION.API_KEY, crypto.randomUUID())
  const encryptedKey = await encrypt(data.key)
  const keyPreview =
    data.key.length > 8
      ? data.key.slice(0, 4) + '...' + data.key.slice(-4)
      : data.key.slice(0, 4) + '...'

  const doc: IApiKeyEntity = {
    _id,
    type: 'apikey',
    provider: data.provider,
    label: data.label,
    encryptedKey,
    keyPreview,
    baseUrl: data.baseUrl ?? null,
    models: data.models ?? [],
    status: data.status ?? KeyStatus.UNTESTED,
    lastTestedAt: data.lastTestedAt ?? null,
    lastTestResult: data.lastTestResult ?? null,
    sortOrder: data.sortOrder ?? 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  return putDoc(doc)
}

export function update(id: string, data: Partial<IApiKeyEntity>): IApiKeyEntity | null {
  const existing = getById(id)
  if (!existing) return null

  const updated: IApiKeyEntity = {
    ...existing,
    ...data,
    _id: existing._id,
    updatedAt: Date.now(),
  }

  return putDoc(updated)
}

export function remove(id: string): boolean {
  return removeDoc(docId(COLLECTION.API_KEY, id))
}

export function search(query: string): IApiKeyEntity[] {
  const all = getAll()
  const lower = query.toLowerCase()
  return all.filter(
    (k) => k.label.toLowerCase().includes(lower) || k.provider.toLowerCase().includes(lower),
  )
}

/**
 * Import a pre-built API key entity directly (used for data import/restore).
 * The document must have a valid _id (created via docId + UUID).
 */
export function importEntity(doc: IApiKeyEntity): IApiKeyEntity {
  return putDoc(doc)
}

/**
 * Delete all API keys from the database (used before importing a full backup).
 */
export function clearAll(): void {
  const all = getAll()
  for (const key of all) {
    removeDoc(key._id)
  }
}
