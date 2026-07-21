import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ProviderType } from '@/types'
import type { IProviderInfo } from '@/types'

const DEFAULT_PROVIDERS: IProviderInfo[] = [
  { type: ProviderType.OPENAI, label: 'OpenAI', labelEn: 'OpenAI', defaultBaseUrl: 'https://api.openai.com', hasQuota: true, icon: '🤖' },
  { type: ProviderType.ANTHROPIC, label: 'Anthropic', labelEn: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com', hasQuota: true, icon: '🧠' },
  { type: ProviderType.DEEPSEEK, label: 'DeepSeek', labelEn: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com', hasQuota: true, icon: '🔮' },
  { type: ProviderType.OPENROUTER, label: 'OpenRouter', labelEn: 'OpenRouter', defaultBaseUrl: 'https://openrouter.ai/api', hasQuota: true, icon: '🔀' },
  { type: ProviderType.OLLAMA, label: 'Ollama', labelEn: 'Ollama', defaultBaseUrl: 'http://127.0.0.1:11434', hasQuota: false, icon: '🦙' },
  { type: ProviderType.GOOGLE, label: 'Google Gemini', labelEn: 'Google Gemini', defaultBaseUrl: 'https://generativelanguage.googleapis.com', hasQuota: false, icon: '🔵' },
  { type: ProviderType.AZURE, label: 'Azure OpenAI', labelEn: 'Azure OpenAI', defaultBaseUrl: '', hasQuota: false, icon: '☁️' },
  { type: ProviderType.MOONSHOT, label: 'Moonshot (Kimi)', labelEn: 'Moonshot (Kimi)', defaultBaseUrl: 'https://api.moonshot.cn', hasQuota: true, icon: '🌙' },
  { type: ProviderType.GROQ, label: 'Groq', labelEn: 'Groq', defaultBaseUrl: 'https://api.groq.com', hasQuota: true, icon: '⚡' },
  { type: ProviderType.QWEN, label: '通义千问 (Qwen)', labelEn: 'Qwen (Tongyi)', defaultBaseUrl: 'https://dashscope.aliyuncs.com', hasQuota: true, icon: '🌐' },
  { type: ProviderType.GLM, label: 'GLM (智谱)', labelEn: 'GLM (Zhipu)', defaultBaseUrl: 'https://open.bigmodel.cn', hasQuota: true, icon: '💠' },
  { type: ProviderType.CUSTOM, label: '自定义', labelEn: 'Custom', defaultBaseUrl: '', hasQuota: false, icon: '🔌' },
]

export const useProvidersStore = defineStore('providers', () => {
  const providers = ref<IProviderInfo[]>(DEFAULT_PROVIDERS)
  const searchQuery = ref('')

  const filteredProviders = computed(() => {
    if (!searchQuery.value) return providers.value
    const q = searchQuery.value.toLowerCase()
    return providers.value.filter(p =>
      p.label.toLowerCase().includes(q) || p.labelEn.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    )
  })

  function getProvider(type: ProviderType): IProviderInfo | undefined {
    return providers.value.find(p => p.type === type)
  }

  const hasQuotaProviders = computed(() => providers.value.filter(p => p.hasQuota))

  return { providers, searchQuery, filteredProviders, getProvider, hasQuotaProviders }
})
