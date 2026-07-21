import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

export class GlmQuotaAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.GLM
  readonly label = 'GLM (Balance)'
  readonly defaultBaseUrl = 'https://open.bigmodel.cn'

  async checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null> {
    const baseUrl = config?.baseUrl ?? this.defaultBaseUrl
    try {
      const res = await fetch(`${baseUrl}/api/biz/account/query-customer-account-report`, {
        headers: { Authorization: `Bearer ${credential}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      // GLM account report: { code: 0, data: { totalBalance: number, ... } } or { totalBalance: number }
      const total = data?.data?.totalBalance ?? data?.totalBalance ?? 0
      return {
        monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' },
      }
    } catch {
      return null
    }
  }
}
