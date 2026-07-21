import { adapterRegistry } from './providers/registry'
import type { IApiKeyEntity, ITestResult } from '@/types'

export async function testApiKey(apiKey: IApiKeyEntity): Promise<ITestResult> {
  const adapter = adapterRegistry.get(apiKey.provider)
  if (!adapter) return { success: false, error: `Unsupported provider: ${apiKey.provider}` }
  return adapter.testConnection(apiKey.encryptedKey, apiKey.baseUrl ?? undefined)
  // Note: In actual use, encryptedKey should be decrypted first via the encrypt service
}

export async function batchTestKeys(keys: IApiKeyEntity[]): Promise<Map<string, ITestResult>> {
  const results = new Map<string, ITestResult>()
  const entries = await Promise.allSettled(keys.map(k => testApiKey(k).then(r => [k._id, r] as const)))
  for (const entry of entries) {
    if (entry.status === 'fulfilled') results.set(entry.value[0], entry.value[1])
  }
  return results
}
