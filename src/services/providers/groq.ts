import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'https://api.groq.com'

export class GroqAdapter implements IProviderAdapter {
  readonly type = ProviderType.GROQ
  readonly info = {
    type: ProviderType.GROQ,
    label: 'Groq',
    labelEn: 'Groq',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: true,
    icon: '⚡',
  }

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/v1/models`, {
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
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/v1/user/usage`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const total = data?.total_requests ?? 0
      const remaining = data?.remaining_requests ?? 0
      const used = total - remaining
      return {
        monthly: {
          usedPercent: total > 0 ? Math.round((used / total) * 100) : 0,
          resetsAt: null,
          used,
          total,
          unit: 'requests',
        },
      }
    } catch { return null }
  }
}
