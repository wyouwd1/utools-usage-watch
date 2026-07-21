<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const model = defineModel<string>()

const emit = defineEmits<{
  search: [query: string]
}>()

let timer: ReturnType<typeof setTimeout> | null = null

function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    model.value = value
    emit('search', value)
  }, 300)
}
</script>

<template>
  <div class="relative">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
    <input
      type="text"
      :placeholder="t('common.search')"
      class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      @input="onInput"
    />
  </div>
</template>
