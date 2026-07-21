# Spec: utools-usage-watch — AI 模型管理与额度监控工具

> 基于 uTools 的 AI 模型管理与额度监控插件。  
> **API 管理**参考 Cherry Studio 的提供商管理体系。  
> **额度监控**参考 [cc-hud](https://github.com/wyouwd1/cc-hud) 的配额采集架构。

---

## 1. Objective

### 1.1 用户故事

| 角色 | 需求 |
|------|------|
| **AI 重度用户** | 管理多个 AI 平台的 API Key，统一管理、快速测试 |
| **开发者** | 实时掌握各 OpenCode/百炼 等服务的订阅配额 |
| **多账号用户** | 管理多个环境的 Key 配置，方便切换（工作/个人） |

### 1.2 核心模块

```
┌─────────────────────────────────────────────────────┐
│                  uTools 插件入口                      │
├─────────────────────┬───────────────────────────────┤
│                     │                               │
│  模块一：API Key 管理 │  模块二：额度监控              │
│  （纯粹 Key 管理）    │  （独立额度源，参考 cc-hud）   │
│                     │                               │
│  · 提供商 + Key     │  · OpenCode Go 订阅配额        │
│  · 标签 + Endpoint  │  · 百炼 Coding Plan           │
│  · 模型列表         │  · DeepSeek/Moonshot/Qwen 余额 │
│  · 连通性测试       │  · Groq/GLM/MiniMax 用量       │
│                     │  · 每个源独立配置凭证           │
│  ❌ 无额度相关字段   │  · 与 API Key 模块完全解耦     │
│                     │                               │
├─────────────────────┴───────────────────────────────┤
│              utools.db（用户数据持久化）               │
│  apikey/* · quota-source/* · setting/*              │
│  ⚠ 额度缓存/历史存 Pinia 内存（不写 utools.db）      │
└─────────────────────────────────────────────────────┘
```

### 1.3 成功标准

- [ ] API Key 管理纯化：添加 Key 时无额度相关字段
- [ ] 额度监控独立：添加/删除额度源不影响 API Key
- [ ] 支持全部 cc-hud 后端（OpenCode Go / 百炼 / DeepSeek / Moonshot / Groq / Qwen / GLM / MiniMax）
- [ ] 每个额度源可单独配置凭证，加密存储在 utools.db
- [ ] 额度看板只展示已配置的额度源，不自动关联 API Key
- [ ] 单元测试覆盖率 ≥ 80%

---

## 2. Tech Stack

| 层 | 技术 | 说明 |
|----|------|------|
| 平台 | uTools Plugin v6+ | plugin.json + preload.js |
| 前端 | Vue 3 + Vite + TypeScript | `<script setup>` 组合式 API |
| 样式 | Tailwind CSS | 原子化 CSS |
| 状态 | Pinia | 4 stores（apiKeys / quotas / providers / settings） |
| 存储 | `utools.db` (CouchDB 兼容) | 存用户数据（API Key / 额度源凭证 / 设置） |
| 加密 | Web Crypto API (AES-GCM) | 凭证存储前加密 |
| i18n | vue-i18n | 中英双语 |
| 图表 | Chart.js | 额度趋势 |
| 构建 | Vite | 输出 dist/ |
| 测试 | Vitest | 单元 + 集成 |

---

## 3. Commands

```bash
pnpm dev              # Vite 开发服务器
pnpm build            # 生产构建
pnpm test             # 运行测试
pnpm type-check       # 类型检查
pnpm pack-upx         # 打包为 .upx
```

---

## 4. Project Structure

```
src/
├── components/         # UI 组件
│   ├── AddKeyDialog.vue      # 新增 API Key（无阈值字段 ✅）
│   ├── TestConnection.vue    # 连通性测试
│   ├── KeyStatusBadge.vue    # Key 状态标签
│   ├── ProviderIcon.vue      # 提供商图标
│   ├── QuotaGauge.vue        # 额度进度条（cc-hud 配色）
│   ├── QuotaTrendChart.vue   # 趋势折线图
│   ├── AddQuotaSource.vue    # 【新增】添加额度源弹窗
│   ├── SearchInput.vue       # 搜索框
│   └── AlertToast.vue        # 预警通知
│
├── views/              # 页面
│   ├── Dashboard.vue
│   ├── ApiKeys.vue
│   ├── ApiKeyDetail.vue
│   ├── QuotaBoard.vue        # 额度看板
│   ├── QuotaSourceDetail.vue # 【新增】额度源详情/编辑
│   └── Settings.vue
│
├── stores/
│   ├── apiKeys.ts
│   ├── providers.ts
│   ├── quotas.ts             # 额度数据（内存）
│   └── quotaSources.ts       # 【新增】额度源配置（utools.db）
│
├── services/
│   ├── quota-checker.ts      # 额度查询引擎
│   ├── auto-refresh.ts       # 自动刷新调度
│   ├── key-tester.ts         # API Key 测试
│   ├── encrypt.ts            # AES-GCM 加密
│   └── providers/            # AI 提供商适配器
│       ├── index.ts
│       ├── registry.ts
│       ├── openai.ts / anthropic.ts / deepseek.ts ...
│       └── ... (11 adapters)
│
├── db/
│   ├── index.ts              # utools.db 工具
│   ├── apiKeys.repo.ts       # API Key CRUD
│   ├── settings.repo.ts      # 设置持久化
│   └── quotaSources.repo.ts  # 【新增】额度源 CRUD
│
├── types/
│   ├── apikey.ts             # 无 quotaAlertThreshold ❌
│   ├── quota.ts              # IQuotaSource 类型
│   ├── settings.ts
│   └── provider.ts
│
├── i18n/
│   ├── zh-CN.ts
│   └── en-US.ts
│
└── views/...

tests/
├── unit/
│   ├── db/
│   ├── services/
│   └── stores/
└── integration/
```

---

## 5. Code Style

沿用现有规范：
- TypeScript strict 模式
- Vue `<script setup lang="ts">`
- Pinia setup stores
- API 适配器全部实现 `IProviderAdapter`
- 注释中文，命名英文

---

## 6. Data Model

### 6.1 API Key（已清理，无额度字段）

```typescript
// _id: apikey/<uuid>
export interface IApiKeyEntity {
  _id: string
  _rev?: string
  type: 'apikey'
  provider: ProviderType
  label: string
  encryptedKey: string
  keyPreview: string
  baseUrl: string | null
  models: string[]
  status: KeyStatus
  lastTestedAt: number | null
  lastTestResult: ITestResult | null
  sortOrder: number
  createdAt: number
  updatedAt: number
  // ❌ 已移除：quotaAlertThreshold
}
```

### 6.2 额度源（新增，独立于 API Key）

```typescript
// _id: quota-source/<uuid>
export interface IQuotaSourceEntity {
  _id: string
  _rev?: string
  type: 'quota-source'
  sourceType: QuotaSourceType     // opencode-go | bailian | deepseek | ...
  label: string                   // 用户自定义标签
  encryptedCredential: string     // AES-GCM 加密的凭证
  credentialHint: string          // 脱敏提示，如 "oc_****1234"
  baseUrl?: string                // 自定义 endpoint（可选）
  config?: Record<string, any>    // 额外配置（如百炼的 region、sec_token）
  enabled: boolean                // 是否启用
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export enum QuotaSourceType {
  OPENCODE_GO = 'opencode-go',
  BAILIAN = 'bailian',
  DEEPSEEK = 'deepseek',
  MOONSHOT = 'moonshot',
  GROQ = 'groq',
  QWEN = 'qwen',
  GLM = 'glm',
  MINIMAX = 'minimax',
}
```

### 6.3 额度数据（内存，不写 utools.db）

```typescript
// Pinia 内存
export interface IQuotaSourceData {
  sourceId: string
  sourceType: QuotaSourceType
  label: string
  windows: IQuotaWindows        // rolling / weekly / monthly
  fetchedAt: number
  loading: boolean
}
```

---

## 7. Feature Specifications

### 7.1 模块一：API Key 管理（纯化）

| 功能 | 说明 |
|------|------|
| 提供商管理 | 内置 11+ 提供商配置 |
| Key 增删改查 | CRUD，支持标签、Endpoint、模型列表 |
| 一键测试 | 测试连通性，返回延迟 + 状态码 |
| 加密存储 | AES-GCM 加密 |
| 搜索过滤 | 按提供商/标签/状态搜索 |
| ❌ 移除 | 预警阈值、额度相关字段全部移除 |

### 7.2 模块二：额度监控（独立，参考 cc-hud）

| 功能 | 说明 |
|------|------|
| 额度源管理 | 按需添加/编辑/删除额度源，各自独立配置凭证 |
| 额度源类型 | OpenCode Go / 百炼 / DeepSeek / Moonshot / Groq / Qwen / GLM / MiniMax |
| 手动刷新 | 点击按钮立即拉取 |
| 自动刷新 | 配置间隔（5/15/30/60min） |
| 三窗口展示 | rolling(5h) / weekly(7d) / monthly |
| cc-hud 配色 | 🟢≤50% / 🟡≤70% / 🟠≤85% / 🔴>85% |
| 趋势图 | Chart.js 折线图 |

### 7.3 额度源凭证配置

每个额度源需要不同的凭证：

| 额度源 | 凭证字段 | 说明 |
|--------|---------|------|
| **OpenCode Go** | `auth` cookie | 从 opencode.ai 浏览器 DevTools 获取 |
| **百炼** | `cookie` + `sec_token` + `region` | 阿里云百炼控制台 |
| **DeepSeek** | `apiKey` | DeepSeek API Key |
| **Moonshot** | `apiKey` | Moonshot API Key |
| **Groq** | `apiKey` | Groq API Key |
| **Qwen** | `apiKey` | 通义千问 DashScope API Key |
| **GLM** | `apiKey` | 智谱 API Key |
| **MiniMax** | `apiKey` | MiniMax API Key（group_id） |

---

## 8. Backend Adapter Architecture（参考 cc-hud）

每个额度源对应一个 `IQuotaSourceAdapter`：

```typescript
export interface IQuotaSourceAdapter {
  readonly sourceType: QuotaSourceType
  readonly label: string

  /** 使用凭证查询额度 */
  checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null>
}

// 每个后端独立模块，参考 cc-hud：
// opencode.ts    → 解析 opencode.ai HTML 页面提取 usage
// bailian.ts     → 调用百炼 API
// deepseek.ts    → GET /user/balance
// moonshot.ts    → GET /v1/billing/balance
// groq.ts        → GET /v1/user/usage
// qwen.ts        → POST /api/v1/billing/query
// glm.ts         → GET /api/biz/account/query-customer-account-report
```

与 API Key 的 Provider Adapter 的区别：
- **Provider Adapter**（API Key 模块）：`testConnection()` + `checkQuota()` — 用于连通性测试
- **Quota Source Adapter**（额度监控模块）：`checkQuota(credential)` — 仅用于额度查询

两者**完全独立**，不共享数据。

---

## 9. Testing Strategy

| 层级 | 框架 | 覆盖 |
|------|------|------|
| 单元测试 | Vitest | services/、stores/、db/ |
| 集成测试 | Vitest | 额度源 CRUD → 查询全流程 |

每个额度源适配器包含 4 维度测试：isolation / parse / error / cache

---

## 10. Boundaries

### ✅ Always do
- API Key 和额度源凭证存储前必须 AES-GCM 加密
- 所有凭证展示时脱敏
- 每个 HTTP 请求设超时 5s
- 所有 IO try-catch，失败静默降级
- 额度数据只存 Pinia 内存（不写 utools.db）

### ❓ Ask first
- 添加新的额度源类型
- 修改 utools.db schema
- 引入新依赖

### 🚫 Never do
- 不将 API Key 额度监控混为一谈
- 不将程序运行数据写入同步数据库
- 不在 UI 中明文显示完整凭证
- 不将用户数据上传到第三方

---

## 11. 计划变更清单

针对当前代码需要做的修改：

| # | 改动 | 涉及文件 | 影响 |
|---|------|---------|------|
| 1 | AddKeyDialog 移除阈值滑块 | `AddKeyDialog.vue` | UI 修改 |
| 2 | IApiKeyEntity 移除 quotaAlertThreshold | `types/apikey.ts` | 类型修改 |
| 3 | apiKeys repo/store 清理相关字段 | `db/apiKeys.repo.ts`, `stores/apiKeys.ts` | 逻辑清理 |
| 4 | 新增 IQuotaSourceEntity 类型 | `types/quota.ts` | 新增 |
| 5 | 新增 QuotaSourceType 枚举 | `types/quota.ts` | 新增 |
| 6 | 新增 quotaSources.repo.ts | `db/quotaSources.repo.ts` | 新增 |
| 7 | 新增 quotaSources store | `stores/quotaSources.ts` | 新增 |
| 8 | 新增 AddQuotaSourceDialog.vue | `components/AddQuotaSource.vue` | 新增 |
| 9 | 新增 QuotaSourceDetail.vue | `views/QuotaSourceDetail.vue` | 新增 |
| 10 | 重构 QuotaBoard.vue — 基于额度源展示 | `views/QuotaBoard.vue` | 重写 |
| 11 | 重构 QuotaChecker — 基于额度源查询 | `services/quota-checker.ts` | 重写 |
| 12 | 新增 QuotaSourceAdapter 体系 | `services/quota-sources/` | 新增目录 |
| 13 | 路由新增额度源详情页 | `router/index.ts` | 修改 |
| 14 | i18n 更新 | `i18n/zh-CN.ts`, `i18n/en-US.ts` | 修改 |

---

> **本 spec 聚焦两个核心修正：**
> 1. API Key 纯化 — 移除额度相关字段
> 2. 额度监控重构 — 独立额度源体系，参考 cc-hud 架构
>
> **确认后进入 Plan 阶段。**
