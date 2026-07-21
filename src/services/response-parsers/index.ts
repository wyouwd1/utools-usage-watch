import type { IQuotaWindows, QuotaSourceType } from '@/types/quota'
import { parseOpenCodeHtml } from './opencode'
import { parseBailianResponse } from './bailian'
import { parseDeepSeekResponse } from './deepseek'
import { parseMoonshotResponse } from './moonshot'
import { parseGroqResponse } from './groq'
import { parseQwenResponse } from './qwen'
import { parseGlmResponse } from './glm'
import { parseMiniMaxResponse } from './minimax'

/**
 * Registry mapping each source type to its response body parser.
 * Each parser takes the raw response body string and returns quota windows or null.
 */
export const responseParsers: Record<string, (body: string) => IQuotaWindows | null> = {
  'opencode-go': parseOpenCodeHtml,
  'bailian': parseBailianResponse,
  'deepseek': parseDeepSeekResponse,
  'moonshot': parseMoonshotResponse,
  'groq': parseGroqResponse,
  'qwen': parseQwenResponse,
  'glm': parseGlmResponse,
  'minimax': parseMiniMaxResponse,
}
