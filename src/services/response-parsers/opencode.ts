import type { IQuotaWindows } from '@/types/quota'

/**
 * Parse Chinese relative time string like "2 小时 57 分钟" to seconds.
 */
function parseChineseDuration(text: string): number | null {
  let totalSeconds = 0
  let matched = false

  const dayMatch = text.match(/(\d+)\s*天/)
  if (dayMatch) { totalSeconds += Number(dayMatch[1]) * 86400; matched = true }

  const hourMatch = text.match(/(\d+)\s*小时/)
  if (hourMatch) { totalSeconds += Number(hourMatch[1]) * 3600; matched = true }

  const minMatch = text.match(/(\d+)\s*分钟/)
  if (minMatch) { totalSeconds += Number(minMatch[1]) * 60; matched = true }

  const secMatch = text.match(/(\d+)\s*秒/)
  if (secMatch) { totalSeconds += Number(secMatch[1]); matched = true }

  return matched ? totalSeconds : null
}

/**
 * Parse OpenCode workspace HTML response and extract quota windows.
 *
 * Supports:
 * 1. Current DOM-based HTML with data-slot attributes
 * 2. Legacy inline JS assignments
 */
export function parseOpenCodeHtml(html: string): IQuotaWindows | null {
  // Try DOM-based parsing first
  const domResult = extractFromDom(html)
  if (domResult) return domResult
  // Fallback: legacy JS assignments
  return extractFromJsAssignments(html)
}

function extractFromDom(html: string): IQuotaWindows | null {
  const pctMatches: number[] = []
  const pctRegex = /data-slot="usage-value"[^>]*>[\s\S]*?(\d+(?:\.\d+)?)\s*%/g
  let m: RegExpExecArray | null
  while ((m = pctRegex.exec(html)) !== null) {
    pctMatches.push(Number(m[1]))
  }
  if (pctMatches.length < 3) return null

  const timeTexts: string[] = []
  const timeRegex = /data-slot="reset-time"[^>]*>[\s\S]*?(\d+\s*(?:天|小时|分钟|秒)[\s\S]*?)</g
  while ((m = timeRegex.exec(html)) !== null) {
    timeTexts.push(m[1])
  }

  const now = Date.now()
  const labels = ['rolling', 'weekly', 'monthly'] as const
  const windows: IQuotaWindows = {}

  for (let i = 0; i < 3; i++) {
    let resetSec = 0
    if (i < timeTexts.length) {
      const duration = parseChineseDuration(timeTexts[i])
      if (duration !== null) resetSec = duration
    }
    windows[labels[i]] = {
      usedPercent: pctMatches[i],
      resetsAt: resetSec > 0 ? now + resetSec * 1000 : null,
      used: 0, total: 0, unit: '%',
    }
  }
  return windows
}

function extractFromJsAssignments(html: string): IQuotaWindows | null {
  const OBJECT_RE = /\{status:"[^"]+",resetInSec:(\d+),usagePercent:([\d.]+)\}/

  function extract(keyword: string): [number, number] | null {
    let pos = 0
    for (;;) {
      const idx = html.indexOf(keyword + ':', pos)
      if (idx === -1) return null
      const afterColon = html.slice(idx + keyword.length + 1).trimStart()
      if (afterColon.startsWith('null')) { pos = idx + 1; continue }
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
    rolling: { usedPercent: roll[0], resetsAt: now + roll[1] * 1000, used: 0, total: 0, unit: '%' },
    weekly: { usedPercent: week[0], resetsAt: now + week[1] * 1000, used: 0, total: 0, unit: '%' },
    monthly: { usedPercent: month[0], resetsAt: now + month[1] * 1000, used: 0, total: 0, unit: '%' },
  }
}
