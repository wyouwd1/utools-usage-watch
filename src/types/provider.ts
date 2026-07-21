import type { ProviderType } from './apikey'
import type { IQuotaWindows, ITestResult } from '.'

export interface IProviderInfo {
  type: ProviderType
  label: string
  labelEn: string
  defaultBaseUrl: string
  hasQuota: boolean
  icon: string // emoji or path
}

export interface IProviderAdapter {
  readonly type: ProviderType
  readonly info: IProviderInfo

  testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult>
  checkQuota(apiKey: string, baseUrl?: string): Promise<IQuotaWindows | null>
  fetchModels?(apiKey: string, baseUrl?: string): Promise<string[] | null>
}
