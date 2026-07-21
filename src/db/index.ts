export const COLLECTION = {
  API_KEY: 'apikey/',
  SETTING: 'setting/',
}

export function docId(collection: string, ...parts: string[]): string {
  return collection + parts.join('/')
}

export function getByPrefix<T>(prefix: string): T[] {
  return ((window as any).utools?.db?.allDocs(prefix) as T[]) ?? []
}

export function putDoc<T extends { _id: string }>(doc: T): T {
  const utools = (window as any).utools
  if (!utools?.db) return doc
  const existing = utools.db.get(doc._id) as T | null
  if (existing) {
    ;(doc as any)._rev = (existing as any)._rev
  }
  const result = utools.db.put(doc)
  if (result?.ok) {
    ;(doc as any)._rev = result.rev
  }
  return doc
}

export function removeDoc(_id: string): boolean {
  const utools = (window as any).utools
  if (!utools?.db) return false
  const result = utools.db.remove(_id)
  return result?.ok ?? false
}
