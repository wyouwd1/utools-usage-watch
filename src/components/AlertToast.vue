<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  message: string
  type: 'warning' | 'danger' | 'info'
  duration?: number
}>(), {
  duration: 5000,
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

const bgClass: Record<string, string> = {
  danger: 'bg-red-600',
  warning: 'bg-yellow-500',
  info: 'bg-blue-600',
}

const iconMap: Record<string, string> = {
  danger: '\u26A0\uFE0F',
  warning: '\u26A0\uFE0F',
  info: '\u2139\uFE0F',
}

onMounted(() => {
  // Trigger enter transition on next frame
  requestAnimationFrame(() => {
    visible.value = true
  })
  timer = setTimeout(() => {
    dismiss()
  }, props.duration)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

function dismiss() {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 300) // match transition duration
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-6 right-6 z-[9999] transition-all duration-300 ease-in-out"
      :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
    >
      <div
        :class="[
          'flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm max-w-sm',
          bgClass[type],
        ]"
      >
        <span class="text-base shrink-0">{{ iconMap[type] }}</span>
        <span class="flex-1">{{ message }}</span>
        <button
          @click="dismiss"
          class="shrink-0 text-white/80 hover:text-white text-lg leading-none transition-colors"
        >
          &times;
        </button>
      </div>
    </div>
  </Teleport>
</template>
