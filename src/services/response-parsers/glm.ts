import type { IQuotaWindows } from '@/types/quota'

/**
 * Parse GLM (BigModel) account report response.
 * { code: 0, data: { totalBalance: number } } or { totalBalance: number }
 */
export function parseGlmResponse(body: string): IQuotaWindows | null {
  try {
    const data = JSON.parse(body)
    const total = data?.data?.totalBalance ?? data?.totalBalance ?? 0
    return { monthly: { usedPercent: 0, resetsAt: null, used: 0, total, unit: 'CNY' } }
  } catch {
    return null
  }
}
