export const COLLECTION = {
  API_KEY: 'apikey/',
  SETTING: 'setting/',
  QUOTA_SOURCE: 'quota-source/',
}

// In-memory fallback for H5 preview (when utools.db is not available)
const memStore = new Map<string, any>()

// Expose for H5 debugging
if (typeof window !== 'undefined') {
  ;(window as any).__memDb = memStore
}

function getDb(): { db: any; isMemory: boolean } {
  const utools = (window as any).utools
  if (utools?.db) return { db: utools.db, isMemory: false }
  return { db: memStore, isMemory: true }
}

export function docId(collection: string, ...parts: string[]): string {
  return collection + parts.join('/')
}

export function getByPrefix<T>(prefix: string): T[] {
  const { db, isMemory } = getDb()
  if (isMemory) {
    const results: T[] = []
    for (const [key, val] of memStore) {
      if (key.startsWith(prefix)) results.push(val as T)
    }
    return results
  }
  return (db.allDocs(prefix) as T[]) ?? []
}

export function putDoc<T extends { _id: string }>(doc: T): T {
  const { db, isMemory } = getDb()
  if (isMemory) {
    const existing = memStore.get(doc._id) as T | null
    if (existing && (existing as any)._rev) {
      ;(doc as any)._rev = (existing as any)._rev
    }
    const revNum = existing ? parseInt((existing as any)._rev?.split('-')[0] || '1') + 1 : 1
    ;(doc as any)._rev = `${revNum}-${Date.now().toString(36)}`
    memStore.set(doc._id, { ...doc })
    return doc
  }
  const existing = db.get(doc._id) as T | null
  if (existing) {
    ;(doc as any)._rev = (existing as any)._rev
  }
  const result = db.put(doc)
  if (result?.ok) {
    ;(doc as any)._rev = result.rev
  }
  return doc
}

export function removeDoc(_id: string): boolean {
  const { db, isMemory } = getDb()
  if (isMemory) {
    return memStore.delete(_id)
  }
  const result = db.remove(_id)
  return result?.ok ?? false
}

export function getDoc<T>(_id: string): T | null {
  const { db, isMemory } = getDb()
  if (isMemory) {
    return (memStore.get(_id) as T) ?? null
  }
  return db.get(_id) as T | null
}
