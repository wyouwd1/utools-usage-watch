import { refreshAll } from './quota-checker'
import { useQuotasStore } from '@/stores/quotas'
import { useApiKeysStore } from '@/stores/apiKeys'

/**
 * Singleton scheduler that periodically refreshes quota data for all API keys.
 * Pauses when the browser tab is hidden (document.visibilitychange) to conserve resources.
 * After each refresh cycle, checks all quota entries against their alert thresholds
 * and triggers notifications for any that exceed the threshold.
 */
class AutoRefreshScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private intervalMs = 15 * 60 * 1000 // default 15 minutes
  private isPaused = false

  /**
   * Tracks alerted keys to avoid duplicate notifications.
   * Key format: `${apiKeyId}:${threshold}` so threshold changes re-trigger alerts.
   * Value: timestamp of last alert. Alerts are not repeated within 24 hours.
   */
  private alertedKeys = new Map<string, number>()

  private readonly ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Start the auto-refresh scheduler.
   * @param intervalMinutes Refresh interval in minutes (default 15)
   */
  start(intervalMinutes: number = 15): void {
    this.stop()
    this.intervalMs = intervalMinutes * 60 * 1000

    // Run an initial refresh
    refreshAll().then(() => this.checkAlerts())

    // Set up periodic refresh
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        refreshAll().then(() => this.checkAlerts())
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
   * Reset the alert tracking state (e.g., when data is re-imported).
   */
  resetAlertState(): void {
    this.alertedKeys.clear()
  }

  /**
   * After a refresh cycle, check all quota entries against thresholds and alert if exceeded.
   */
  private checkAlerts(): void {
    const quotasStore = useQuotasStore()
    const apiKeysStore = useApiKeysStore()
    const apiKeyList = apiKeysStore.apiKeyList

    for (const entry of quotasStore.lowestQuotas) {
      const apiKey = apiKeyList.find(k => k._id === `apikey/${entry.apiKeyId}`)
      if (!apiKey) continue

      const threshold = 20 // TODO: Phase 5 — move to quota source config
      if (entry.maxPercent <= threshold) continue

      // Check cooldown: same alert not repeated within 24 hours
      const alertKey = `${entry.apiKeyId}:${threshold}`
      const lastAlerted = this.alertedKeys.get(alertKey)
      if (lastAlerted && Date.now() - lastAlerted < this.ALERT_COOLDOWN_MS) continue

      // Mark as alerted
      this.alertedKeys.set(alertKey, Date.now())

      // Clean up old entries periodically
      if (this.alertedKeys.size > 100) {
        this.pruneAlertedKeys()
      }

      // Trigger notification
      const message = `[${apiKey.label}] Usage at ${Math.round(entry.maxPercent)}% (threshold: ${threshold}%)`
      this.showNotification('Quota Alert', message)
    }
  }

  /**
   * Show a notification, falling back to console.log when not in uTools environment.
   */
  private showNotification(title: string, message: string): void {
    const utools = (window as any).utools
    if (utools?.showNotification) {
      utools.showNotification(`${title}: ${message}`)
    } else {
      // Fallback for development / non-uTools environments
      console.log(`[${title}] ${message}`)
    }
  }

  /**
   * Remove stale entries from the alerted keys map.
   */
  private pruneAlertedKeys(): void {
    const cutoff = Date.now() - this.ALERT_COOLDOWN_MS
    for (const [key, timestamp] of this.alertedKeys) {
      if (timestamp < cutoff) {
        this.alertedKeys.delete(key)
      }
    }
  }

  private handleVisibilityChange = (): void => {
    this.isPaused = document.hidden
  }
}

/** Singleton instance */
export const autoRefreshScheduler = new AutoRefreshScheduler()
