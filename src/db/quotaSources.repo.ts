import { COLLECTION, docId, getByPrefix, putDoc, removeDoc, getDoc } from './index'
import type { IQuotaSourceEntity, QuotaSourceType } from '@/types/quota'
import { encrypt } from '@/services/encrypt'

export function getAll(): IQuotaSourceEntity[] {
  const sources = getByPrefix<IQuotaSourceEntity>(COLLECTION.QUOTA_SOURCE)
  return sources.sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getById(id: string): IQuotaSourceEntity | null {
  return getDoc<IQuotaSourceEntity>(docId(COLLECTION.QUOTA_SOURCE, id))
}

export async function add(
  data: Omit<
    IQuotaSourceEntity,
    '_id' | '_rev' | 'type' | 'encryptedCredential' | 'credentialHint' | 'createdAt' | 'updatedAt'
  > & { credential: string },
): Promise<IQuotaSourceEntity> {
  const _id = docId(COLLECTION.QUOTA_SOURCE, crypto.randomUUID())
  const encryptedCredential = await encrypt(data.credential)
  const credentialHint =
    data.credential.length > 4
      ? data.credential.slice(0, 4) + '****'
      : data.credential.slice(0, 4) + '****'

  const doc: IQuotaSourceEntity = {
    _id,
    type: 'quota-source',
    sourceType: data.sourceType,
    label: data.label,
    encryptedCredential,
    credentialHint,
    curlRaw: data.curlRaw ?? undefined,
    baseUrl: data.baseUrl ?? undefined,
    config: data.config ?? undefined,
    enabled: data.enabled ?? true,
    sortOrder: data.sortOrder ?? 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  return putDoc(doc)
}

export async function update(
  id: string,
  data: Partial<IQuotaSourceEntity> & { credential?: string },
): Promise<IQuotaSourceEntity | null> {
  const existing = getById(id)
  if (!existing) return null

  const updated: IQuotaSourceEntity = {
    ...existing,
    ...data,
    _id: existing._id,
    updatedAt: Date.now(),
  }

  // Re-encrypt if credential is provided (changed)
  if (data.credential) {
    const encryptedCredential = await encrypt(data.credential)
    const credentialHint =
      data.credential.length > 4
        ? data.credential.slice(0, 4) + '****'
        : data.credential.slice(0, 4) + '****'
    updated.encryptedCredential = encryptedCredential
    updated.credentialHint = credentialHint
  }

  return putDoc(updated)
}

export function remove(id: string): boolean {
  return removeDoc(docId(COLLECTION.QUOTA_SOURCE, id))
}

export function search(query: string): IQuotaSourceEntity[] {
  const all = getAll()
  const lower = query.toLowerCase()
  return all.filter(
    (s) =>
      s.label.toLowerCase().includes(lower) ||
      s.sourceType.toLowerCase().includes(lower),
  )
}

/**
 * Import a pre-built quota source entity directly (used for data import/restore).
 */
export function importEntity(doc: IQuotaSourceEntity): IQuotaSourceEntity {
  return putDoc(doc)
}

/**
 * Delete all quota sources from the database (used before importing a full backup).
 */
export function clearAll(): void {
  const all = getAll()
  for (const source of all) {
    removeDoc(source._id)
  }
}
