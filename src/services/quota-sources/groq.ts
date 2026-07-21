import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

export class GroqQuotaAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.GROQ
  readonly label = 'Groq (Usage)'
  readonly defaultBaseUrl = 'https://api.groq.com'

  async checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null> {
    const baseUrl = config?.baseUrl ?? this.defaultBaseUrl
    try {
      const res = await fetch(`${baseUrl}/v1/user/usage`, {
        headers: { Authorization: `Bearer ${credential}`, accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const total = data?.total_requests ?? 0
      const remaining = data?.remaining_requests ?? 0
      const used = total - remaining
      return {
        weekly: {
          usedPercent: total > 0 ? Math.round((used / total) * 100) : 0,
          resetsAt: null,
          used,
          total,
          unit: 'requests',
        },
      }
    } catch {
      return null
    }
  }
}
