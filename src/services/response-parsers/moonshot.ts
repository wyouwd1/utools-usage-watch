import type { IQuotaWindows } from '@/types/quota'

/**
 * Parse Moonshot balance response.
 * { balance: number }
 */
export function parseMoonshotResponse(body: string): IQuotaWindows | null {
  try {
    const data = JSON.parse(body)
    const total = data?.balance ?? 0
    return { monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' } }
  } catch {
    return null
  }
}
