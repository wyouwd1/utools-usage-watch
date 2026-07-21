export interface IQuotaWindows {
  rolling?: IQuotaWindow | null
  weekly?: IQuotaWindow | null
  monthly?: IQuotaWindow | null
}

export interface IQuotaWindow {
  usedPercent: number
  resetsAt: number | null
  used: number
  total: number
  unit: string
}

/** Pinia 内存中的额度缓存状态 */
export interface IQuotaCacheEntry {
  windows: IQuotaWindows
  fetchedAt: number
  loading: boolean
  error?: string
}

export interface IQuotaHistoryEntry {
  apiKeyId: string
  usedPercent: number
  recordedAt: number
  source: 'auto' | 'manual'
}
