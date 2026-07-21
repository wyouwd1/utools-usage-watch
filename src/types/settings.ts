export interface ISettingEntity {
  _id: string
  _rev?: string
  type: 'setting'
  key: string
  value: any
}

export interface IAppSettings {
  language: 'zh-CN' | 'en-US'
  refreshInterval: number      // 分钟
  defaultAlertThreshold: number // 百分比 0-100
}
