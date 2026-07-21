<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const id = route.params.id as string
</script>

<template>
  <div class="p-6">
    <button @click="router.push('/quota')" class="text-sm text-gray-500 hover:text-gray-700 mb-4">
      ← {{ t('common.back') }}
    </button>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">{{ t('quota.title') }}</h1>
    <p class="text-gray-400 text-center py-12">{{ t('common.loading') }}</p>
  </div>
</template>
