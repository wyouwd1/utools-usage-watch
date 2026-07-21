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
  itemId: string
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
  curlRaw?: string                 // Raw cURL command for re-editing
  credentialExpiredAt?: number     // Timestamp when cookie was detected as expired
  lastCheckSucceeded?: boolean     // Whether the last quota check succeeded
  lastError?: string               // Last error message from quota check
}

export interface CurlParseResult {
  url: string
  baseUrl: string
  headers: Record<string, string>
  cookies: Record<string, string>
  workspaceId?: string
  secToken?: string
}

export interface CurlParseError {
  code: 'NO_URL' | 'NO_CREDENTIAL' | 'INVALID_FORMAT'
  message: string
  userMessage: { zh: string; en: string }
}

export function isCurlParseError(obj: any): obj is CurlParseError {
  return obj && typeof obj === 'object' && 'code' in obj && 'userMessage' in obj
}
