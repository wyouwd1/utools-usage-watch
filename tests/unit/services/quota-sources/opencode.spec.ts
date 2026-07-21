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
    const MOCK_JS_HTML = `
      <html>
      <script>
        rollingUsage:$R[30]={status:"ok",resetInSec:5647,usagePercent:7}
        weeklyUsage:$R[31]={status:"ok",resetInSec:245174,usagePercent:25}
        monthlyUsage:$R[32]={status:"ok",resetInSec:597495,usagePercent:98}
      </script>
      </html>
    `

    const MOCK_DOM_HTML = `
      <html>
      <body>
        <div data-slot="usage">
          <div data-slot="usage-item">
            <div data-slot="usage-header">
              <span data-slot="usage-label">滚动用量</span>
              <span data-slot="usage-value">12%</span>
            </div>
            <div data-slot="progress">
              <div data-slot="progress-bar" style="width:12%"></div>
            </div>
            <span data-slot="reset-time">重置于 2 小时 57 分钟</span>
          </div>
          <div data-slot="usage-item">
            <div data-slot="usage-header">
              <span data-slot="usage-label">每周用量</span>
              <span data-slot="usage-value">23%</span>
            </div>
            <div data-slot="progress">
              <div data-slot="progress-bar" style="width:23%"></div>
            </div>
            <span data-slot="reset-time">重置于 5 天 16 小时</span>
          </div>
          <div data-slot="usage-item">
            <div data-slot="usage-header">
              <span data-slot="usage-label">每月用量</span>
              <span data-slot="usage-value">56%</span>
            </div>
            <div data-slot="progress">
              <div data-slot="progress-bar" style="width:56%"></div>
            </div>
            <span data-slot="reset-time">重置于 22 天 17 小时</span>
          </div>
        </div>
      </body>
      </html>
    `

    // Simulates the streaming framework markers used in the real page
    const MOCK_STREAM_HTML = `
      <html>
      <body>
        <div data-slot="usage">
          <div data-slot="usage-item">
            <div data-slot="usage-header">
              <span data-slot="usage-label"><!--$-->滚动用量<!--/--></span>
              <span data-slot="usage-value"><!--$-->12<!--/-->%</span>
            </div>
            <div data-slot="progress"><div data-slot="progress-bar" style="width:12%"></div></div>
            <span data-slot="reset-time"><!--$-->重置于<!--/--> <!--$-->2 小时 57 分钟<!--/--></span>
          </div>
          <div data-slot="usage-item">
            <div data-slot="usage-header">
              <span data-slot="usage-label"><!--$-->每周用量<!--/--></span>
              <span data-slot="usage-value"><!--$-->23<!--/-->%</span>
            </div>
            <div data-slot="progress"><div data-slot="progress-bar" style="width:23%"></div></div>
            <span data-slot="reset-time"><!--$-->重置于<!--/--> <!--$-->5 天 16 小时<!--/--></span>
          </div>
          <div data-slot="usage-item">
            <div data-slot="usage-header">
              <span data-slot="usage-label"><!--$-->每月用量<!--/--></span>
              <span data-slot="usage-value"><!--$-->56<!--/-->%</span>
            </div>
            <div data-slot="progress"><div data-slot="progress-bar" style="width:56%"></div></div>
            <span data-slot="reset-time"><!--$-->重置于<!--/--> <!--$-->22 天 17 小时<!--/--></span>
          </div>
        </div>
      </body>
      </html>
    `

    it('should parse JS-assignment HTML correctly (legacy)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => MOCK_JS_HTML,
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

    it('should parse DOM-based HTML correctly (current)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => MOCK_DOM_HTML,
      })

      const result = await adapter.checkQuota('test-auth-cookie', { workspaceId: 'wrk_test' })
      expect(result).not.toBeNull()
      expect(result!.rolling!.usedPercent).toBe(12)
      expect(result!.weekly!.usedPercent).toBe(23)
      expect(result!.monthly!.usedPercent).toBe(56)
      // Reset time: 2h57m = 10620s
      expect(result!.rolling!.resetsAt).toBeGreaterThan(Date.now() + 10000 * 1000)
      expect(result!.rolling!.resetsAt).toBeLessThan(Date.now() + 11000 * 1000)
      // Reset time: 5d16h = 489600s
      expect(result!.weekly!.resetsAt).toBeGreaterThan(Date.now() + 485000 * 1000)
      expect(result!.weekly!.resetsAt).toBeLessThan(Date.now() + 495000 * 1000)
    })

    it('should parse DOM-based HTML with streaming markers (real page)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => MOCK_STREAM_HTML,
      })

      const result = await adapter.checkQuota('test-auth-cookie', { workspaceId: 'wrk_test' })
      expect(result).not.toBeNull()
      expect(result!.rolling!.usedPercent).toBe(12)
      expect(result!.weekly!.usedPercent).toBe(23)
      expect(result!.monthly!.usedPercent).toBe(56)
      // Reset time: 2h57m = 10620s
      expect(result!.rolling!.resetsAt).toBeGreaterThan(Date.now() + 10000 * 1000)
      expect(result!.rolling!.resetsAt).toBeLessThan(Date.now() + 11000 * 1000)
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
