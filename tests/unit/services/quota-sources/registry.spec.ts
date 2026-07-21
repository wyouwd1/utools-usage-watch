import { describe, it, expect } from 'vitest'
import { quotaSourceRegistry } from '@/services/quota-sources/registry'
import { QuotaSourceType } from '@/types'

describe('QuotaSourceRegistry', () => {
  it('should have all built-in adapters registered', () => {
    const adapters = quotaSourceRegistry.getAll()
    const types = adapters.map(a => a.sourceType)
    expect(types).toContain(QuotaSourceType.OPENCODE_GO)
    expect(types).toContain(QuotaSourceType.BAILIAN)
    expect(types).toContain(QuotaSourceType.DEEPSEEK)
    expect(types).toContain(QuotaSourceType.MOONSHOT)
    expect(types).toContain(QuotaSourceType.GROQ)
    expect(types).toContain(QuotaSourceType.QWEN)
    expect(types).toContain(QuotaSourceType.GLM)
    expect(types).toContain(QuotaSourceType.MINIMAX)
  })

  it('should return the correct adapter by type', () => {
    const adapter = quotaSourceRegistry.get(QuotaSourceType.DEEPSEEK)
    expect(adapter).toBeDefined()
    expect(adapter!.sourceType).toBe(QuotaSourceType.DEEPSEEK)
    expect(adapter!.label).toBe('DeepSeek (Balance)')
  })

  it('should return undefined for unknown type', () => {
    const adapter = quotaSourceRegistry.get('unknown' as QuotaSourceType)
    expect(adapter).toBeUndefined()
  })

  it('should return all adapters with correct properties', () => {
    const adapters = quotaSourceRegistry.getAll()
    expect(adapters.length).toBe(8)
    for (const a of adapters) {
      expect(a.sourceType).toBeDefined()
      expect(a.label).toBeDefined()
      expect(typeof a.checkQuota).toBe('function')
    }
  })
})
