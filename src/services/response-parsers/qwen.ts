import type { IQuotaWindows } from '@/types/quota'

/**
 * Parse Qwen (DashScope) balance response.
 * { data: { balance: number } }
 */
export function parseQwenResponse(body: string): IQuotaWindows | null {
  try {
    const data = JSON.parse(body)
    const total = data?.data?.balance ?? 0
    return { monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' } }
  } catch {
    return null
  }
}
