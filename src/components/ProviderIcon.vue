<script setup lang="ts">
import { computed } from 'vue'
import { useProvidersStore } from '@/stores/providers'
import { ProviderType } from '@/types'

const props = defineProps<{
  provider: ProviderType
  size?: 'sm' | 'md' | 'lg'
}>()

const store = useProvidersStore()
const info = computed(() => store.getProvider(props.provider))
const sizeClass = computed(() => {
  const map = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }
  return map[props.size ?? 'md']
})
</script>

<template>
  <span :class="sizeClass" :title="info?.label">{{ info?.icon ?? '🔌' }}</span>
</template>
