<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { useI18n } from 'vue-i18n'
import type { IQuotaHistoryEntry } from '@/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const { t } = useI18n()

const props = defineProps<{
  history: IQuotaHistoryEntry[]
  label?: string
}>()

const hasData = computed(() => props.history.length > 0)

const chartData = computed(() => {
  if (!hasData.value) return { labels: [], datasets: [] }

  // Show last 50 entries max
  const entries = props.history.slice(-50)
  return {
    labels: entries.map(e => {
      const d = new Date(e.recordedAt)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }),
    datasets: [
      {
        label: props.label ?? t('quota.percent'),
        data: entries.map(e => e.usedPercent),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.parsed.y}%`,
      },
    },
  },
  scales: {
    x: {
      display: true,
      grid: { display: false },
      ticks: { maxTicksLimit: 8, font: { size: 10 } },
    },
    y: {
      display: true,
      min: 0,
      max: 100,
      grid: { color: '#f3f4f6' },
      ticks: {
        font: { size: 10 },
        callback: (v: any) => `${v}%`,
      },
    },
  },
}))
</script>

<template>
  <div class="w-full h-48">
    <div v-if="hasData" class="w-full h-full">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">
      {{ t('common.noData') }}
    </div>
  </div>
</template>
