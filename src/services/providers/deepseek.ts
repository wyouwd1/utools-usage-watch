import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'https://api.deepseek.com'

export class DeepSeekAdapter implements IProviderAdapter {
  readonly type = ProviderType.DEEPSEEK
  readonly info = {
    type: ProviderType.DEEPSEEK,
    label: 'DeepSeek',
    labelEn: 'DeepSeek',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: true,
    icon: '🔮',
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
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/user/balance`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const total = data?.balance_infos?.[0]?.total_balance ?? 0
      return {
        monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'USD' },
      }
    } catch { return null }
  }
}
