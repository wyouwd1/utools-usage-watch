import { COLLECTION, getByPrefix, putDoc } from './index'
import type { ISettingEntity } from '@/types/settings'

export function get(key: string): any {
  const all = getByPrefix<ISettingEntity>(COLLECTION.SETTING)
  const found = all.find((s) => s.key === key)
  return found?.value ?? null
}

export function set(key: string, value: any): void {
  const all = getByPrefix<ISettingEntity>(COLLECTION.SETTING)
  const existing = all.find((s) => s.key === key)

  const doc: ISettingEntity = {
    _id: existing?._id ?? COLLECTION.SETTING + key,
    _rev: existing?._rev,
    type: 'setting',
    key,
    value,
  }

  putDoc(doc)
}

export function getAll(): Record<string, any> {
  const all = getByPrefix<ISettingEntity>(COLLECTION.SETTING)
  const result: Record<string, any> = {}
  for (const s of all) {
    result[s.key] = s.value
  }
  return result
}
