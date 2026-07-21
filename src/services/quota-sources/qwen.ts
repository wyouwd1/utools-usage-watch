import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

export class QwenQuotaAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.QWEN
  readonly label = '通义千问 (Balance)'
  readonly defaultBaseUrl = 'https://dashscope.aliyuncs.com'

  async checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null> {
    const baseUrl = config?.baseUrl ?? this.defaultBaseUrl
    try {
      const res = await fetch(`${baseUrl}/api/v1/billing/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential}`,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const total = data?.data?.balance ?? 0
      return {
        monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' },
      }
    } catch {
      return null
    }
  }
}
