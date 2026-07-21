import { describe, it, expect } from 'vitest'
import { isValidApiKey, isValidUrl, generateUUID } from '@/utils/validators'
import { ProviderType } from '@/types/apikey'

describe('isValidApiKey', () => {
  it('returns false for empty/undefined key', () => {
    expect(isValidApiKey('', ProviderType.OPENAI)).toBe(false)
    expect(isValidApiKey('', ProviderType.ANTHROPIC)).toBe(false)
  })

  describe('OpenAI', () => {
    it('accepts a valid OpenAI key', () => {
      expect(isValidApiKey('sk-' + 'a'.repeat(40), ProviderType.OPENAI)).toBe(true)
    })

    it('rejects key shorter than 20 chars', () => {
      expect(isValidApiKey('sk-short', ProviderType.OPENAI)).toBe(false)
    })

    it('rejects key not starting with sk-', () => {
      expect(isValidApiKey('pk-' + 'a'.repeat(40), ProviderType.OPENAI)).toBe(false)
    })
  })

  describe('Anthropic', () => {
    it('accepts a valid Anthropic key', () => {
      expect(isValidApiKey('sk-ant-' + 'a'.repeat(30), ProviderType.ANTHROPIC)).toBe(true)
    })

    it('rejects key not starting with sk-ant-', () => {
      expect(isValidApiKey('sk-' + 'a'.repeat(20), ProviderType.ANTHROPIC)).toBe(false)
    })
  })

  describe('DeepSeek', () => {
    it('accepts a valid DeepSeek key', () => {
      expect(isValidApiKey('sk-' + 'a'.repeat(40), ProviderType.DEEPSEEK)).toBe(true)
    })

    it('rejects key not starting with sk-', () => {
      expect(isValidApiKey('pk-' + 'a'.repeat(40), ProviderType.DEEPSEEK)).toBe(false)
    })
  })

  describe('Other providers', () => {
    it('accepts keys longer than 10 chars', () => {
      expect(isValidApiKey('a'.repeat(11), ProviderType.GOOGLE)).toBe(true)
      expect(isValidApiKey('a'.repeat(11), ProviderType.CUSTOM)).toBe(true)
    })

    it('rejects keys 10 chars or shorter', () => {
      expect(isValidApiKey('a'.repeat(10), ProviderType.GOOGLE)).toBe(false)
      expect(isValidApiKey('', ProviderType.CUSTOM)).toBe(false)
    })
  })
})

describe('isValidUrl', () => {
  it('accepts valid URLs', () => {
    expect(isValidUrl('https://api.openai.com')).toBe(true)
    expect(isValidUrl('http://localhost:11434')).toBe(true)
    expect(isValidUrl('https://api.anthropic.com/v1')).toBe(true)
  })

  it('rejects invalid URLs', () => {
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl('not-a-url')).toBe(false)
    expect(isValidUrl('  ')).toBe(false)
  })
})

describe('generateUUID', () => {
  it('returns a UUID string', () => {
    const uuid = generateUUID()
    expect(uuid).toBeTruthy()
    expect(typeof uuid).toBe('string')
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('returns different UUIDs on each call', () => {
    const u1 = generateUUID()
    const u2 = generateUUID()
    expect(u1).not.toBe(u2)
  })
})
