import { useQuotasStore } from '@/stores/quotas'

/**
 * Singleton scheduler that periodically refreshes quota data for all sources.
 * Pauses when the browser tab is hidden (document.visibilitychange) to conserve resources.
 * After each refresh cycle, updates the lastRefreshAt timestamp.
 * Tracks consecutive failures per source and auto-disables a source after MAX_FAILURES (3).
 * (Alert notifications will be re-added in a future enhancement.)
 */
class AutoRefreshScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private intervalMs = 15 * 60 * 1000 // default 15 minutes
  private isPaused = false
  private failureCount = new Map<string, number>()
  private readonly MAX_FAILURES = 3

  /**
   * Start the auto-refresh scheduler.
   * @param intervalMinutes Refresh interval in minutes (default 15)
   */
  start(intervalMinutes: number = 15): void {
    this.stop()
    this.intervalMs = intervalMinutes * 60 * 1000
    this.failureCount.clear()

    // Run an initial refresh with failure tracking
    this.refreshAndTrack()

    // Set up periodic refresh
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        this.refreshAndTrack()
      }
    }, this.intervalMs)

    // Pause when page is hidden
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * Stop the auto-refresh scheduler and clean up.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.isPaused = false
    this.failureCount.clear()
  }

  /**
   * Refresh all sources and track consecutive failures per source.
   * Auto-disables a source after MAX_FAILURES consecutive failures.
   */
  private async refreshAndTrack(): Promise<void> {
    const { refreshAll } = await import('./quota-checker')
    const { useQuotaSourcesStore } = await import('@/stores/quotaSources')

    await refreshAll()

    // Check results and track failures
    const sourcesStore = useQuotaSourcesStore()
    for (const source of sourcesStore.sourceList) {
      if (!source.enabled) continue

      const sourceId = source._id.replace('quota-source/', '')

      if (source.lastCheckSucceeded === false) {
        // Increment failure count
        const count = (this.failureCount.get(sourceId) || 0) + 1
        this.failureCount.set(sourceId, count)

        if (count >= this.MAX_FAILURES) {
          console.log(`[AutoRefresh] Disabling ${source.label} after ${count} consecutive failures`)
          await sourcesStore.updateSource(sourceId, { enabled: false })
          this.failureCount.delete(sourceId)
        }
      } else if (source.lastCheckSucceeded === true) {
        // Success: reset failure count
        this.failureCount.delete(sourceId)
      }
    }

    this.syncLastRefreshAt()
  }

  /**
   * Sync the lastRefreshAt timestamp after a refresh cycle.
   */
  private syncLastRefreshAt(): void {
    const quotasStore = useQuotasStore()
    quotasStore.lastRefreshAt = Date.now()
  }

  private handleVisibilityChange = (): void => {
    this.isPaused = document.hidden
  }
}

/** Singleton instance */
export const autoRefreshScheduler = new AutoRefreshScheduler()
