import { quotaSourceRegistry } from './quota-sources/registry'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { useQuotasStore } from '@/stores/quotas'

/**
 * Check quota for a single quota source.
 * Respects the in-memory cache TTL; if a fresh cache entry exists, the call is a no-op.
 * For force-refresh, call forceRefreshSource() instead.
 */
export async function checkSingleSource(sourceId: string): Promise<void> {
  const quotasStore = useQuotasStore()
  const sourcesStore = useQuotaSourcesStore()

  // Check in-memory cache TTL first (keys prefixed with 'source:')
  const cached = quotasStore.getCached(`source:${sourceId}`)
  if (cached) return

  const source = sourcesStore.sourceList.find(s => s._id === `quota-source/${sourceId}`)
  if (!source) return

  const adapter = quotaSourceRegistry.get(source.sourceType)
  if (!adapter) return

  quotasStore.setLoading(`source:${sourceId}`, true)
  try {
    const result = await adapter.checkQuota(source.encryptedCredential, source.config)
    if (result) {
      quotasStore.updateQuota(`source:${sourceId}`, result)
    }
  } catch {
    // Use stale cache if available
    const stale = quotasStore.getStale(`source:${sourceId}`)
    if (!stale) quotasStore.setLoading(`source:${sourceId}`, false)
  } finally {
    quotasStore.setLoading(`source:${sourceId}`, false)
  }
}

/**
 * Refresh quota for all enabled quota sources.
 * Runs all checks concurrently via Promise.allSettled.
 */
export async function refreshAll(): Promise<void> {
  const sourcesStore = useQuotaSourcesStore()
  const quotasStore = useQuotasStore()
  quotasStore.refreshing = true

  const promises = sourcesStore.enabledSources.map(s => {
    const id = s._id.replace('quota-source/', '')
    return checkSingleSource(id)
  })
  await Promise.allSettled(promises)
  quotasStore.refreshing = false
}

/**
 * Force-refresh quota for a single source by invalidating its cache first.
 */
export async function forceRefreshSource(sourceId: string): Promise<void> {
  const quotasStore = useQuotasStore()
  // Invalidate cache so getCached() returns null on the next call
  if (quotasStore.quotaMap[`source:${sourceId}`]) {
    quotasStore.quotaMap[`source:${sourceId}`].fetchedAt = 0
  }
  await checkSingleSource(sourceId)
}
