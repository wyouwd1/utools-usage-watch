<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  usedPercent: number | null
  label: string
  resetsAt?: number | null
  compact?: boolean
}>()

const clamped = computed(() => {
  if (props.usedPercent === null) return null
  return Math.max(0, Math.min(100, Math.round(props.usedPercent)))
})

// cc-hud color scheme: green ≤50, yellow ≤70, peach ≤85, red >85
const colorClass = computed(() => {
  if (clamped.value === null) return 'bg-gray-200'
  if (clamped.value > 85) return 'bg-red-500'
  if (clamped.value > 70) return 'bg-orange-400'
  if (clamped.value > 50) return 'bg-yellow-400'
  return 'bg-green-500'
})

const textColorClass = computed(() => {
  if (clamped.value === null) return 'text-gray-400'
  if (clamped.value > 85) return 'text-red-600'
  if (clamped.value > 70) return 'text-orange-500'
  if (clamped.value > 50) return 'text-yellow-600'
  return 'text-green-600'
})

const countdown = computed(() => {
  if (!props.resetsAt) return null
  const ms = props.resetsAt - Date.now()
  if (ms <= 0) return null
  const h = ms / 3600000
  if (h >= 24) return `${Math.round(h / 24)}d`
  if (h >= 1) return `${Math.round(h)}h`
  return `${Math.round(ms / 60000)}m`
})
</script>

<template>
  <div :class="compact ? 'flex items-center gap-2' : 'p-3'">
    <div v-if="!compact" class="flex justify-between mb-1.5">
      <span class="text-xs font-medium text-gray-600 truncate">{{ label }}</span>
      <span v-if="clamped !== null" :class="['text-xs font-semibold', textColorClass]">
        {{ clamped }}%
      </span>
    </div>
    <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        v-if="clamped !== null"
        :class="['h-full rounded-full transition-all duration-500', colorClass]"
        :style="{ width: clamped + '%' }"
      />
      <div v-else class="h-full rounded-full bg-gray-200 animate-pulse" style="width: 100%" />
    </div>
    <div v-if="!compact && countdown" class="text-xs text-gray-400 mt-1">
      {{ countdown }} 后重置 / resets in {{ countdown }}
    </div>
  </div>
</template>
