import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

const API_HOST = 'https://bailian-cs.console.aliyun.com/data/api.json'

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

export class BailianAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.BAILIAN
  readonly label = '阿里云百炼 (Bailian)'

  async checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null> {
    const cookie = credential
    const token = config?.sec_token
    const region = config?.region ?? 'cn-beijing'
    if (!cookie || !token) return null

    const params = encodeURIComponent(JSON.stringify({
      Api: 'zeldaEasy.bailian-commerce.codingPlan.queryCodingPlanInstanceInfoV2',
      V: '1.0',
      Data: {
        queryCodingPlanInstanceInfoRequest: {
          commodityCode: 'sfm_codingplan_public_cn',
          onlyLatestOne: true,
        },
        cornerstoneParam: {
          protocol: 'V2',
          console: 'ONE_CONSOLE',
          productCode: 'p_efm',
          domain: 'bailian.console.aliyun.com',
          consoleSite: 'BAILIAN_ALIYUN',
          xsp_lang: 'zh-CN',
        },
      },
    }))

    const body = `params=${params}&region=${region}&sec_token=${token}`

    try {
      const res = await fetch(API_HOST, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'content-type': 'application/x-www-form-urlencoded',
          cookie,
          origin: 'https://bailian.console.aliyun.com',
          referer: 'https://bailian.console.aliyun.com/cn-beijing?tab=plan',
          'user-agent': 'utools-usage-watch/1.0',
        },
        body,
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const raw = await res.json()
      if (raw.code !== '200') return null
      const data = raw.data
      const dataV2 = data?.DataV2
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
}
