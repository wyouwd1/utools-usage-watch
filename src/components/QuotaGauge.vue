<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  usedPercent: number | null
  label: string
  resetsAt?: number | null
  compact?: boolean
  hideBar?: boolean
}>()

const clamped = computed(() => {
  if (props.usedPercent === null) return null
  return Math.max(0, Math.min(100, Math.round(props.usedPercent * 10) / 10))
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
  if (h >= 24) return `${(h / 24).toFixed(1)}d`
  if (h >= 1) return `${Math.round(h)}h`
  return `${Math.round(ms / 60000)}m`
})

// Short label for compact display
// zh-CN: "滚动窗口 (5h)" → "5h", "每周窗口 (7d)" → "7d", "每月窗口" → "月"
const shortLabel = computed(() => {
  if (!props.label) return ''
  // Extract the short form from parenthesized part: "滚动窗口 (5h)" → "5h"
  const m = props.label.match(/\(([^)]+)\)/)
  if (m) return m[1]
  // Fallback: for Chinese labels like "每月窗口", take the first char after the prefix
  if (/^每/.test(props.label)) return props.label.replace(/^每(.+)窗口$/, '$1')
  // Last resort: first word
  return props.label.split(/\s+/)[0]
})
</script>

<template>
  <!-- Text-only: "5h:20% (56m)" — no bar, for single-line cc-hud display -->
  <span v-if="compact && hideBar" class="inline-flex items-baseline gap-0 text-xs">
    <span class="text-gray-500 font-medium shrink-0">{{ shortLabel }}:</span>
    <span v-if="clamped !== null" :class="['font-semibold shrink-0', textColorClass]">{{ clamped }}%</span>
    <span v-else class="text-gray-300 shrink-0">--%</span>
    <span v-if="countdown" class="text-gray-400 shrink-0">({{ countdown }})</span>
    <span v-else class="text-gray-200 shrink-0">(--)</span>
  </span>

  <!-- Compact mode: "5h:13% (2.6h) [bar]" -->
  <div v-else-if="compact" class="flex items-center gap-1.5 text-xs">
    <span class="text-gray-500 font-medium min-w-[1.5rem] text-right">{{ shortLabel }}:</span>
    <span v-if="clamped !== null" :class="['font-semibold w-9 text-right shrink-0', textColorClass]">
      {{ clamped }}%
    </span>
    <span v-else class="text-gray-300 w-9 text-right shrink-0">--%</span>
    <span v-if="countdown" class="text-gray-400 min-w-[3rem] shrink-0">({{ countdown }})</span>
    <span v-else class="text-gray-200 min-w-[3rem] shrink-0">(--)</span>
    <!-- Mini progress bar -->
    <div class="flex-1 h-1.5 bg-gray-100/80 rounded-full overflow-hidden min-w-[32px]">
      <div
        v-if="clamped !== null"
        :class="['h-full rounded-full transition-all duration-700 ease-out', barColorClass]"
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
