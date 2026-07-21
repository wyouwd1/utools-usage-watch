<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
const barColorClass = computed(() => {
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

// Short label for compact display (e.g. "滚动" for "滚动窗口 (5h)")
const shortLabel = computed(() => {
  if (!props.label) return ''
  // Extract the short form from zh-CN labels like "滚动窗口 (5h)" → "5h"
  // Or use the first 2 chars for Chinese labels
  const m = props.label.match(/\(([^)]+)\)/)
  if (m) return m[1]
  // Fallback: first word
  return props.label.split(' ')[0]
})
</script>

<template>
  <!-- Compact mode: cc-hud style one-liner: "5h:13% (2.6h) [bar]" -->
  <div v-if="compact" class="flex items-center gap-2 text-xs">
    <span class="text-gray-500 font-medium w-8 shrink-0">{{ shortLabel }}:</span>
    <span v-if="clamped !== null" :class="['font-semibold w-10 shrink-0', textColorClass]">
      {{ clamped }}%
    </span>
    <span v-else class="text-gray-300 w-10 shrink-0">--%</span>
    <span v-if="countdown" class="text-gray-400 w-14 shrink-0">({{ countdown }})</span>
    <span v-else class="text-gray-200 w-14 shrink-0">(--)</span>
    <!-- Mini progress bar (40px wide) -->
    <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
      <div
        v-if="clamped !== null"
        :class="['h-full rounded-full transition-all duration-500', barColorClass]"
        :style="{ width: clamped + '%' }"
      />
    </div>
  </div>

  <!-- Full mode: label + % + bar + countdown -->
  <div v-else class="p-3">
    <div class="flex justify-between mb-1.5">
      <span class="text-xs font-medium text-gray-600 truncate">{{ label }}</span>
      <span v-if="clamped !== null" :class="['text-xs font-semibold', textColorClass]">
        {{ clamped }}%
      </span>
    </div>
    <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        v-if="clamped !== null"
        :class="['h-full rounded-full transition-all duration-500', barColorClass]"
        :style="{ width: clamped + '%' }"
      />
      <div v-else class="h-full rounded-full bg-gray-200 animate-pulse" style="width: 100%" />
    </div>
    <div v-if="countdown" class="text-xs text-gray-400 mt-1">
      {{ t('quota.resetsInTime', { time: countdown }) }}
    </div>
  </div>
</template>
