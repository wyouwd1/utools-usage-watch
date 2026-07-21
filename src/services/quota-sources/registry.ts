import { QuotaSourceType } from '@/types'
import type { IQuotaSourceAdapter } from './index'

export class QuotaSourceRegistry {
  private adapters = new Map<QuotaSourceType, IQuotaSourceAdapter>()

  register(adapter: IQuotaSourceAdapter): void {
    this.adapters.set(adapter.sourceType, adapter)
  }

  get(type: QuotaSourceType): IQuotaSourceAdapter | undefined {
    return this.adapters.get(type)
  }

  getAll(): IQuotaSourceAdapter[] {
    return Array.from(this.adapters.values())
  }
}

export const quotaSourceRegistry = new QuotaSourceRegistry()

// Auto-register all built-in adapters
import { OpenCodeAdapter } from './opencode'
import { BailianAdapter } from './bailian'
import { DeepSeekQuotaAdapter } from './deepseek'
import { MoonshotQuotaAdapter } from './moonshot'
import { GroqQuotaAdapter } from './groq'
import { QwenQuotaAdapter } from './qwen'
import { GlmQuotaAdapter } from './glm'
import { MiniMaxQuotaAdapter } from './minimax'

quotaSourceRegistry.register(new OpenCodeAdapter())
quotaSourceRegistry.register(new BailianAdapter())
quotaSourceRegistry.register(new DeepSeekQuotaAdapter())
quotaSourceRegistry.register(new MoonshotQuotaAdapter())
quotaSourceRegistry.register(new GroqQuotaAdapter())
quotaSourceRegistry.register(new QwenQuotaAdapter())
quotaSourceRegistry.register(new GlmQuotaAdapter())
quotaSourceRegistry.register(new MiniMaxQuotaAdapter())
