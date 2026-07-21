<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()

// Sync locale from settings store on mount
if (settingsStore.loaded) {
  locale.value = settingsStore.settings.language
} else {
  settingsStore.load()
  if (settingsStore.loaded) {
    locale.value = settingsStore.settings.language
  }
}
// Also run migration to ensure defaults
settingsStore.migrate()

const toggleLang = () => {
  const newLang = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  locale.value = newLang
  settingsStore.save('language', newLang)
}

const navItems = computed(() => [
  { path: '/', label: t('nav.dashboard'), icon: '📊' },
  { path: '/api-keys', label: t('nav.apiKeys'), icon: '🔑' },
  { path: '/quota', label: t('nav.quota'), icon: '📈' },
  { path: '/settings', label: t('nav.settings'), icon: '⚙️' },
])

const isActive = (path: string) => route.path === path
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- 侧边导航 -->
    <aside class="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-100">
        <h1 class="text-base font-bold text-gray-800 truncate">AI Usage Watch <span class="text-xs font-normal text-gray-400">— {{ t('app.subtitle') }}</span></h1>
      </div>

      <nav class="flex-1 p-3 space-y-1">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="router.push(item.path)"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
          :class="isActive(item.path)
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'"
        >
          <span>{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <!-- 底部语言切换 -->
      <div class="p-3 border-t border-gray-100">
        <button
          @click="toggleLang"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span>{{ locale === 'zh-CN' ? '🌐' : '🌏' }}</span>
          <span>{{ locale === 'zh-CN' ? 'English' : '中文' }}</span>
        </button>
      </div>
    </aside>

    <!-- 内容区 -->
    <main class="flex-1 overflow-auto">
      <router-view />
    </main>
  </div>
</template>
