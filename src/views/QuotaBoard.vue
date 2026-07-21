<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('quota.title') }}</h1>
      <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        {{ t('quota.refreshNow') }}
      </button>
    </div>
    <p class="text-gray-400 text-center py-12">{{ t('quota.noData') }}</p>
  </div>
</template>
