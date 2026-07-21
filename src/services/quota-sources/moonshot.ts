import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

export class MoonshotQuotaAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.MOONSHOT
  readonly label = 'Moonshot (Balance)'
  readonly defaultBaseUrl = 'https://api.moonshot.cn'

  async checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null> {
    const baseUrl = config?.baseUrl ?? this.defaultBaseUrl
    try {
      const res = await fetch(`${baseUrl}/v1/billing/balance`, {
        headers: { Authorization: `Bearer ${credential}`, accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const total = data?.balance ?? 0
      return {
        monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' },
      }
    } catch {
      return null
    }
  }
}
