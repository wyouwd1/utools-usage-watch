import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'https://openrouter.ai'

export class OpenRouterAdapter implements IProviderAdapter {
  readonly type = ProviderType.OPENROUTER
  readonly info = {
    type: ProviderType.OPENROUTER,
    label: 'OpenRouter',
    labelEn: 'OpenRouter',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: true,
    icon: '🛡️',
  }

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/api/v1/auth/key`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      return { success: res.ok, statusCode: res.status, latencyMs: Date.now() - start }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async checkQuota(apiKey: string, baseUrl?: string): Promise<IQuotaWindows | null> {
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/api/v1/auth/key`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const credits = data?.data?.credits ?? 0
      return {
        monthly: { usedPercent: 0, resetsAt: null, used: 0, total: credits, unit: 'credits' },
      }
    } catch { return null }
  }
}
