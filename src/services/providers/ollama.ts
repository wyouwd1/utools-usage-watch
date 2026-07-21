import type { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types'
import { ProviderType } from '@/types'

const DEFAULT_BASE_URL = 'http://localhost:11434'

export class OllamaAdapter implements IProviderAdapter {
  readonly type = ProviderType.OLLAMA
  readonly info = {
    type: ProviderType.OLLAMA,
    label: 'Ollama',
    labelEn: 'Ollama',
    defaultBaseUrl: DEFAULT_BASE_URL,
    hasQuota: false,
    icon: '🦙',
  }

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    // Ollama doesn't require an API key; apiKey param is ignored
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      return { success: res.ok, statusCode: res.status, latencyMs: Date.now() - start }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async checkQuota(_apiKey: string, _baseUrl?: string): Promise<IQuotaWindows | null> {
    // Ollama is local, no quota concept
    return null
  }

  async fetchModels(apiKey: string, baseUrl?: string): Promise<string[] | null> {
    try {
      const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      if (!data?.models) return null
      return data.models.map((m: { name: string }) => m.name)
    } catch { return null }
  }
}
