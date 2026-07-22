# AI Usage Watch

> uTools 插件 — AI 模型 API Key 管理与额度监控工具
> AI API Key Manager & Quota Watcher
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
- **uTools 快速搜索**：`aw` / `aw quota` / `aw keys` / `aw settings`

## 快速开始

### 1. 添加 API Key

在 uTools 中输入 `aw keys` 进入 API Key 管理页，点击 **添加 API Key**：

1. 选择提供商（支持 11+ AI 提供商）
2. 填写 API Key 和别名
3. 点击 **测试** 验证连通性
4. 保存后即可在概览页查看状态

### 2. 添加额度源

额度源用于监控 AI 提供商的 API 使用额度。插件支持两种模式：

#### cURL 模式（推荐）

从浏览器开发者工具复制额度接口的完整 cURL 命令：

1. 登录 AI 提供商控制台（如 OpenCode、DeepSeek 等）
2. 打开浏览器开发者工具（F12）→ Network 面板
3. 刷新页面，找到返回额度/使用数据的请求
4. 右键该请求 → **复制为 cURL (bash)**
5. 在插件中添加额度源 → 选择 cURL 模式 → 粘贴 → 自动验证并保存

插件会定期执行该 cURL 获取最新额度数据。

#### 手动模式

对于某些提供商的额度接口，可手动填写凭证和配置信息。

### 3. 查看与管理

| 指令 | 功能 |
|------|------|
| `aw` | 概览仪表盘 — 汇总统计、快捷操作、最近测试结果、额度告警 |
| `aw quota` | 额度看板 — 所有额度源使用情况一览，触发自动刷新调度 |
| `aw keys` | API Key 管理 — 添加/编辑/删除/连通性测试 |
| `aw settings` | 设置 — 数据导入导出、偏好配置 |

### 额度可视化

各额度源以 **cc-hud 风格进度条** 展示三时间窗口使用率：

- 🟢 ≤50%：正常
- 🟡 ≤70%：注意
- 🟠 ≤85%：偏高
- 🔴 >85%：告警

点击额度源进入详情页可查看 **历史趋势折线图**（Chart.js）。

## 自动刷新

- 默认每 **15 分钟** 自动刷新一次额度数据
- 切换页面标签时自动暂停，节省资源
- 连续 **3 次刷新失败** 自动停用该额度源
- 可在设置中调整刷新间隔

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
