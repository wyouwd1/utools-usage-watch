/// <reference types="vite/client" />
/// <reference types="utools-api-types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 扩展 Window 接口
interface Window {
  utools: any
  services: {
    getAppPath: () => string
    getPlatform: () => string
    getHomeDir: () => string
    getHostname: () => string
  }
}
