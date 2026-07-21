import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IApiKeyEntity, ProviderType, KeyStatus } from '@/types'
import * as apiKeysRepo from '@/db/apiKeys.repo'

export const useApiKeysStore = defineStore('apiKeys', () => {
  const apiKeyList = ref<IApiKeyEntity[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeKeys = computed(() => apiKeyList.value.filter(k => k.status === 'active' || k.status === 'untested'))
  const countByProvider = computed(() => {
    const map = new Map<ProviderType, number>()
    for (const k of apiKeyList.value) {
      map.set(k.provider, (map.get(k.provider) ?? 0) + 1)
    }
    return map
  })

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      apiKeyList.value = apiKeysRepo.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function addKey(data: Omit<IApiKeyEntity, '_id' | '_rev' | 'type' | 'encryptedKey' | 'keyPreview' | 'createdAt' | 'updatedAt'> & { key: string }): Promise<IApiKeyEntity | null> {
    try {
      const key = await apiKeysRepo.add(data)
      apiKeyList.value.push(key)
      return key
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  function updateKey(id: string, data: Partial<IApiKeyEntity>): IApiKeyEntity | null {
    try {
      const updated = apiKeysRepo.update(id, { ...data, updatedAt: Date.now() })
      if (updated) {
        const idx = apiKeyList.value.findIndex(k => k._id === `apikey/${id}`)
        if (idx >= 0) apiKeyList.value[idx] = updated
      }
      return updated
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  function removeKey(id: string): boolean {
    try {
      const ok = apiKeysRepo.remove(id)
      if (ok) apiKeyList.value = apiKeyList.value.filter(k => k._id !== `apikey/${id}`)
      return ok
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  function searchKeys(query: string): IApiKeyEntity[] {
    if (!query.trim()) return apiKeyList.value
    const q = query.toLowerCase()
    return apiKeyList.value.filter(k =>
      k.label.toLowerCase().includes(q) ||
      k.provider.toLowerCase().includes(q) ||
      k.keyPreview.toLowerCase().includes(q)
    )
  }

  return {
    apiKeyList, loading, error,
    activeKeys, countByProvider,
    fetchAll, addKey, updateKey, removeKey, searchKeys,
  }
})
