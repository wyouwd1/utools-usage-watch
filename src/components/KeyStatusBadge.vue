<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { KeyStatus } from '@/types'

const props = defineProps<{
  status: KeyStatus
}>()

const { t } = useI18n()

const statusConfig = computed(() => {
  const map: Record<KeyStatus, { color: string; bg: string; dot: string }> = {
    [KeyStatus.ACTIVE]: { color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
    [KeyStatus.INACTIVE]: { color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
    [KeyStatus.EXPIRED]: { color: 'text-yellow-700', bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
    [KeyStatus.ERROR]: { color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
    [KeyStatus.UNTESTED]: { color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-400' },
  }
  return map[props.status]
})
</script>

<template>
  <span
    :class="['inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', statusConfig.color, statusConfig.bg]"
  >
    <span :class="['w-1.5 h-1.5 rounded-full', statusConfig.dot]" />
    {{ t(`keyStatus.${status}`) }}
  </span>
</template>
