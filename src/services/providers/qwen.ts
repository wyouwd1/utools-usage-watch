import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com'

export class QwenAdapter implements IProviderAdapter {
  readonly type = ProviderType.QWEN
  readonly info = {
    type: ProviderType.QWEN,
    label: '通义千问 (Qwen)',
    labelEn: 'Qwen (Tongyi)',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: true,
    icon: '🌐',
  }

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/api/v1/billing/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      })
      return { success: res.ok, statusCode: res.status, latencyMs: Date.now() - start }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async checkQuota(apiKey: string, baseUrl?: string): Promise<IQuotaWindows | null> {
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/api/v1/billing/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      // DashScope billing query response: { code: 0, data: { balance: number, ... } }
      const balance = data?.data?.balance ?? 0
      return {
        monthly: { usedPercent: 0, resetsAt: null, used: 0, total: balance, unit: 'CNY' },
      }
    } catch { return null }
  }
}
