import { ProviderType } from '@/types/apikey'

export function isValidApiKey(key: string, provider: ProviderType): boolean {
  if (!key || typeof key !== 'string') return false

  switch (provider) {
    case ProviderType.OPENAI:
      return key.startsWith('sk-') && key.length > 20
    case ProviderType.ANTHROPIC:
      return key.startsWith('sk-ant-')
    case ProviderType.DEEPSEEK:
      return key.startsWith('sk-')
    default:
      return key.length > 10
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function generateUUID(): string {
  return crypto.randomUUID()
}
