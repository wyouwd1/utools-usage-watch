import { adapterRegistry } from './providers/registry'
import { useApiKeysStore } from '@/stores/apiKeys'
import { useQuotasStore } from '@/stores/quotas'

/**
 * Check quota for a single API key.
 * Respects the in-memory cache TTL; if a fresh cache entry exists, the call is a no-op.
 * For force-refresh, call forceRefreshKey() instead.
 */
export async function checkSingleKey(apiKeyId: string): Promise<void> {
  const quotasStore = useQuotasStore()
  const apiKeysStore = useApiKeysStore()

  // Check in-memory cache TTL first
  const cached = quotasStore.getCached(apiKeyId)
  if (cached) return

  const apiKey = apiKeysStore.apiKeyList.find(k => k._id === `apikey/${apiKeyId}`)
  if (!apiKey) return

  const adapter = adapterRegistry.get(apiKey.provider)
  if (!adapter || !adapter.info.hasQuota) return

  quotasStore.setLoading(apiKeyId, true)
  try {
    const result = await adapter.checkQuota(apiKey.encryptedKey, apiKey.baseUrl ?? undefined)
    if (result) {
      quotasStore.updateQuota(apiKeyId, result)
    }
  } catch {
    // Use stale cache if available
    const stale = quotasStore.getStale(apiKeyId)
    if (!stale) quotasStore.setLoading(apiKeyId, false)
  } finally {
    quotasStore.setLoading(apiKeyId, false)
  }
}

/**
 * Refresh quota for all active keys that support quota checking.
 * Runs all checks concurrently via Promise.allSettled.
 */
export async function refreshAll(): Promise<void> {
  const apiKeysStore = useApiKeysStore()
  const quotasStore = useQuotasStore()
  quotasStore.refreshing = true

  const promises = apiKeysStore.activeKeys
    .filter(k => {
      const adapter = adapterRegistry.get(k.provider)
      return adapter?.info.hasQuota
    })
    .map(k => {
      const id = k._id.replace('apikey/', '')
      return checkSingleKey(id)
    })
  await Promise.allSettled(promises)
  quotasStore.refreshing = false
}

/**
 * Force-refresh quota for a single key by invalidating its cache first.
 */
export async function forceRefreshKey(apiKeyId: string): Promise<void> {
  const quotasStore = useQuotasStore()
  // Invalidate cache so getCached() returns null on the next call
  if (quotasStore.quotaMap[apiKeyId]) {
    quotasStore.quotaMap[apiKeyId].fetchedAt = 0
  }
  await checkSingleKey(apiKeyId)
}
