import { quotaSourceRegistry } from './quota-sources/registry'
import { useQuotaSourcesStore } from '@/stores/quotaSources'
import { useQuotasStore } from '@/stores/quotas'
import { decrypt } from './encrypt'
import { parseCurlToRequest } from './curl-parser'
import { isCurlParseError } from '@/types/quota'
import { executeCurl } from './curl-executor'
import { responseParsers } from './response-parsers'

/**
 * Check quota for a single quota source.
 *
 * Two modes:
 * - cURL mode (source.curlRaw exists): executes the saved cURL and parses the response
 * - Manual mode: decrypts credential and calls adapter.checkQuota()
 *
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

  // Determine mode and check availability before setting loading state
  if (source.curlRaw) {
    const parsed = parseCurlToRequest(source.curlRaw)
    if (isCurlParseError(parsed)) {
      sourcesStore.markCheckResult(sourceId, false, parsed.userMessage.zh)
      return
    }
    const parser = responseParsers[source.sourceType]
    if (!parser) {
      sourcesStore.markCheckResult(sourceId, false, `No response parser for ${source.sourceType}`)
      return
    }
  } else {
    const adapter = quotaSourceRegistry.get(source.sourceType)
    if (!adapter) return
  }

  quotasStore.setLoading(`source:${sourceId}`, true)
  try {
    if (source.curlRaw) {
      // === cURL mode: execute the saved cURL and parse the response ===
      const parsed = parseCurlToRequest(source.curlRaw)
      if (isCurlParseError(parsed)) return // unreachable, checked above
      const body = await executeCurl(parsed)
      const parser = responseParsers[source.sourceType]
      if (!parser) return // unreachable, checked above
      const result = parser(body)
      if (result && Object.keys(result).length > 0) {
        quotasStore.updateQuota(`source:${sourceId}`, result)
        sourcesStore.markCheckResult(sourceId, true)
      } else {
        sourcesStore.markCheckResult(sourceId, false, '无法从响应中解析出额度数据')
      }
    } else {
      // === Manual mode: decrypt credential and use adapter ===
      const adapter = quotaSourceRegistry.get(source.sourceType)
      if (!adapter) return // unreachable, checked above
      const plainCredential = await decrypt(source.encryptedCredential)
      const result = await adapter.checkQuota(plainCredential, source.config)
      if (result) {
        quotasStore.updateQuota(`source:${sourceId}`, result)
        sourcesStore.markCheckResult(sourceId, true)
      }
    }
  } catch (err) {
    const message = (err as Error).message || String(err)
    // Detect 401/403/Unauthorized → mark as expired
    if (/401|403|unauthorized/i.test(message)) {
      sourcesStore.markCheckResult(sourceId, false, message)
    }
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
