import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IAppSettings } from '@/types'
import * as settingsRepo from '@/db/settings.repo'

const DEFAULT_SETTINGS: IAppSettings = {
  language: 'zh-CN',
  refreshInterval: 15,
  defaultAlertThreshold: 20,
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<IAppSettings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)

  function load(): void {
    try {
      const stored = settingsRepo.getAll()
      if (stored.language) settings.value.language = stored.language
      if (stored.refreshInterval) settings.value.refreshInterval = stored.refreshInterval
      if (stored.defaultAlertThreshold != null) settings.value.defaultAlertThreshold = stored.defaultAlertThreshold
      loaded.value = true
    } catch {
      settings.value = { ...DEFAULT_SETTINGS }
      loaded.value = true
    }
  }

  function save<K extends keyof IAppSettings>(key: K, value: IAppSettings[K]): void {
    settings.value[key] = value
    try {
      settingsRepo.set(key, value)
    } catch { /* silently fail */ }
  }

  function reset(): void {
    settings.value = { ...DEFAULT_SETTINGS }
    try {
      settingsRepo.set('language', DEFAULT_SETTINGS.language)
      settingsRepo.set('refreshInterval', DEFAULT_SETTINGS.refreshInterval)
      settingsRepo.set('defaultAlertThreshold', DEFAULT_SETTINGS.defaultAlertThreshold)
    } catch { /* silently fail */ }
  }

  return { settings, loaded, load, save, reset }
})
