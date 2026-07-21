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
| **开发者** | 实时掌握各 OpenCode、百炼等服务的订阅配额 |
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
│                     │  · 优先 cURL 粘贴录入凭证       │
│                     │  · 参考 cc-hud，cURL 即引导     │
│                     │  · 凭证过期自动检测             │
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
- [ ] **额度源添加支持 cURL 粘贴 + 预览确认**，也支持手动填写
- [ ] **OpenCode Go / 百炼 通过 cURL 粘贴引导用户获取凭证（参考 cc-hud）**
- [ ] **凭证过期自动检测**（401 响应），提示用户重新绑定
- [ ] **导出导入包含额度源数据**
- [ ] 单元测试覆盖率 ≥ 80%

---

## 2. Tech Stack

| 层 | 技术 | 说明 |
|----|------|------|
| 平台 | uTools Plugin v6+ | plugin.json + preload.js |
| 前端 | Vue 3 + Vite + TypeScript | `<script setup>` 组合式 API |
| 样式 | Tailwind CSS | 原子化 CSS |
| 状态 | Pinia | 4 stores（apiKeys / quotas / quotaSources / settings） |
| 存储 | `utools.db` (CouchDB 兼容) | 存用户数据（API Key / 额度源凭证 / 设置） |
| 加密 | Web Crypto API (AES-GCM) | 凭证存储前加密 |
| i18n | vue-i18n | 中英双语（含额度源引导文字） |
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
├── components/
│   ├── AddKeyDialog.vue           # 新增 API Key（无阈值字段 ✅）
│   ├── TestConnection.vue         # 连通性测试
│   ├── KeyStatusBadge.vue         # Key 状态标签
│   ├── ProviderIcon.vue           # 提供商图标
│   ├── QuotaGauge.vue             # 额度进度条（cc-hud 配色）
│   ├── QuotaTrendChart.vue        # 趋势折线图
│   ├── AddQuotaSourceDialog.vue   # 添加额度源弹窗（含 cURL 解析 + 引导）
│   ├── CurlPreviewDialog.vue      # 【新增】cURL 解析预览确认弹窗
│   ├── CredentialExpiredBanner.vue # 【新增】凭证过期提示条
│   ├── SearchInput.vue            # 搜索框
│   └── AlertToast.vue             # 预警通知
│
├── views/
│   ├── Dashboard.vue
│   ├── ApiKeys.vue
│   ├── ApiKeyDetail.vue
│   ├── QuotaBoard.vue             # 额度看板（卡片网格）
│   ├── QuotaDetail.vue            # 单额度源详情
│   ├── QuotaSourceDetail.vue      # 额度源详情/编辑（含 cURL 重绑定）
│   └── Settings.vue               # 设置（含导出导入）
│
├── stores/
│   ├── apiKeys.ts                 # API Key store
│   ├── providers.ts               # 提供商注册
│   ├── quotas.ts                  # 额度数据缓存（内存）
│   ├── quotaSources.ts            # 额度源配置 store
│   └── settings.ts                # 全局设置
│
├── services/
│   ├── quota-checker.ts           # 额度查询引擎（含过期检测）
│   ├── auto-refresh.ts            # 自动刷新调度器
│   ├── key-tester.ts              # API Key 连通性测试
│   ├── encrypt.ts                 # AES-GCM 加密
│   ├── curl-parser.ts             # 【新增】cURL 解析器（独立函数）
│   └── quota-sources/             # 额度源适配器（8个）
│       ├── index.ts               # IQuotaSourceAdapter 接口
│       ├── registry.ts            # 适配器注册表
│       ├── opencode.ts            # OpenCode Go
│       ├── bailian.ts             # 百炼
│       ├── deepseek.ts            # DeepSeek
│       ├── moonshot.ts            # Moonshot
│       ├── groq.ts                # Groq
│       ├── qwen.ts                # 通义千问
│       ├── glm.ts                 # 智谱
│       └── minimax.ts             # MiniMax
│
├── db/
│   ├── index.ts                   # utools.db 工具
│   ├── apiKeys.repo.ts            # API Key CRUD
│   ├── settings.repo.ts           # 设置持久化
│   └── quotaSources.repo.ts       # 额度源 CRUD
│
├── types/
│   ├── apikey.ts                  # IApiKeyEntity（无 quotaAlertThreshold ❌）
│   ├── quota.ts                   # IQuotaSourceEntity + IQuotaWindows
│   ├── settings.ts                # ISettings
│   └── provider.ts                # ProviderType 枚举
│
├── i18n/
│   ├── zh-CN.ts                   # 中文翻译
│   └── en-US.ts                   # 英文翻译
│
└── router/
    └── index.ts                   # 路由配置

tests/
├── unit/
│   ├── db/
│   ├── services/
│   │   └── quota-sources/         # 8 个适配器测试（4 维度）
│   ├── stores/
│   └── services/curl-parser.spec.ts # 【新增】cURL 解析测试
└── integration/
```

---

## 5. Code Style

```typescript
// 沿用现有规范：
// - TypeScript strict 模式
// - Vue <script setup lang="ts">
// - Pinia setup stores
// - 适配器全部实现对应接口
// - 注释中文，命名英文

// 示例：cURL 解析函数
function parseCurl(curl: string): CurlParseResult {
  // 提取 URL、cookie、workspaceId
  const urlMatch = curl.match(/curl\s+['"]?([^'"\s]+)/)
  if (!urlMatch) throw new CurlParseError('无法解析 URL')
  
  const url = urlMatch[1].replace(/\/$/, '')
  const baseUrl = url.match(/(https?:\/\/[^\/]+)/)?.[1] ?? ''
  const workspaceId = url.match(/\/workspace\/([^\/\s?]+)/)?.[1]
  
  // 解析 cookie
  const cookie = extractCookieFromCurl(curl)
  const headers = extractHeadersFromCurl(curl)
  
  return { baseUrl, workspaceId, cookie, headers }
}
```

### Key Conventions

| 规则 | 说明 |
|------|------|
| 文件名 | camelCase（组件 PascalCase） |
| 组件命名 | PascalCase，如 `AddQuotaSourceDialog.vue` |
| 函数命名 | camelCase，如 `parseCurl()` |
| 接口命名 | 前缀 `I`，如 `IQuotaSourceEntity` |
| 枚举命名 | PascalCase，如 `QuotaSourceType` |
| 类型文件 | 按模块拆分，`types/` 目录 |
| 适配器命名 | 小写，如 `opencode.ts` |
| CORS 相关 | 统一通过 preload.js 代理 |
| 凭证显示 | 脱敏格式：`oc_****1234` |

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

### 6.2 额度源（独立于 API Key）

```typescript
// _id: quota-source/<uuid>
export interface IQuotaSourceEntity {
  _id: string
  _rev?: string
  type: 'quota-source'
  sourceType: QuotaSourceType
  label: string
  encryptedCredential: string     // AES-GCM 加密的凭证
  credentialHint: string          // 脱敏提示，如 "oc_****1234"
  baseUrl?: string
  config?: Record<string, any>    // 如 workspaceId、region、sec_token
  enabled: boolean
  credentialExpiredAt?: number    // 【新增】凭证过期时间戳（cookie 场景）
  lastCheckSucceeded?: boolean    // 【新增】上次检查是否成功
  lastError?: string              // 【新增】上次错误信息
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

**模型变更说明：**
- `credentialExpiredAt`：对 cookie 类源（OpenCode Go、百炼），记录 cookie 过期时间
- `lastCheckSucceeded` / `lastError`：记录上次检查结果，用于 UI 显示过期提示

### 6.3 额度数据（内存，不写 utools.db）

```typescript
// Pinia 内存
export interface IQuotaCacheEntry {
  windows: IQuotaWindows         // rolling / weekly / monthly
  fetchedAt: number
  ttl: number                    // 5 分钟 = 300000
}

export interface IQuotaWindows {
  rolling?: IQuotaWindow         // 滚动窗口（如 OpenCode 5h）
  weekly?: IQuotaWindow          // 周额度
  monthly?: IQuotaWindow         // 月额度
}

export interface IQuotaWindow {
  used: number
  total: number
  percent: number                // 0-100
  remaining?: number
  resetsAt?: number              // 重置时间戳
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

### 7.2 模块二：额度监控（核心模块）

#### 7.2.1 额度源管理

| 功能 | 说明 |
|------|------|
| 添加额度源 | **cURL 粘贴（首选）+ 手动填写（fallback）** |
| 编辑额度源 | 重新粘贴 cURL 更新凭证 |
| 删除额度源 | 确认后删除 |
| 启用/禁用 | 切换额度源是否参与刷新 |

#### 7.2.2 cURL 录入流程（关键交互）

```
用户点击"添加额度源"
  → 选择额度源类型（如 OpenCode Go）
  → 显示两种录入方式：

  方式 A（推荐）：粘贴 cURL
    ┌────────────────────────────────┐
    │ 📋 从浏览器复制为 cURL        │
    │ [从 DevTools Network 复制]      │
    │ 粘贴 cURL 命令:                 │
    │ ┌────────────────────────┐    │
    │ │ curl 'https://...' \  │    │
    │ │ -H 'cookie: xxx' ...  │    │
    │ └────────────────────────┘    │
    │ [ 🚀 解析 cURL ]              │
    └────────────────────────────────┘
  
  → 点击"解析 cURL"
  → 显示预览确认弹窗：
    ┌────────────────────────────────┐
    │ 🔍 解析结果预览                 │
    │ Base URL:  https://opencode.ai  │
    │ Workspace: ws_abc123           │
    │ Cookie:    oc_****89ab         │
    │                                │
    │ [✗ 取消]  [✓ 确认并保存]       │
    └────────────────────────────────┘
  → 确认后保存

  方式 B：手动填写
    ┌────────────────────────────────┐
    │ 🔧 手动输入                   │
    │ Base URL: [______________]     │
    │ Cookie:   [______________]     │
    │ Workspace ID: [____________]   │
    │ [ 📖 官方文档指引 → ]          │
    └────────────────────────────────┘
```

#### 7.2.3 每种额度源的凭证引导（参考 cc-hud）

| 额度源 | 凭证类型 | 引导方式 |
|--------|---------|---------|
| **OpenCode Go** | cookie | **cURL 粘贴（主）**：DevTools → Network → 复制为 cURL → 粘贴到输入框 |
| | | 手动填写（fallback）：分别输入 cookie、base URL、workspace ID |
| **百炼** | cookie | **cURL 粘贴（主）**：同 OpenCode Go 方式 |
| | | 手动填写（fallback）：cookie + sec_token + region |
| **DeepSeek** | api-key | 输入 API Key |
| **Moonshot** | api-key | 输入 API Key |
| **Groq** | api-key | 输入 API Key |
| **Qwen** | api-key | 输入 API Key |
| **GLM** | api-key | 输入 API Key |
| **MiniMax** | api-key | 输入 API Key + group_id |

**设计原则：**
- **cURL 解析只针对 OpenCode Go 和百炼**（它们的凭证是 cookie，没有简单 API Key）
- 其他额度源（DeepSeek/Moonshot/Groq/Qwen/GLM/MiniMax）：直接输入 API Key
- 参考 cc-hud，**cURL 粘贴即是最好的引导**，不需要额外文档链接

#### 7.2.4 三窗口展示

- **rolling（滚动窗口）**：如 OpenCode Go 的 5h 滑动窗口
- **weekly（周）**：如 Groq 的周配额
- **monthly（月）**：如 DeepSeek 余额、Moonshot 余额
- 每个窗口含：进度条 + 百分比 + 剩余量 + 重置倒计时
- 颜色分级（cc-hud 规范）：🟢≤50% / 🟡≤70% / 🟠≤85% / 🔴>85%
- 兼容不同标准：有的源只有余额（无总量），有的有配额 usage/limit

#### 7.2.5 刷新机制

| 方式 | 说明 |
|------|------|
| 手动刷新 | QuotaBoard + QuotaDetail 均有刷新按钮 |
| 进入页面自动刷新 | 路由进入时触发刷新（有缓存则用缓存） |
| 定时自动刷新 | Settings 配置间隔（5/15/30/60 分钟），页面 visible 时生效 |

#### 7.2.6 凭证过期检测

- 额度查询返回 401 时，自动标记该源的 `lastCheckSucceeded = false`
- QuotaBoard 卡片显示 ⚠️ 过期标记
- QuotaDetail 顶部显示 `CredentialExpiredBanner.vue`：
  - "凭证已过期，请重新绑定"
  - 点击跳转到编辑页面
  - 支持原地粘贴新 cURL 更新
- 数据仍展示最后一次成功获取的额度（灰色半透明状态）

---

## 8. Backend Adapter Architecture

### 8.1 IQuotaSourceAdapter 接口

```typescript
export interface IQuotaSourceAdapter {
  readonly sourceType: QuotaSourceType
  readonly label: string
  readonly defaultBaseUrl?: string
  readonly credentialType: 'api-key' | 'cookie'  // 【新增】凭证类型

  /** 使用凭证查询额度 */
  checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null>
}
```

### 8.2 适配器清单

| 适配器 | 源类型 | 凭证类型 | 请求方式 |
|--------|--------|---------|---------|
| `opencode.ts` | OPENCODE_GO | cookie | 解析 HTML 页面提取 usage |
| `bailian.ts` | BAILIAN | cookie | 调用百炼 API |
| `deepseek.ts` | DEEPSEEK | api-key | GET /user/balance |
| `moonshot.ts` | MOONSHOT | api-key | GET /v1/billing/balance |
| `groq.ts` | GROQ | api-key | GET /v1/user/usage |
| `qwen.ts` | QWEN | api-key | POST /api/v1/billing/query |
| `glm.ts` | GLM | api-key | GET /api/biz/account/query |
| `minimax.ts` | MINIMAX | api-key | GET /v1/token_plan/remains |

### 8.3 与 API Key Provider Adapter 的区别

- **Provider Adapter**（API Key 模块）：`testConnection()` — 仅测试连通性
- **Quota Source Adapter**（额度监控模块）：`checkQuota(credential)` — 查询额度
- 两者**完全独立**，不共享数据

---

## 9. CURL 解析规范

### 9.1 解析器

独立模块 `src/services/curl-parser.ts`，支持：

```typescript
interface CurlParseResult {
  method: string
  url: string
  baseUrl: string
  headers: Record<string, string>
  cookies: Record<string, string>
  body?: string
  // 特定字段提取
  workspaceId?: string
  apiKey?: string
  authToken?: string
}

interface CurlParseError {
  code: 'NO_URL' | 'NO_CREDENTIAL' | 'INVALID_FORMAT'
  message: string
  // 友好提示
  userMessage: { zh: string; en: string }
}
```

### 9.2 支持的凭证提取

| 场景 | 提取方式 |
|------|---------|
| `Authorization: Bearer xxx` | 提取 token |
| `Cookie: auth=xxx` 或 `Cookie: xxx` | 提取 cookie 字符串 |
| `-H "cookie: xxx"` | 同上 |
| `apiKey=xxx` 在 URL query | 提取 API Key |
| `x-api-key: xxx` header | 提取 API Key |

### 9.3 解析失败处理

- 解析失败时显示具体错误原因（中文/英文）
- 同时展开手动填写表单作为 fallback
- 不丢失用户已输入的内容

---

## 10. UI 交互详细规范

### 10.1 QuotaBoard 布局

```
┌──────────────────────────────────────────────────────┐
│  📊 额度监控    [+ 添加额度源]  [🔄 刷新]            │
│  已启用: 3  |  有数据: 2  |  有告警: 0              │
├──────────────────────────────────────────────────────┤
│ ┌────────────────┐ ┌────────────────┐                │
│ │ 🔑 OpenCode Go │ │ 🤖 百炼       │                │
│ │ ⚠️ 凭证已过期   │ │ 🟢 542/1000   │                │
│ │ 🌊 5h: --%     │ │ 🌊 5h: 45%    │                │
│ │ 📅 周: --%     │ │ 📅 周: 62%    │                │
│ │ 📅 月: --%     │ │ 📅 月: 38%    │                │
│ │                │ │ 5分钟前刷新    │                │
│ └────────────────┘ └────────────────┘                │
│ ┌────────────────┐ ┌────────────────┐                │
│ │ 🔮 DeepSeek    │ │ 🌙 Moonshot   │                │
│ │ 🟢 ¥52.30 余额  │ │ 🟢 ¥128 余额   │                │
│ │ 📅 月: 0%      │ │ 📅 月: 15%    │                │
│ └────────────────┘ └────────────────┘                │
└──────────────────────────────────────────────────────┘
```

### 10.2 QuotaDetail 布局

```
┌──────────────────────────────────────────────────────┐
│  ← 返回   🔑 OpenCode Go  [✏️ 编辑]  [🔄 刷新]       │
│                                                       │
│  ⚠️ 凭证已过期 — 请重新绑定  [立即更新]                │  ← 仅过期时显示
│                                                       │
│  ┌──────────────────────────────────────┐             │
│  │ 🌊 滚动窗口 (5h)                      │             │
│  │ ████████████░░░░░░░░░  542/1000  54% │             │
│  │ 🟢 状态正常  |  2小时15分后重置       │             │
│  └──────────────────────────────────────┘             │
│  ┌──────────────────────────────────────┐             │
│  │ 📅 周额度                              │             │
│  │ ██████████████████░░░░  3200/5000 64%│             │
│  │ 🟡 注意  |  3天后重置                  │             │
│  └──────────────────────────────────────┘             │
│  ┌──────────────────────────────────────┐             │
│  │ 📅 月额度                              │             │
│  │ ████████████░░░░░░░░░  45%           │             │
│  │ 🟢 正常  |  18天后重置                 │             │
│  └──────────────────────────────────────┘             │
│                                                       │
│  📈 使用趋势（近 7 天）                                 │
│  ┌──────────────────────────────────────┐             │
│  │  [Chart.js 折线图]                    │             │
│  └──────────────────────────────────────┘             │
│                                                       │
│  上次刷新: 2 分钟前  |  凭证类型: cookie             │
│  凭证: oc_****89ab  |  Base URL: opencode.ai        │
└──────────────────────────────────────────────────────┘
```

### 10.3 AddQuotaSourceDialog UX 流程

```
步骤 1: 选择额度源类型
        显示 8 个类型卡片（图标 + 名称）
        
步骤 2: 选择录入方式
        ┌────────────────────┐
        │ 📋 粘贴 cURL (推荐) │ → 显示 cURL 文本区
        │ 🔧 手动输入        │ → 显示表单字段
        │ 📖 查看官方文档     │ → 打开浏览器
        └────────────────────┘
        
步骤 3a (cURL):
        粘贴 cURL → 点击"解析"
        → 预览确认弹窗 → 确认 → 保存
        
步骤 3b (手动):
        填写各字段 → 保存
        
步骤 4: 保存后自动跳转到该额度源详情页
```

---

## 11. Settings 设置页

### 11.1 已有配置

| 配置项 | 类型 | 默认值 |
|--------|------|--------|
| 语言 | zh-CN / en-US | 跟随系统 |
| 刷新间隔 | 5/15/30/60 分钟 | 15 |
| 数据导入 | JSON 文件导入 | — |
| 数据导出 | 导出为 JSON | — |

### 11.2 导出/导入内容

导出 JSON 包含：
- `version`: 导出格式版本
- `exportedAt`: 导出时间
- `apiKeys`: API Key 列表（加密字段保持加密状态）
- `quotaSources`: 额度源列表（加密字段保持加密状态）**【新增】**
- `settings`: 全局设置

导入时：
- 支持选择导入项（API Key / 额度源 / 设置）
- 重复检测（基于 _id）+ 覆盖确认
- 导入后刷新对应 store

### 11.3 清理项

- 移除"默认预警阈值"滑块（已无用）
- 移除 `apiKeys.threshold` i18n 翻译键

---

## 12. Testing Strategy

| 层级 | 框架 | 覆盖 |
|------|------|------|
| 单元测试 | Vitest | services/、stores/、db/ |
| 集成测试 | Vitest | 额度源 CRUD → 查询全流程 |

### 12.1 新增测试

| 测试文件 | 内容 |
|---------|------|
| `tests/unit/services/curl-parser.spec.ts` | cURL 解析：规范化、错误处理、边界 |
| `tests/unit/stores/quotaSources.spec.ts` | 额度源 store：CRUD、过期检测 |
| `tests/unit/services/auto-refresh.spec.ts` | 含过期检测 + 重试逻辑 |

### 12.2 现有适配器测试（每个适配器 4 维度）

| 维度 | 说明 |
|------|------|
| isolation | 隔离测试，mock HTTP |
| parse | 响应解析正确性 |
| error | 错误处理（401/超时/解析失败） |
| cache | 缓存命中/失效 |

---

## 13. Boundaries

### ✅ Always do

- API Key 和额度源凭证存储前必须 AES-GCM 加密
- 所有凭证展示时脱敏（`oc_****89ab`）
- 每个 HTTP 请求设超时 5s
- 所有 IO try-catch，失败静默降级
- 额度数据只存 Pinia 内存（不写 utools.db）
- **cURL 解析后必须显示预览让用户确认**
- **凭证过期（401）自动标记并提示用户**
- 每个额度源类型提供官方文档链接

### ❓ Ask first

- 添加新的额度源类型
- 修改 utools.db schema（`_id` 前缀变更）
- 引入新 npm 依赖
- 更改加密方案

### 🚫 Never do

- 不将 API Key 与额度监控混为一谈
- 不将程序运行数据写入同步数据库
- 不在 UI 中明文显示完整凭证
- 不将用户数据上传到第三方
- **不要 cURL 解析后直接保存，必须经过用户预览确认**

---

## 14. 当前代码需要修改的清单

### 14.1 Bug 修复

| # | 问题 | 涉及文件 | 修复内容 |
|---|------|---------|---------|
| B1 | QuotaSourceDetail.vue OpenCode Go 配置错误 | `QuotaSourceDetail.vue` | 修正 configFields（当前错误复制了 Bailian 的字段） |
| B2 | QuotaSourceDetail.vue 缺少 cURL 粘贴 | `QuotaSourceDetail.vue` | 添加 cURL 解析 + 引导区域 |
| B3 | QuotaSourceDetail.vue 缺少引导步骤 | `QuotaSourceDetail.vue` | 添加 step-by-step 指引 |

### 14.2 功能新增

| # | 功能 | 涉及文件 | 说明 |
|---|------|---------|------|
| F1 | 独立 cURL 解析模块 | `src/services/curl-parser.ts` | 从 AddQuotaSourceDialog.vue 抽离 parseCurl |
| F2 | cURL 预览确认弹窗 | `src/components/CurlPreviewDialog.vue` | 解析结果显示 + 用户确认 |
| F3 | 凭证过期检测 | `src/services/quota-checker.ts` | 检测 401 响应，标记过期 |
| F4 | 凭证过期 UI | `src/components/CredentialExpiredBanner.vue` | 过期提示条 |
| F5 | 官方文档链接 | 各适配器文件 + AddQuotaSourceDialog.vue | 每种额度源的官方文档 URL |
| F6 | 导出导入含额度源 | `src/views/Settings.vue` | Settings 导出/导入合并 quotaSources |
| F7 | 自动刷新含过期重试 | `src/services/auto-refresh.ts` | 过期标记 + 重试逻辑 |

### 14.3 清理

| # | 清理项 | 文件 | 说明 |
|---|--------|------|------|
| C1 | Settings 阈值滑块 | `src/views/Settings.vue` | 移除无用滑块 |
| C2 | i18n stale keys | `src/i18n/zh-CN.ts`, `en-US.ts` | 移除 `apiKeys.threshold` |
| C3 | 引导文字 i18n 化 | `src/i18n/zh-CN.ts`, `en-US.ts` | 将 AddQuotaSourceDialog 的硬编码中文引导移到 i18n |

### 14.4 测试新增

| # | 测试 | 文件 |
|---|------|------|
| T1 | curl-parser 单元测试 | `tests/unit/services/curl-parser.spec.ts` |
| T2 | quotaSources store 测试 | `tests/unit/stores/quotaSources.spec.ts` |
| T3 | 过期检测测试 | 在 quota-checker 测试中添加 |

---

## 15. 已确认的设计决策

| 决策 | 结论 |
|------|------|
| cURL 解析范围 | 仅 OpenCode Go 和百炼（cookie 类凭证），其他源直接输入 API Key |
| 凭证引导方式 | 参考 cc-hud，cURL 粘贴即是最好的引导，不需要额外文档链接 |
| 连续失败处理 | 自动刷新时连续 3 次查询失败，自动禁用该额度源（`enabled = false`）+ 通知用户 |

---

> **本 spec 已覆盖用户访谈结果：**
> 1. cURL 粘贴为主 + 手动 fallback
> 2. 所有额度源类型支持官方文档链接
> 3. cURL 解析 → 预览 → 确认流程
> 4. 凭证过期自动检测（401）→ 提示更新
> 5. 三合一刷新机制（手动/进入页面/定时）
> 6. 解析失败 → 错误提示 + 手动 fallback
> 7. 兼容不同额度标准
> 8. 当前布局可接受
>
> **确认后进入 Plan 阶段。**
