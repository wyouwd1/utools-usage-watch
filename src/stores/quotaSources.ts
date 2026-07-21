import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IQuotaSourceEntity, QuotaSourceType } from '@/types/quota'
import * as quotaSourcesRepo from '@/db/quotaSources.repo'

export const useQuotaSourcesStore = defineStore('quotaSources', () => {
  const sourceList = ref<IQuotaSourceEntity[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const enabledSources = computed(() =>
    sourceList.value.filter((s) => s.enabled),
  )

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      sourceList.value = quotaSourcesRepo.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function addSource(
    data: Omit<
      IQuotaSourceEntity,
      | '_id'
      | '_rev'
      | 'type'
      | 'encryptedCredential'
      | 'credentialHint'
      | 'createdAt'
      | 'updatedAt'
    > & { credential: string },
  ): Promise<IQuotaSourceEntity | null> {
    try {
      const source = await quotaSourcesRepo.add(data)
      sourceList.value.push(source)
      return source
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateSource(
    id: string,
    data: Partial<IQuotaSourceEntity> & { credential?: string },
  ): Promise<IQuotaSourceEntity | null> {
    try {
      const updated = await quotaSourcesRepo.update(id, data)
      if (updated) {
        const idx = sourceList.value.findIndex(
          (s) => s._id === `quota-source/${id}`,
        )
        if (idx >= 0) sourceList.value[idx] = updated
      }
      return updated
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  function removeSource(id: string): boolean {
    try {
      const ok = quotaSourcesRepo.remove(id)
      if (ok)
        sourceList.value = sourceList.value.filter(
          (s) => s._id !== `quota-source/${id}`,
        )
      return ok
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  function searchSources(query: string): IQuotaSourceEntity[] {
    if (!query.trim()) return sourceList.value
    const q = query.toLowerCase()
    return sourceList.value.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.sourceType.toLowerCase().includes(q),
    )
  }

  return {
    sourceList,
    loading,
    error,
    enabledSources,
    fetchAll,
    addSource,
    updateSource,
    removeSource,
    searchSources,
  }
})
