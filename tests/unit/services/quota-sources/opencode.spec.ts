import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenCodeAdapter } from '@/services/quota-sources/opencode'

describe('OpenCodeAdapter', () => {
  let adapter: OpenCodeAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new OpenCodeAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('checkQuota', () => {
    const MOCK_HTML = `
      <html>
      <script>
        rollingUsage:$R[30]={status:"ok",resetInSec:5647,usagePercent:7}
        weeklyUsage:$R[31]={status:"ok",resetInSec:245174,usagePercent:25}
        monthlyUsage:$R[32]={status:"ok",resetInSec:597495,usagePercent:98}
      </script>
      </html>
    `

    it('should parse HTML quota response correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => MOCK_HTML,
      })

      const result = await adapter.checkQuota('test-auth-cookie', { workspaceId: 'wrk_test' })
      expect(result).not.toBeNull()
      expect(result!.rolling).not.toBeNull()
      expect(result!.weekly).not.toBeNull()
      expect(result!.monthly).not.toBeNull()
      expect(result!.rolling!.usedPercent).toBe(7)
      expect(result!.weekly!.usedPercent).toBe(25)
      expect(result!.monthly!.usedPercent).toBe(98)
      expect(result!.rolling!.resetsAt).toBeGreaterThan(Date.now())
      expect(result!.weekly!.resetsAt).toBeGreaterThan(Date.now())
      expect(result!.monthly!.resetsAt).toBeGreaterThan(Date.now())
    })

    it('should return null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      const result = await adapter.checkQuota('test-auth-cookie')
      expect(result).toBeNull()
    })

    it('should return null when HTML cannot be parsed', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html>no usage data</html>',
      })

      const result = await adapter.checkQuota('test-auth-cookie')
      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const result = await adapter.checkQuota('test-auth-cookie')
      expect(result).toBeNull()
    })
  })
})
