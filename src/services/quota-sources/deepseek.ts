import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

export class DeepSeekQuotaAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.DEEPSEEK
  readonly label = 'DeepSeek (Balance)'
  readonly defaultBaseUrl = 'https://api.deepseek.com'

  async checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null> {
    const baseUrl = config?.baseUrl ?? this.defaultBaseUrl
    try {
      const res = await fetch(`${baseUrl}/user/balance`, {
        headers: { Authorization: `Bearer ${credential}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const total = data?.balance_infos?.[0]?.total_balance ?? 0
      return {
        monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' },
      }
    } catch {
      return null
    }
  }
}
