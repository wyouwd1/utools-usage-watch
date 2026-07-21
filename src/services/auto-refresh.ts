import { refreshAll } from './quota-checker'
import { useQuotasStore } from '@/stores/quotas'

/**
 * Singleton scheduler that periodically refreshes quota data for all sources.
 * Pauses when the browser tab is hidden (document.visibilitychange) to conserve resources.
 * After each refresh cycle, updates the lastRefreshAt timestamp.
 * (Alert notifications will be re-added in a future enhancement.)
 */
class AutoRefreshScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private intervalMs = 15 * 60 * 1000 // default 15 minutes
  private isPaused = false

  /**
   * Start the auto-refresh scheduler.
   * @param intervalMinutes Refresh interval in minutes (default 15)
   */
  start(intervalMinutes: number = 15): void {
    this.stop()
    this.intervalMs = intervalMinutes * 60 * 1000

    // Run an initial refresh
    refreshAll().then(() => this.syncLastRefreshAt())

    // Set up periodic refresh
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        refreshAll().then(() => this.syncLastRefreshAt())
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
