// uTools 预加载脚本 — 运行在独立的 preload 环境，可使用 Node.js 原生能力
// 遵循 CommonJS 规范，不能打包/压缩

const path = require('node:path')

// 将 utools API 桥接到渲染进程
window.utools = window.utools || {}

// 暴露 Node.js 工具方法给渲染层
window.services = {
  getAppPath: () => path.resolve(__dirname),
  getPlatform: () => process.platform,
}
