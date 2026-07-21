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

// === 额度源类型（独立于 API Key）===

export enum QuotaSourceType {
  OPENCODE_GO = 'opencode-go',
  BAILIAN = 'bailian',
  DEEPSEEK = 'deepseek',
  MOONSHOT = 'moonshot',
  GROQ = 'groq',
  QWEN = 'qwen',
  GLM = 'glm',
  MINIMAX = 'minimax',
}

export interface IQuotaSourceEntity {
  _id: string
  _rev?: string
  type: 'quota-source'
  sourceType: QuotaSourceType
  label: string
  encryptedCredential: string
  credentialHint: string
  baseUrl?: string
  config?: Record<string, any>
  enabled: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}
