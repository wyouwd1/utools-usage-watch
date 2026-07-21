import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'https://open.bigmodel.cn'

export class GlmAdapter implements IProviderAdapter {
  readonly type = ProviderType.GLM
  readonly info = {
    type: ProviderType.GLM,
    label: 'GLM (智谱)',
    labelEn: 'GLM (Zhipu)',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: true,
    icon: '💠',
  }

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    const start = Date.now()
    try {
      const res = await fetch(
        `${baseUrl ?? DEFAULT_BASE_URL}/api/biz/account/query-customer-account-report`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(5000),
        }
      )
      return { success: res.ok, statusCode: res.status, latencyMs: Date.now() - start }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async checkQuota(apiKey: string, baseUrl?: string): Promise<IQuotaWindows | null> {
    try {
      const res = await fetch(
        `${baseUrl ?? DEFAULT_BASE_URL}/api/biz/account/query-customer-account-report`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(5000),
        }
      )
      if (!res.ok) return null
      const data = await res.json()
      // GLM account report: { code: 0, data: { totalBalance: number, ... } }
      const total = data?.data?.totalBalance ?? 0
      return {
        monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' },
      }
    } catch { return null }
  }
}
