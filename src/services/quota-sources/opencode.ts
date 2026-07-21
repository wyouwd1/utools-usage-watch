import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

/**
 * Extract usage data from the OpenCode workspace HTML page.
 *
 * The page embeds inline JS assignments like:
 *   rollingUsage:$R[30]={status:"ok",resetInSec:5647,usagePercent:7}
 *   weeklyUsage:$R[31]={status:"ok",resetInSec:245174,usagePercent:25}
 *   monthlyUsage:$R[32]={status:"ok",resetInSec:597495,usagePercent:98}
 */
function extractQuota(html: string): IQuotaWindows | null {
  const OBJECT_RE = /\{status:"[^"]+",resetInSec:(\d+),usagePercent:(\d+)\}/

  function extract(keyword: string): [number, number] | null {
    let pos = 0
    for (;;) {
      const idx = html.indexOf(keyword + ':', pos)
      if (idx === -1) return null
      const afterColon = html.slice(idx + keyword.length + 1).trimStart()
      if (afterColon.startsWith('null')) {
        pos = idx + 1
        continue
      }
      const rest = html.slice(idx + keyword.length + 1)
      const m = rest.match(OBJECT_RE)
      if (!m) return null
      return [Number(m[2]), Number(m[1])]
    }
  }

  const roll = extract('rollingUsage')
  const week = extract('weeklyUsage')
  const month = extract('monthlyUsage')
  if (!roll || !week || !month) return null

  const now = Date.now()
  return {
    rolling: {
      usedPercent: roll[0],
      resetsAt: now + roll[1] * 1000,
      used: 0,
      total: 0,
      unit: '%',
    },
    weekly: {
      usedPercent: week[0],
      resetsAt: now + week[1] * 1000,
      used: 0,
      total: 0,
      unit: '%',
    },
    monthly: {
      usedPercent: month[0],
      resetsAt: now + month[1] * 1000,
      used: 0,
      total: 0,
      unit: '%',
    },
  }
}

export class OpenCodeAdapter implements IQuotaSourceAdapter {
  readonly sourceType = QuotaSourceType.OPENCODE_GO
  readonly label = 'OpenCode'
  readonly defaultBaseUrl = 'https://opencode.ai'

  async checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null> {
    const baseUrl = config?.baseUrl ?? this.defaultBaseUrl
    const wsId = config?.workspaceId ?? 'wrk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    try {
      const cookie = `oc_locale=zh; auth=${encodeURIComponent(credential)}`
      const res = await fetch(`${baseUrl}/workspace/${wsId}/go`, {
        headers: {
          accept: 'text/html',
          cookie,
          'user-agent': 'utools-usage-watch/1.0',
        },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const html = await res.text()
      return extractQuota(html)
    } catch {
      return null
    }
  }
}
