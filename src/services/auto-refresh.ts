import { refreshAll } from './quota-checker'

/**
 * Singleton scheduler that periodically refreshes quota data for all API keys.
 * Pauses when the browser tab is hidden (document.visibilitychange) to conserve resources.
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
    refreshAll()

    // Set up periodic refresh
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        refreshAll()
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

  private handleVisibilityChange = (): void => {
    this.isPaused = document.hidden
  }
}

/** Singleton instance */
export const autoRefreshScheduler = new AutoRefreshScheduler()
