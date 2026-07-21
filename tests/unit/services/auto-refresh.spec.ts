import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { autoRefreshScheduler } from '@/services/auto-refresh'

// Hoisted shared mocks so vi.mock factories can reference them
const { mockUpdateSource, mockRefreshAll, mockSourceListRef } = vi.hoisted(() => {
  const mockUpdateSource = vi.fn()
  const mockRefreshAll = vi.fn()
  const mockSourceListRef = { value: [] as any[] }
  return { mockUpdateSource, mockRefreshAll, mockSourceListRef }
})

vi.mock('@/services/quota-checker', () => ({
  refreshAll: mockRefreshAll,
}))

vi.mock('@/stores/quotaSources', () => ({
  useQuotaSourcesStore: () => ({
    get sourceList() {
      return mockSourceListRef.value
    },
    updateSource: mockUpdateSource,
  }),
}))

vi.mock('@/stores/quotas', () => ({
  useQuotasStore: () => ({
    lastRefreshAt: null,
  }),
}))

function makeSource(overrides: Partial<any> = {}) {
  return {
    _id: 'quota-source/test-1',
    _rev: undefined,
    type: 'quota-source',
    sourceType: 'opencode-go',
    label: 'Test',
    encryptedCredential: 'mock-credential',
    credentialHint: 'mock-...cred',
    enabled: true,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('auto-refresh failure tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUpdateSource.mockClear()
    mockRefreshAll.mockClear()
    mockSourceListRef.value = []
  })

  afterEach(() => {
    vi.useRealTimers()
    autoRefreshScheduler.stop()
  })

  it('should disable source after 3 consecutive failures', async () => {
    mockSourceListRef.value = [
      makeSource({ lastCheckSucceeded: false }),
    ]

    autoRefreshScheduler.start(1) // 1-minute interval

    // Run 3 cycles (initial + 2 intervals → failureCount=3 → disable on 3rd interval)
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(60 * 1000)
    }

    expect(mockUpdateSource).toHaveBeenCalledWith('test-1', { enabled: false })
  })

  it('should reset failure count on success', async () => {
    // Track how many times refreshAll has been called
    let callCount = 0
    mockRefreshAll.mockImplementation(() => {
      callCount++
      // After 2 failures, make the source succeed on subsequent reads
      if (callCount >= 3) {
        mockSourceListRef.value = [
          makeSource({ lastCheckSucceeded: true }),
        ]
      }
    })

    mockSourceListRef.value = [
      makeSource({ lastCheckSucceeded: false }),
    ]

    autoRefreshScheduler.start(1)

    // Run 3 cycles
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(60 * 1000)
    }

    // Should NOT have disabled because success reset the counter
    expect(mockUpdateSource).not.toHaveBeenCalled()
  })
})
