import type { IQuotaWindows } from '@/types/quota'

/**
 * Parse Groq usage response.
 * { total_requests: number, remaining_requests: number }
 */
export function parseGroqResponse(body: string): IQuotaWindows | null {
  try {
    const data = JSON.parse(body)
    const total = data?.total_requests ?? 0
    const remaining = data?.remaining_requests ?? 0
    const used = total - remaining
    return {
      weekly: { usedPercent: total > 0 ? Math.round((used / total) * 100) : 0, resetsAt: null, used, total, unit: 'requests' },
    }
  } catch {
    return null
  }
}
