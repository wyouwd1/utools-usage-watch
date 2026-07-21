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

// Auto-register all built-in adapters
import { OpenCodeAdapter } from './opencode'
import { BailianAdapter } from './bailian'
import { DeepSeekQuotaAdapter } from './deepseek'
import { MoonshotQuotaAdapter } from './moonshot'
import { GroqQuotaAdapter } from './groq'
import { QwenQuotaAdapter } from './qwen'
import { GlmQuotaAdapter } from './glm'
import { MiniMaxQuotaAdapter } from './minimax'
import { quotaSourceRegistry } from './registry'

quotaSourceRegistry.register(new OpenCodeAdapter())
quotaSourceRegistry.register(new BailianAdapter())
quotaSourceRegistry.register(new DeepSeekQuotaAdapter())
quotaSourceRegistry.register(new MoonshotQuotaAdapter())
quotaSourceRegistry.register(new GroqQuotaAdapter())
quotaSourceRegistry.register(new QwenQuotaAdapter())
quotaSourceRegistry.register(new GlmQuotaAdapter())
quotaSourceRegistry.register(new MiniMaxQuotaAdapter())
