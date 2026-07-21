# AI Usage Watch

> uTools 插件 — AI 模型 API Key 管理与额度监控工具
>
> 参考 Cherry Studio（API Key 管理）+ cc-hud（额度监控架构）

---

## 功能特性

### 🔑 API Key 管理
- 支持 **11+ AI 提供商**: OpenAI / Anthropic / DeepSeek / OpenRouter / Ollama / Google Gemini / Azure OpenAI / Moonshot / Groq / 通义千问 / GLM
- 自定义 Endpoint：兼容 OpenAI API 格式的任意服务
- **AES-GCM 加密存储**，展示时脱敏（`sk-****abcd`）
- **一键连通性测试**：显示状态码、延迟、可用模型列表
- 分组展示、搜索过滤、批量操作

### 📊 额度监控（参考 cc-hud 架构）
- **三时间窗口模型**：滚动窗口 (5h) / 每周 (7d) / 每月 使用率
- **cc-hud 配色体系**：≤50% 🟢 / ≤70% 🟡 / ≤85% 🟠 / >85% 🔴
- **自动刷新**：5/15/30/60 分钟可配置，页面可见性感知
- **重置倒计时**：各窗口重置时间友好显示
- **趋势图表**：Chart.js 折线图展示历史使用趋势
- **额度预警**：低于阈值时 Toast + uTools 系统通知

### 🌐 其他
- **中英双语**完整支持
- **数据导入/导出** JSON 格式
- **uTools 快速搜索**：`aw` / `aw quota` / `aw keys`

## 安装

### 方式一：uTools 应用市场（推荐）
1. 打开 uTools
2. 输入 `aw` 或搜索「AI Usage Watch」
3. 点击安装

### 方式二：离线安装
1. 从 [Releases](https://github.com/wyouwd1/utools-usage-watch/releases) 下载 `.upx` 文件
2. 在 uTools 中右键输入框 → 「插件应用」→ 「离线安装」
3. 选择下载的 `.upx` 文件

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test

# 类型检查
pnpm type-check

# 打包为 uTools 插件
pnpm pack-upx
```

## 技术栈

| 层 | 技术 |
|----|------|
| 平台 | uTools Plugin v6+ |
| 前端 | Vue 3 + TypeScript + Tailwind CSS |
| 状态 | Pinia |
| 存储 | utools.db（用户数据）+ Pinia 内存（程序数据） |
| 加密 | Web Crypto API (AES-GCM) |
| 图表 | Chart.js |
| i18n | vue-i18n（中/英） |
| 构建 | Vite |
| 测试 | Vitest（192 tests） |

## 项目结构

```
src/
├── components/     # 可复用 UI 组件
├── db/             # utools.db 数据层
├── i18n/           # 中英双语翻译
├── layouts/        # 页面布局
├── router/         # 路由配置
├── services/       # 业务逻辑
│   └── providers/  # AI 提供商适配器（参考 cc-hud 架构）
├── stores/         # Pinia 状态管理
├── types/          # TypeScript 类型定义
├── utils/          # 工具函数
└── views/          # 页面组件
```

## 架构参考

额度监控模块的架构参考了 [cc-hud](https://github.com/wyouwd1/cc-hud)：
- **Provider Adapter 模式**：每个提供商独立模块
- **三时间窗口模型**：rolling / weekly / monthly
- **withCache 缓存策略**：5min TTL + stale-while-revalidate
- **颜色分级体系**：绿/黄/橙/红

## License

MIT
