import type { IQuotaWindows } from '@/types'
import { QuotaSourceType } from '@/types'

export interface IQuotaSourceAdapter {
  readonly sourceType: QuotaSourceType
  readonly label: string
  readonly defaultBaseUrl?: string
  checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null>
}

export { QuotaSourceType } from '@/types'
export type { IQuotaWindows, IQuotaWindow } from '@/types'

export { quotaSourceRegistry } from './registry'
