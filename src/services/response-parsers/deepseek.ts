import type { IQuotaWindows } from '@/types/quota'

/**
 * Parse DeepSeek balance response.
 * { balance_infos: [{ total_balance: number }] }
 */
export function parseDeepSeekResponse(body: string): IQuotaWindows | null {
  try {
    const data = JSON.parse(body)
    const total = data?.balance_infos?.[0]?.total_balance ?? 0
    return { monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' } }
  } catch {
    return null
  }
}
