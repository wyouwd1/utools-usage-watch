<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">{{ t('dashboard.title') }}</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">{{ t('dashboard.totalKeys') }}</p>
        <p class="text-3xl font-bold text-gray-800 mt-1">0</p>
      </div>
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">{{ t('dashboard.activeKeys') }}</p>
        <p class="text-3xl font-bold text-green-600 mt-1">0</p>
      </div>
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">{{ t('dashboard.alertKeys') }}</p>
        <p class="text-3xl font-bold text-red-500 mt-1">0</p>
      </div>
    </div>
    <p class="text-gray-400 text-center py-12">{{ t('common.noData') }}</p>
  </div>
</template>
