import type { IQuotaWindows } from '@/types/quota'

/**
 * Parse MiniMax token plan remains response.
 * { model_remains: [{ current_interval_status, current_interval_remaining_percent, remains_time, current_weekly_remaining_percent, weekly_remains_time }] }
 */
export function parseMiniMaxResponse(body: string): IQuotaWindows | null {
  try {
    const data = JSON.parse(body)
    const remains = data?.model_remains ?? []
    if (remains.length === 0) return null
    const active = remains.find((m: any) => m.current_interval_status === 1) ?? remains[0]
    const now = Date.now()
    const windows: IQuotaWindows = {}
    if (active.current_interval_remaining_percent != null) {
      windows.rolling = {
        usedPercent: Math.max(0, 100 - active.current_interval_remaining_percent),
        resetsAt: now + (active.remains_time || 0),
        used: 0, total: 0, unit: '%',
      }
    }
    if (active.current_weekly_remaining_percent != null) {
      windows.weekly = {
        usedPercent: Math.max(0, 100 - active.current_weekly_remaining_percent),
        resetsAt: now + (active.weekly_remains_time || 0),
        used: 0, total: 0, unit: '%',
      }
    }
    return Object.keys(windows).length > 0 ? windows : null
  } catch {
    return null
  }
}
