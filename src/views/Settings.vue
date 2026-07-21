<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">{{ t('settings.title') }}</h1>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6 max-w-lg">
      <div>
        <p class="text-sm font-medium text-gray-700 mb-2">{{ t('settings.language') }}</p>
        <select class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </div>
    </div>
  </div>
</template>
