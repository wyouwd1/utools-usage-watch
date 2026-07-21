import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'
import type { IQuotaWindows } from '@/types'

/**
 * Parse Chinese relative time string like "2 小时 57 分钟" to seconds.
 */
function parseChineseDuration(text: string): number | null {
  let totalSeconds = 0
  let matched = false

  // Match "X 天" (days)
  const dayMatch = text.match(/(\d+)\s*天/)
  if (dayMatch) {
    totalSeconds += Number(dayMatch[1]) * 86400
    matched = true
  }

  // Match "X 小时" or "X 小时 X 分钟"
  const hourMatch = text.match(/(\d+)\s*小时/)
  if (hourMatch) {
    totalSeconds += Number(hourMatch[1]) * 3600
    matched = true
  }

  // Match "X 分钟"
  const minMatch = text.match(/(\d+)\s*分钟/)
  if (minMatch) {
    totalSeconds += Number(minMatch[1]) * 60
    matched = true
  }

  // Match "X 秒"
  const secMatch = text.match(/(\d+)\s*秒/)
  if (secMatch) {
    totalSeconds += Number(secMatch[1])
    matched = true
  }

  return matched ? totalSeconds : null
}

/**
 * Parse the OpenCode workspace HTML to extract quota data.
 *
 * Handles two formats:
 * 1. DOM-based HTML (current): <span data-slot="usage-value">12%</span>
 * 2. Inline JS assignments (legacy): rollingUsage:$R[30]={status:"ok",resetInSec:5647,usagePercent:7}
 */
function extractQuota(html: string): IQuotaWindows | null {
  // Try DOM-based parsing first (current page structure)
  const domResult = extractFromDom(html)
  if (domResult) return domResult

  // Fallback: legacy JS assignment parsing
  return extractFromJsAssignments(html)
}

/**
 * Parse the DOM-based HTML structure with data-slot attributes.
 * Usage items are ordered: rolling, weekly, monthly.
 *
 * Uses simple regexes to extract values and reset times by order
 * (avoids the complexity of nesting-aware HTML block parsing).
 */
function extractFromDom(html: string): IQuotaWindows | null {
  // Extract all usage-value percentages in order.
  // Handles streaming markers: <span data-slot="usage-value"><!--$-->12<!--/-->%</span>
  const pctMatches: number[] = []
  const pctRegex = /data-slot="usage-value"[^>]*>[\s\S]*?(\d+)\s*%/g
  let m: RegExpExecArray | null
  while ((m = pctRegex.exec(html)) !== null) {
    pctMatches.push(Number(m[1]))
  }

  // Extract all reset-time texts in order.
  // Handles streaming markers: <span data-slot="reset-time"><!--$-->重置于<!--/--> <!--$-->2 小时 57 分钟<!--/--></span>
  const timeTexts: string[] = []
  const timeRegex = /data-slot="reset-time"[^>]*>[\s\S]*?(\d+\s*(?:天|小时|分钟|秒)[\s\S]*?)</g
  while ((m = timeRegex.exec(html)) !== null) {
    timeTexts.push(m[1])
  }

  // Need at least 3 values (rolling, weekly, monthly)
  if (pctMatches.length < 3) return null

  const now = Date.now()
  const labels = ['rolling', 'weekly', 'monthly'] as const
  const windows: IQuotaWindows = {}

  for (let i = 0; i < 3; i++) {
    const pct = pctMatches[i]
    let resetSec = 0
    if (i < timeTexts.length) {
      const duration = parseChineseDuration(timeTexts[i])
      if (duration !== null) resetSec = duration
    }
    windows[labels[i]] = {
      usedPercent: pct,
      resetsAt: resetSec > 0 ? now + resetSec * 1000 : null,
      used: 0,
      total: 0,
      unit: '%',
    }
  }

  return windows
}

/**
 * Fallback: parse inline JS assignments like:
 *   rollingUsage:$R[30]={status:"ok",resetInSec:5647,usagePercent:7}
 */
function extractFromJsAssignments(html: string): IQuotaWindows | null {
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
