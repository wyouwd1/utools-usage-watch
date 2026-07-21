import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'https://api.anthropic.com'

export class AnthropicAdapter implements IProviderAdapter {
  readonly type = ProviderType.ANTHROPIC
  readonly info = {
    type: ProviderType.ANTHROPIC,
    label: 'Anthropic',
    labelEn: 'Anthropic',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: true,
    icon: '🧠',
  }

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      })
      return { success: res.ok, statusCode: res.status, latencyMs: Date.now() - start }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async checkQuota(apiKey: string, baseUrl?: string): Promise<IQuotaWindows | null> {
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const requestLimit = res.headers.get('request-limit')
      const requestRemaining = res.headers.get('request-remaining')
      if (requestLimit && requestRemaining) {
        const total = Number(requestLimit)
        const remaining = Number(requestRemaining)
        const used = total - remaining
        return {
          rolling: {
            usedPercent: total > 0 ? Math.round((used / total) * 100) : 0,
            resetsAt: null,
            used,
            total,
            unit: 'requests',
          },
        }
      }
      return null
    } catch { return null }
  }
}
