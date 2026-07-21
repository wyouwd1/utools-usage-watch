import type { IProviderAdapter } from '@/types'
import { ProviderType } from '@/types'
import { OpenAIAdapter } from './openai'
import { AnthropicAdapter } from './anthropic'
import { DeepSeekAdapter } from './deepseek'
import { OpenRouterAdapter } from './openrouter'
import { OllamaAdapter } from './ollama'
import { GoogleAdapter } from './google'
import { AzureAdapter } from './azure'
import { MoonshotAdapter } from './moonshot'
import { GroqAdapter } from './groq'
import { QwenAdapter } from './qwen'
import { GlmAdapter } from './glm'

export class AdapterRegistry {
  private adapters = new Map<ProviderType, IProviderAdapter>()

  register(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.type, adapter)
  }

  get(type: ProviderType): IProviderAdapter | undefined {
    return this.adapters.get(type)
  }

  getAll(): IProviderAdapter[] {
    return Array.from(this.adapters.values())
  }

  hasQuota(type: ProviderType): boolean {
    return this.adapters.get(type)?.info.hasQuota ?? false
  }
}

export const adapterRegistry = new AdapterRegistry()

// Auto-register all built-in adapters
adapterRegistry.register(new OpenAIAdapter())
adapterRegistry.register(new AnthropicAdapter())
adapterRegistry.register(new DeepSeekAdapter())
adapterRegistry.register(new OpenRouterAdapter())
adapterRegistry.register(new OllamaAdapter())
adapterRegistry.register(new GoogleAdapter())
adapterRegistry.register(new AzureAdapter())
adapterRegistry.register(new MoonshotAdapter())
adapterRegistry.register(new GroqAdapter())
adapterRegistry.register(new QwenAdapter())
adapterRegistry.register(new GlmAdapter())
