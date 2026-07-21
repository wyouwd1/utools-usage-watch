import type { IQuotaWindows } from '@/types/quota'

/**
 * Aggregate Bailian quota info into IQuotaWindows format.
 */
function aggregatePlan(info: Record<string, any>): IQuotaWindows {
  return {
    rolling: {
      usedPercent: Math.round((info.per5HourUsedQuota / info.per5HourTotalQuota) * 100),
      resetsAt: info.per5HourQuotaNextRefreshTime,
      used: info.per5HourUsedQuota,
      total: info.per5HourTotalQuota,
      unit: 'tokens',
    },
    weekly: {
      usedPercent: Math.round((info.perWeekUsedQuota / info.perWeekTotalQuota) * 100),
      resetsAt: info.perWeekQuotaNextRefreshTime,
      used: info.perWeekUsedQuota,
      total: info.perWeekTotalQuota,
      unit: 'tokens',
    },
    monthly: {
      usedPercent: Math.round((info.perBillMonthUsedQuota / info.perBillMonthTotalQuota) * 100),
      resetsAt: info.perBillMonthQuotaNextRefreshTime,
      used: info.perBillMonthUsedQuota,
      total: info.perBillMonthTotalQuota,
      unit: 'tokens',
    },
  }
}

/**
 * Parse Bailian JSON API response.
 * Expected structure:
 * { code: '200', data: { DataV2: { data: { data: { codingPlanInstanceInfos: [{ codingPlanQuotaInfo: {...} }] } } } } }
 */
export function parseBailianResponse(body: string): IQuotaWindows | null {
  try {
    const raw = JSON.parse(body)
    if (raw.code !== '200') return null
    const dataV2 = raw.data?.DataV2
    const v2Data = dataV2?.data
    const innerData = v2Data?.data
    const instances = innerData?.codingPlanInstanceInfos
    if (!instances || instances.length === 0) return null
    const quotaInfo = instances[0].codingPlanQuotaInfo
    if (!quotaInfo) return null
    return aggregatePlan(quotaInfo)
  } catch {
    return null
  }
}
