<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useApiKeysStore } from '@/stores/apiKeys'
import { useProvidersStore } from '@/stores/providers'
import type { IApiKeyEntity, ProviderType } from '@/types'
import ProviderIcon from '@/components/ProviderIcon.vue'
import KeyStatusBadge from '@/components/KeyStatusBadge.vue'
import SearchInput from '@/components/SearchInput.vue'
import AddKeyDialog from '@/components/AddKeyDialog.vue'
import TestConnection from '@/components/TestConnection.vue'

const { t } = useI18n()
const router = useRouter()
const apiKeysStore = useApiKeysStore()
const providersStore = useProvidersStore()

const showAddDialog = ref(false)
const searchQuery = ref('')
const deleteConfirmId = ref<string | null>(null)

onMounted(() => {
  apiKeysStore.fetchAll()
})

const filteredKeys = computed(() => {
  const keys = searchQuery.value
    ? apiKeysStore.searchKeys(searchQuery.value)
    : apiKeysStore.apiKeyList
  return keys
})

const groupedKeys = computed(() => {
  const groups = new Map<ProviderType, IApiKeyEntity[]>()
  for (const key of filteredKeys.value) {
    const list = groups.get(key.provider) ?? []
    list.push(key)
    groups.set(key.provider, list)
  }
  // Sort groups by provider label
  const sorted = Array.from(groups.entries()).sort((a, b) => {
    const infoA = providersStore.getProvider(a[0])
    const infoB = providersStore.getProvider(b[0])
    return (infoA?.label ?? a[0]).localeCompare(infoB?.label ?? b[0])
  })
  return sorted
})

function getProviderLabel(provider: ProviderType): string {
  return providersStore.getProvider(provider)?.label ?? provider
}

function formatTime(ts: number | null): string {
  if (!ts) return t('apiKeys.neverTested')
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('common.timeJustNow')
  if (minutes < 60) return t('common.timeMinutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('common.timeHoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  return t('common.timeDaysAgo', { n: days })
}

function handleDelete(id: string) {
  const keyId = id.replace('apikey/', '')
  apiKeysStore.removeKey(keyId)
  deleteConfirmId.value = null
}

function goToDetail(id: string) {
  const keyId = id.replace('apikey/', '')
  router.push(`/api-keys/${keyId}`)
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('apiKeys.title') }}</h1>
      <button
        @click="showAddDialog = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        + {{ t('apiKeys.addKey') }}
      </button>
    </div>

    <!-- Search -->
    <div class="mb-6 max-w-md">
      <SearchInput v-model="searchQuery" @search="searchQuery = $event" />
    </div>

    <!-- Loading state -->
    <div
      v-if="apiKeysStore.loading"
      class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
    >
      <p class="text-gray-400">{{ t('common.loading') }}</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="apiKeysStore.apiKeyList.length === 0"
      class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
    >
      <div class="text-4xl mb-4">🔑</div>
      <p class="text-gray-500 font-medium mb-2">{{ t('common.noData') }}</p>
      <p class="text-sm text-gray-400 mb-4">{{ t('common.add') }} API Key {{ t('common.add').toLowerCase() }}</p>
      <button
        @click="showAddDialog = true"
        class="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        + {{ t('apiKeys.addKey') }}
      </button>
    </div>

    <!-- No search results -->
    <div
      v-else-if="filteredKeys.length === 0"
      class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
    >
      <p class="text-gray-400">{{ t('common.noData') }}</p>
    </div>

    <!-- Key list grouped by provider -->
    <div v-else class="space-y-6">
      <div v-for="[provider, keys] in groupedKeys" :key="provider">
        <!-- Provider group header -->
        <div class="flex items-center gap-2 mb-3">
          <ProviderIcon :provider="provider" size="sm" />
          <h2 class="text-base font-semibold text-gray-700">{{ getProviderLabel(provider) }}</h2>
          <span class="text-xs text-gray-400">({{ keys.length }})</span>
        </div>

        <!-- Key cards -->
        <div class="space-y-2">
          <div
            v-for="key in keys"
            :key="key._id"
            class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-gray-200 transition-colors"
          >
            <div class="flex items-start justify-between gap-4">
              <!-- Left: key info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="font-medium text-gray-800 text-sm truncate">{{ key.label }}</span>
                  <KeyStatusBadge :status="key.status" />
                </div>
                <div class="flex items-center gap-3 text-xs text-gray-500">
                  <span class="font-mono">{{ key.keyPreview }}</span>
                  <span v-if="key.baseUrl" class="truncate max-w-[150px]">{{ key.baseUrl }}</span>
                  <span>{{ t('apiKeys.lastTested') }}: {{ formatTime(key.lastTestedAt) }}</span>
                </div>
                <!-- Models chips -->
                <div v-if="key.models && key.models.length" class="flex flex-wrap gap-1 mt-2">
                  <span
                    v-for="model in key.models"
                    :key="model"
                    class="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200"
                  >{{ model }}</span>
                </div>
                <!-- Test connection inline -->
                <div class="mt-2">
                  <TestConnection :api-key-id="key._id" />
                </div>
              </div>

              <!-- Right: actions -->
              <div class="flex items-center gap-2 shrink-0">
                <button
                  @click="goToDetail(key._id)"
                  class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {{ t('common.edit') }}
                </button>
                <button
                  @click="deleteConfirmId = key._id"
                  class="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirm dialog -->
    <div
      v-if="deleteConfirmId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      @click.self="deleteConfirmId = null"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ t('apiKeys.deleteKey') }}</h3>
        <p class="text-sm text-gray-600 mb-6">{{ t('apiKeys.deleteConfirm') }}</p>
        <div class="flex items-center justify-end gap-3">
          <button
            @click="deleteConfirmId = null"
            class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="handleDelete(deleteConfirmId)"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add key dialog -->
    <AddKeyDialog
      v-if="showAddDialog"
      @close="showAddDialog = false"
      @saved="showAddDialog = false"
    />
  </div>
</template>
