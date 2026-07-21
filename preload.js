// uTools 预加载脚本 — 运行在独立的 preload 环境，可使用 Node.js 原生能力
// 遵循 CommonJS 规范，不能打包/压缩

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

// 暴露 Node.js 工具方法给渲染层
window.services = {
  getAppPath: () => path.resolve(__dirname),
  getPlatform: () => process.platform,
  getHomeDir: () => os.homedir(),
  getHostname: () => os.hostname(),

  // 读取文件内容 (用于设置页导入数据)
  readFile: (filePath) => fs.readFileSync(filePath, { encoding: 'utf-8' }),

  // 写入文本到下载目录 (用于设置页导出数据)
  writeFileToDownloads: (fileName, text) => {
    const filePath = path.join(window.utools.getPath('downloads'), fileName)
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
}
