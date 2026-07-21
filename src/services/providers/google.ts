import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com'

export class GoogleAdapter implements IProviderAdapter {
  readonly type = ProviderType.GOOGLE
  readonly info = {
    type: ProviderType.GOOGLE,
    label: 'Google Gemini',
    labelEn: 'Google Gemini',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: false,
    icon: '🔵',
  }

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    const start = Date.now()
    try {
      const url = `${baseUrl ?? DEFAULT_BASE_URL}/v1/models?key=${apiKey}`
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      return { success: res.ok, statusCode: res.status, latencyMs: Date.now() - start }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async checkQuota(_apiKey: string, _baseUrl?: string): Promise<IQuotaWindows | null> {
    // Gemini free tier does not provide a billing/quota API
    return null
  }
}
