import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'https://api.openai.com'

export class OpenAIAdapter implements IProviderAdapter {
  readonly type = ProviderType.OPENAI
  readonly info = {
    type: ProviderType.OPENAI,
    label: 'OpenAI',
    labelEn: 'OpenAI',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: true,
    icon: '🤖',
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
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const res = await fetch(
        `${baseUrl ?? DEFAULT_BASE_URL}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) return null
      const data = await res.json()
      // Also fetch grants
      const grantsRes = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/v1/dashboard/billing/subscriptions`,
        { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) })
      const grants = grantsRes.ok ? await grantsRes.json() : null
      const total = grants?.hard_limit_usd ?? 100
      const used = data?.total_usage ?? 0
      return {
        monthly: { usedPercent: Math.round((used / total) * 100), resetsAt: null, used, total, unit: 'USD' },
      }
    } catch { return null }
  }
}
