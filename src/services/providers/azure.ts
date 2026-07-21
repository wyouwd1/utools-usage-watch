import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = ''

export class AzureAdapter implements IProviderAdapter {
  readonly type = ProviderType.AZURE
  readonly info = {
    type: ProviderType.AZURE,
    label: 'Azure OpenAI',
    labelEn: 'Azure OpenAI',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: false,
    icon: '☁️',
  }

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    const start = Date.now()
    try {
      const url = `${baseUrl ?? DEFAULT_BASE_URL}/openai/models?api-version=2024-02-15-preview`
      const res = await fetch(url, {
        headers: { 'api-key': apiKey },
        signal: AbortSignal.timeout(5000),
      })
      return { success: res.ok, statusCode: res.status, latencyMs: Date.now() - start }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async checkQuota(_apiKey: string, _baseUrl?: string): Promise<IQuotaWindows | null> {
    // Azure quota requires Resource Management API with extra authentication
    return null
  }
}
