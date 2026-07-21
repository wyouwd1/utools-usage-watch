import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'

// Must be imported early: monkey-patches global fetch for CORS proxy in H5 dev mode
import './utils/fetch'

import App from './App.vue'
import router from './router'
import zhCN from './i18n/zh-CN'
import enUS from './i18n/en-US'
import './assets/styles/main.css'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')

// uTools 子命令路由：aw quota → /quota, aw keys → /api-keys, aw settings → /settings
if ((window as any).utools) {
  ;(window as any).utools.onPluginEnter((action: any) => {
    if (action.type === 'text' && action.payload) {
      const text = action.payload.trim().toLowerCase()
      if (text.includes('quota')) router.push('/quota')
      else if (text.includes('key')) router.push('/api-keys')
      else if (text.includes('setting') || text.includes('config')) router.push('/settings')
    }
  })
}
