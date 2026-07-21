import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

export class MiniMaxQuotaAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.MINIMAX
  readonly label = 'MiniMax (Quota)'
  readonly defaultBaseUrl = 'https://api.minimaxi.com'

  async checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null> {
    const baseUrl = config?.baseUrl ?? this.defaultBaseUrl
    try {
      const res = await fetch(`${baseUrl}/v1/token_plan/remains`, {
        headers: { Authorization: `Bearer ${credential}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const remains = data?.model_remains ?? []
      if (remains.length === 0) return null
      const active = remains.find((m: any) => m.current_interval_status === 1) ?? remains[0]
      const now = Date.now()
      return {
        rolling: {
          usedPercent: Math.max(0, 100 - active.current_interval_remaining_percent),
          resetsAt: now + active.remains_time,
          used: 0,
          total: 0,
          unit: '%',
        },
        weekly: {
          usedPercent: Math.max(0, 100 - active.current_weekly_remaining_percent),
          resetsAt: now + active.weekly_remains_time,
          used: 0,
          total: 0,
          unit: '%',
        },
      }
    } catch {
      return null
    }
  }
}
