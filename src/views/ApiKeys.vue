<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('apiKeys.title') }}</h1>
      <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        + {{ t('apiKeys.addKey') }}
      </button>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <p class="text-gray-400">{{ t('common.noData') }}</p>
      <p class="text-sm text-gray-300 mt-2">{{ t('common.add') }} API Key</p>
    </div>
  </div>
</template>
