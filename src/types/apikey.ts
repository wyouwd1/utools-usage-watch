export enum ProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  AZURE = 'azure',
  OLLAMA = 'ollama',
  OPENROUTER = 'openrouter',
  DEEPSEEK = 'deepseek',
  MOONSHOT = 'moonshot',
  GROQ = 'groq',
  QWEN = 'qwen',
  GLM = 'glm',
  CUSTOM = 'custom',
}

export enum KeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  ERROR = 'error',
  UNTESTED = 'untested',
}

export interface IApiKeyEntity {
  _id: string
  _rev?: string
  type: 'apikey'
  provider: ProviderType
  label: string
  encryptedKey: string
  keyPreview: string
  baseUrl: string | null
  models: string[]
  status: KeyStatus
  quotaAlertThreshold: number
  lastTestedAt: number | null
  lastTestResult: ITestResult | null
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface ITestResult {
  success: boolean
  statusCode?: number
  latencyMs?: number
  error?: string
  models?: string[]
}
