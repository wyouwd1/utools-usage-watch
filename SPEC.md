# Spec: utools-usage-watch — AI 模型管理与额度监控工具

> 基于 uTools 的 AI 模型管理与额度监控插件。  
> **API 管理**参考 Cherry Studio 的提供商管理体系。  
> **额度监控**参考 [cc-hud](https://github.com/wyouwd1/cc-hud) 的配额采集架构（供应商适配器 + 缓存 + 三时间窗口模型）。

---

## 1. Objective

### 1.1 用户故事

| 角色 | 需求 |
|------|------|
| **AI 重度用户** | 管理多个 AI 平台的 API Key，统一管理、快速测试、不漏过期 |
| **开发者** | 实时掌握各模型的调用额度，避免额度耗尽导致服务中断 |
| **多账号用户** | 管理多个环境的 Key 配置，方便切换（工作/个人/团队） |

### 1.2 核心目标

1. **API Key 管理** — 类似 Cherry Studio，支持多提供商、多 Key 的增删改查与连通性测试
2. **额度监控** — 类似 cc-hud，采集各供应商的配额数据，展示三时间窗口（滚动/周/月）的使用率
3. **uTools 快速入口** — 输入关键词即可查看额度、切换 Key、测试连通性、接收预警

### 1.3 成功标准

- [ ] 支持 **8+** 主流 AI 提供商
- [ ] 单个 API Key 配置 → 测试全流程 ≤ 5 步
- [ ] 额度看板加载 < 1s（缓存优先）
- [ ] 自动刷新按配置间隔轮询，数据延迟 < TTL + 1 轮询周期
- [ ] 每个提供商适配器有 isolation 测试 + 解析测试 + 错误测试 + 缓存测试
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] uTools 中 `aw` 关键词搜索正常打开
- [ ] 构建产物 < 5MB

---

## 2. Tech Stack

| 层 | 技术 | 说明 |
|----|------|------|
| **平台** | uTools Plugin v6+ | uTools 插件体系，plugin.json 清单 + preload.js |
| **前端** | Vue 3 + Vite | 组合式 API + `<script setup>` |
| **语言** | TypeScript strict | 全栈类型安全 |
| **样式** | Tailwind CSS | 原子化 CSS，快速构建 UI |
| **状态** | Pinia | Vue 3 官方状态管理 |
| **存储** | `utools.db` (CouchDB 兼容) | uTools 官方内置数据库。**存用户数据**（API Key / 设置），**不存程序运行数据**（额度缓存仅存内存） |
| **加密** | Web Crypto API (AES-GCM) | API Key 存储前加密（零依赖） |
| **通知** | `utools.showNotification()` | uTools 系统通知 API，用于额度预警 |
| **i18n** | vue-i18n | 中英双语（默认中文，可切换英文） |
| **HTTP** | fetch (内置) | 轻量请求库，支持 AbortSignal.timeout |
| **图表** | Chart.js | 轻量额度趋势可视化（确认决策） |
| **构建** | Vite | uTools 插件输出到 `dist/`，静态 HTML 加载 |
| **测试** | Vitest | 单元 + 集成测试，Mock `globalThis.utools` |

---

## 3. Commands

```bash
# 开发
pnpm dev              # Vite 开发服务器 + HMR

# 构建
pnpm build            # 生产构建，输出到 dist/

# 类型检查
pnpm type-check       # vue-tsc --noEmit

# Lint
pnpm lint             # eslint src/
pnpm lint:fix         # 自动修复

# 测试
pnpm test             # vitest run
pnpm test:watch       # vitest --watch
pnpm test:coverage    # vitest --coverage
pnpm test:e2e         # Playwright E2E（可选）

# 打包 uTools 插件
pnpm pack-upx         # 打包为 .upx 格式

# 发布前检查（Git hook）
pnpm prepublish       # type-check + lint + test + build
```

---

## 4. Project Structure

```
utools-usage-watch/
├── plugin.json                # uTools 插件清单
├── preload.js                 # uTools 预加载脚本（Node 桥接）
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── SPEC.md                    # 本规范
├── README.md
├── LICENSE
│
├── src/
│   ├── main.ts                # Vue 应用入口
│   ├── App.vue                # 根组件
│   │
│   ├── router/
│   │   └── index.ts           # Vue Router（Hash 模式）
│   │
│   ├── layouts/
│   │   └── MainLayout.vue     # 主布局（侧边导航 + 内容区）
│   │
│   ├── views/                 # 页面级组件
│   │   ├── Dashboard.vue      # 总览面板（最近状态摘要）
│   │   ├── ApiKeys.vue        # API Key 管理列表
│   │   ├── ApiKeyDetail.vue   # 单个 API Key 编辑/配置
│   │   ├── QuotaBoard.vue     # 额度监控看板
│   │   ├── QuotaDetail.vue    # 单模型额度历史趋势
│   │   └── Settings.vue       # 全局设置（刷新间隔、预警阈值等）
│   │
│   ├── components/            # 可复用 UI 组件
│   │   ├── ProviderIcon.vue   # 提供商图标
│   │   ├── KeyStatusBadge.vue # API Key 状态标签
│   │   ├── QuotaGauge.vue     # 进度条仪表盘（参考 cc-hud 配色）
│   │   ├── QuotaTrendChart.vue # 额度趋势折线图
│   │   ├── TestConnection.vue # 连通性测试（连接中/成功/失败动画）
│   │   ├── AddKeyDialog.vue   # 新增 API Key 弹窗表单
│   │   ├── SearchInput.vue    # 搜索/过滤框
│   │   └── AlertToast.vue     # 预警/通知提示
│   │
│   ├── stores/                # Pinia 状态管理
│   │   ├── apiKeys.ts         # API Key CRUD 状态
│   │   ├── quotas.ts          # 额度数据 & 缓存状态
│   │   ├── providers.ts       # 提供商注册表 & 配置
│   │   └── settings.ts        # 全局设置
│   │
│   ├── services/              # 业务逻辑层
│   │   ├── providers/         # ⭐ 供应商适配器（参考 cc-hud 架构）
│   │   │   ├── index.ts       # IProviderAdapter 接口 + 注册表
│   │   │   ├── registry.ts    # 适配器注册 & 发现机制
│   │   │   ├── openai.ts      # OpenAI / 兼容 OpenAI 格式
│   │   │   ├── anthropic.ts   # Anthropic Claude
│   │   │   ├── google.ts      # Google Gemini
│   │   │   ├── azure.ts       # Azure OpenAI
│   │   │   ├── ollama.ts      # Ollama 本地（仅连通性，无额度）
│   │   │   ├── openrouter.ts  # OpenRouter
│   │   │   ├── deepseek.ts    # DeepSeek
│   │   │   ├── moonshot.ts    # Moonshot / Kimi
│   │   │   ├── groq.ts        # Groq
│   │   │   ├── qwen.ts        # 通义千问 (Qwen/DashScope)
│   │   │   └── glm.ts         # GLM (智谱)
│   │   ├── quota-checker.ts   # ⭐ 额度查询引擎（参考 cc-hud 的 withCache）
│   │   ├── key-tester.ts      # API Key 连通性测试
│   │   ├── auto-refresh.ts    # 自动定时刷新调度器
│   │   └── encrypt.ts         # API Key 加密/解密（AES-GCM）
│   │
│   ├── db/                    # utools.db 数据层
│   │   ├── index.ts           # 数据库工具函数 (docId / getByPrefix / putDoc)
│   │   ├── apiKeys.repo.ts    # API Key CRUD（用户数据 → utools.db）
│   │   └── settings.repo.ts   # 设置持久化（用户偏好 → utools.db）
│   │                          # ⚠ 额度缓存/历史属程序运行数据，存 Pinia 内存，不写入 utools.db
│   │
│   ├── types/                 # TypeScript 类型定义
│   │   ├── provider.ts        # IProvider, IProviderAdapter
│   │   ├── apikey.ts          # IApiKey, KeyStatus, ProviderType
│   │   ├── quota.ts           # IQuotaResult, IQuotaWindow, IQuotaHistory
│   │   └── settings.ts        # ISettings
│   │
│   ├── i18n/                  # 国际化（中英双语）
│   │   ├── index.ts           # vue-i18n 配置
│   │   ├── zh-CN.ts           # 中文语言包
│   │   └── en-US.ts           # 英文语言包
│   │
│   ├── utils/                 # 工具函数
│   │   ├── format.ts          # 格式化（百分比、时间、数字）
│   │   ├── validators.ts      # 校验（Key 格式、URL）
│   │   └── time.ts            # 时间工具（倒计时、友好时间）
│   │
│   └── assets/
│       ├── icons/             # 提供商图标（SVG）
│       └── styles/            # 全局样式
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── providers/     # 每个适配器 4 维度测试
│   │   │   │   ├── openai.spec.ts
│   │   │   │   ├── anthropic.spec.ts
│   │   │   │   ├── deepseek.spec.ts
│   │   │   │   ├── moonshot.spec.ts
│   │   │   │   ├── groq.spec.ts
│   │   │   │   ├── qwen.spec.ts
│   │   │   │   └── glm.spec.ts
│   │   │   ├── quota-checker.spec.ts
│   │   │   ├── key-tester.spec.ts
│   │   │   └── encrypt.spec.ts
│   │   ├── stores/
│   │   │   ├── apiKeys.spec.ts
│   │   │   └── quotas.spec.ts
│   │   ├── db/
│   │   │   └── apiKeys.repo.spec.ts
│   │   └── utils/
│   │       ├── format.spec.ts
│   │       └── validators.spec.ts
│   │
│   ├── integration/
│   │   ├── quota-flow.spec.ts     # 添加 Key → 测试 → 查额度全流程
│   │   └── auto-refresh.spec.ts   # 定时刷新 + 缓存一致性
│   │
│   └── e2e/                       # Playwright（可选）
│       └── basic-flow.spec.ts
│
└── docs/
    ├── architecture.md
    ├── add-new-provider.md        # 如何添加新的供应商适配器
    └── faq.md
```

---

## 5. Code Style

### 5.1 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `api-key-detail.vue`, `quota-checker.ts` |
| Vue 组件 | PascalCase | `QuotaGauge.vue`, `KeyStatusBadge.vue` |
| 变量/函数 | camelCase | `apiKeyList`, `fetchQuotaData()` |
| 类型/接口 | PascalCase + `I` 前缀 | `IApiKey`, `IQuotaResult`, `IProviderAdapter` |
| 枚举 | PascalCase + 值 UPPER | `ProviderType.OPENAI`, `KeyStatus.ACTIVE` |
| Pinia Store | `useXxxStore` | `useApiKeysStore`, `useQuotasStore` |
| 常量 | UPPER_SNAKE | `DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000` |
| CSS 类 | kebab-case（Tailwind 优先） | `class="flex items-center gap-2"` |

### 5.2 适配器接口（参考 cc-hud）

```typescript
// src/types/provider.ts
import type { ProviderType } from './apikey'

/** ⭐ 三时间窗口配额模型（参考 cc-hud 设计） */
export interface IQuotaWindows {
  /** 滚动窗口（通常 5 小时） */
  rolling?: IQuotaWindow
  /** 每周窗口（7 天） */
  weekly?: IQuotaWindow
  /** 每月窗口 */
  monthly?: IQuotaWindow
}

export interface IQuotaWindow {
  usedPercent: number           // 已用百分比 0-100
  resetsAt: number | null       // 重置时间戳（ms），null 表示未知
  used: number                  // 已用量
  total: number                 // 总量
  unit: string                  // 单位（tokens / requests / credits / ¥）
}

/** ⭐ 每个供应商适配器必须实现的接口（参考 cc-hud 的模块化设计） */
export interface IProviderAdapter {
  readonly type: ProviderType
  readonly label: string
  readonly hasQuota: boolean    // 是否有额度概念（Ollama=false）

  /** 测试 API Key 连通性 */
  testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult>

  /** 查询配额（cc-hud 核心模式） */
  checkQuota(apiKey: string, baseUrl?: string): Promise<IQuotaWindows | null>
}

export interface ITestResult {
  success: boolean
  statusCode?: number
  latencyMs?: number
  error?: string
  models?: string[]             // 返回可用的模型列表（可选）
}
```

### 5.3 适配器实现示例（参考 cc-hud 的 opencode.ts / moonshot.ts）

```typescript
// src/services/providers/deepseek.ts — 参考 cc-hud balance.ts
import { IProviderAdapter, IQuotaWindows, ITestResult } from '@/types/provider'
import { ProviderType } from '@/types/apikey'

const BASE_URL = 'https://api.deepseek.com'

export class DeepSeekAdapter implements IProviderAdapter {
  readonly type = ProviderType.DEEPSEEK
  readonly label = 'DeepSeek'
  readonly hasQuota = true

  async testConnection(apiKey: string, baseUrl?: string): Promise<ITestResult> {
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl ?? BASE_URL}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      return {
        success: res.ok,
        statusCode: res.status,
        latencyMs: Date.now() - start,
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async checkQuota(apiKey: string, baseUrl?: string): Promise<IQuotaWindows | null> {
    try {
      const res = await fetch(`${baseUrl ?? BASE_URL}/user/balance`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json() as any
      const balance = data?.balance_infos?.[0]?.total_balance
      if (typeof balance !== 'number') return null
      return {
        monthly: {
          usedPercent: 0,        // DeepSeek 只返回余额，无百分比
          resetsAt: null,
          used: 0,
          total: balance,
          unit: '¥',
        },
      }
    } catch {
      return null  // 参考 cc-hud：静默降级
    }
  }
}
```

### 5.4 额度查询引擎示例（参考 cc-hud 的 withCache + fallback 链）

```typescript
// src/services/quota-checker.ts — 参考 cc-hud index.ts 的 fallback 链
import { adapterRegistry } from './providers/registry'
import { useQuotasStore } from '@/stores/quotas'
import { useApiKeysStore } from '@/stores/apiKeys'

const CACHE_TTL = 5 * 60 * 1000  // 5 分钟（同 cc-hud）

export class QuotaChecker {
  /**
   * 查询单个 API Key 的额度
   * 参考 cc-hud：cache → fetch → write cache → return
   */
  async checkSingleKey(apiKeyId: string): Promise<void> {
    const keyStore = useApiKeysStore()
    const quotaStore = useQuotasStore()
    const apiKey = keyStore.getDecryptedKey(apiKeyId)
    if (!apiKey) return

    const adapter = adapterRegistry.get(apiKey.provider)
    if (!adapter?.hasQuota) return

    // 检查缓存 TTL（参考 cc-hud withCache）
    const cached = quotaStore.getCached(apiKeyId)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return

    const result = await adapter.checkQuota(apiKey.key, apiKey.baseUrl)
    if (result) {
      quotaStore.updateQuota(apiKeyId, result)
    }
  }

  /**
   * 批量刷新所有 Key 的额度
   * 参考 cc-hud：Promise.all 并行查询各后端
   */
  async refreshAll(): Promise<void> {
    const keyStore = useApiKeysStore()
    const activeKeys = keyStore.activeKeys
    await Promise.allSettled(
      activeKeys.map(k => this.checkSingleKey(k.id))
    )
  }
}
```

### 5.5 Vue 组件示例

```vue
<!-- src/components/QuotaGauge.vue — 参考 cc-hud render.ts 配色 -->
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  usedPercent: number | null  // null = 尚未采集
  label: string
  resetsAt?: number | null
  compact?: boolean
}>()

const clamped = computed(() => {
  if (props.usedPercent === null) return null
  return Math.max(0, Math.min(100, Math.round(props.usedPercent)))
})

// 参考 cc-hud color()：green ≤50, yellow ≤70, peach ≤85, red >85
const colorClass = computed(() => {
  if (clamped.value === null) return 'bg-gray-300'
  if (clamped.value > 85) return 'bg-red-500'
  if (clamped.value > 70) return 'bg-orange-400'
  if (clamped.value > 50) return 'bg-yellow-400'
  return 'bg-green-500'
})

const textColorClass = computed(() => {
  if (clamped.value === null) return 'text-gray-400'
  if (clamped.value > 85) return 'text-red-600'
  if (clamped.value > 70) return 'text-orange-500'
  if (clamped.value > 50) return 'text-yellow-600'
  return 'text-green-600'
})

const countdown = computed(() => {
  if (!props.resetsAt) return null
  const ms = props.resetsAt - Date.now()
  if (ms <= 0) return null
  const h = ms / 3600000
  if (h >= 24) return `${Math.round(h / 24)}d`
  if (h >= 1) return `${Math.round(h)}h`
  return `${Math.round(ms / 60000)}m`
})
</script>

<template>
  <div class="quota-gauge" :class="compact ? 'flex items-center gap-2' : 'p-3'">
    <div v-if="!compact" class="flex justify-between mb-1.5">
      <span class="text-sm font-medium text-gray-700 truncate">{{ label }}</span>
      <span v-if="clamped !== null" :class="['text-sm font-semibold', textColorClass]">
        {{ clamped }}%
      </span>
    </div>
    <div class="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        v-if="clamped !== null"
        :class="['h-full rounded-full transition-all duration-500', colorClass]"
        :style="{ width: clamped + '%' }"
      />
      <div v-else class="h-full rounded-full bg-gray-200 animate-pulse" style="width: 100%" />
    </div>
    <div v-if="!compact && countdown" class="text-xs text-gray-400 mt-1">
      {{ countdown }} 后重置
    </div>
  </div>
</template>
```

### 5.6 编码约束

- `strict: true`，禁止 `any`（可用 `unknown` + 类型守卫）
- Vue 组件全用 `<script setup lang="ts">` 组合式 API
- Pinia Store 全用 setup stores 风格
- 每个后端适配器独立文件，实现 `IProviderAdapter` 接口
- HTTP 请求全设 `AbortSignal.timeout(5000)`（参考 cc-hud `fetchWithTimeout`）
- 所有 IO（网络、DB）必须 try-catch，失败静默降级（参考 cc-hud）
- 不可变数据模式（不直接修改 store state，通过 action 变更）

---

## 6. ⭐ 额度监控架构（参考 cc-hud）

### 6.1 架构总览

```
┌──────────────────────────────────────────────────────┐
│                    QuotaChecker                       │
│  （额度查询引擎：缓存 → 并行查询 → 写入 → 通知）      │
├──────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ OpenAIAdapter│  │ Anhtropic...│  │ DeepSeek... │   │
│  │ isOpenAI()  │  │ isAnthropic│  │ isDeepSeek  │   │
│  │ fetchQuota()│  │ fetchQuota()│  │ fetchQuota()│   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │           │
│         ▼                ▼                ▼           │
│  ┌─────────────────────────────────────────────┐      │
│  │            Cache Layer (Pinia 内存)             │      │
│  │  TTL=5min · stale-while-revalidate            │      │
│  │  ⚠ 程序运行数据，不写 utools.db               │      │
│  └─────────────────────────────────────────────┘      │
│                                                        │
│  ┌─────────────────────────────────────────────┐      │
│  │            AutoRefresh Scheduler             │      │
│  │  配置间隔(5/15/30/60min) · 去重 · 预警触发  │      │
│  └─────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

### 6.2 三时间窗口模型（直接来自 cc-hud）

| 窗口 | 标签 | cc-hud 来源 | 说明 |
|------|------|-------------|------|
| **滚动窗口** | `5h` | `fiveHourPercent` → `rollingPercent` | 短时速率限制（通常 5 小时） |
| **每周窗口** | `7d` | `sevenDayPercent` → `weeklyPercent` | 每周配额（7 天） |
| **每月窗口** | `mo` | `monthlyPercent` | 月度配额 |

### 6.3 Fallback 链（参考 cc-hud index.ts 的优先级回退）

```
每种额度的显示优先级（cc-hud 的 fallback() 模式）：
fiveHourPercent = Claude Code native → OpenCode → MiniMax → 百炼
sevenDayPercent = Claude Code native → OpenCode → MiniMax → 百炼
monthlyPercent  = OpenCode → 百炼
extra           = CC_HUD_EXTRA_FILE → Qwen → Moonshot → Groq → DeepSeek → GLM
```

在我们的 uTools 插件中，每个 Provider Adapter 独立返回 `IQuotaWindows`，由 UI 统一展示。

### 6.4 缓存策略（参考 cc-hud cache.ts）

| 策略 | 值 | 说明 |
|------|-----|------|
| TTL | 5 分钟 | 同 cc-hud 默认值 |
| 存储 | Pinia 内存（Map<apiKeyId, IQuotaCache>） | ⚠ 程序运行数据，不写入 utools.db |
| 过期处理 | stale-while-revalidate | 缓存过期后返回旧数据 + 后台刷新 |
| 强制刷新 | 用户手动点击刷新按钮 | 跳过缓存直接请求 |

### 6.5 颜色分级体系（直接来自 cc-hud render.ts）

| 使用率 | 颜色 | 含义 |
|--------|------|------|
| ≤ 50% | 🟢 绿色 | 充足 |
| 51% – 70% | 🟡 黄色 | 注意 |
| 71% – 85% | 🟠 橙色 | 警戒 |
| > 85% | 🔴 红色 | 告急 |

### 6.6 自动刷新调度器

```
调度器启动 → 读取配置间隔（默认 15min）
         → 遍历所有 ACTIVE Key
         → 检查缓存 TTL
         → 过期则并行拉取
         → 写入缓存 + 更新 Store
         → 检查预警阈值 → 触发通知
         → 等待下一周期
```

---

## 7. Feature Specifications

### 7.1 模块一：API Key 管理

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **提供商配置** | 内置默认提供商配置（endpoint、模型列表、图标） | P0 |
| **Key 增删改查** | CRUD，支持自定义标签（如"个人账号""工作账号"） | P0 |
| **自定义 endpoint** | 兼容 OpenAI API 格式，填入任意 base URL | P0 |
| **一键测试** | 测试连通性，返回状态码、延迟、可用模型列表 | P0 |
| **Key 加密存储** | 写入 utools.db 前 AES-GCM 加密，展示时脱敏 | P0 |
| **搜索/过滤** | 按提供商、状态、标签搜索过滤 | P1 |
| **批量操作** | 批量测试连通性、批量删除 | P1 |
| **导入/导出** | JSON 导入/导出 Key 配置（加密后） | P2 |
| **过期提醒** | Key 创建超过 N 天未更换时提醒 | P2 |

### 7.2 模块二：额度监控看板

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **总览看板** | 所有已配置 Key 的三窗口额度总览（参考 cc-hud HUD） | P0 |
| **单 Key 详情** | 单个 Key 的三窗口使用率 + 趋势图 | P0 |
| **手动刷新** | 点击按钮立即拉取最新额度 | P0 |
| **自动刷新** | 可配置间隔（5/15/30/60 分钟），后台静默轮询 | P0 |
| **进度条仪表** | 环形图/进度条，颜色分级（参考 cc-hud color()） | P0 |
| **重置倒计时** | 各窗口重置时间的友好倒计时（参考 cc-hud formatCountdown） | P1 |
| **历史趋势** | 过去 N 天的调用量变化折线图 | P1 |
| **多维度排序** | 按使用率 / 剩余 / 提供商排序 | P1 |
| **数据导出** | 导出额度记录 CSV/JSON | P2 |

### 7.3 模块三：预警与通知

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **阈值设置** | 每个 Key 可设置独立的预警阈值（百分比） | P1 |
| **应用内通知** | 额度低于阈值时看板角标 + Toast 提示 | P1 |
| **系统通知** | uTools 系统通知推送 | P1 |
| **汇总报告** | 每日/每周汇总各 Key 使用情况 | P2 |

### 7.4 模块四：uTools 集成

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **全局搜索** | 输入 `aw` 打开插件主面板 | P0 |
| **快速查额度** | `aw quota` 直接跳转额度看板 | P1 |
| **快速测试** | `aw test <provider>` 直接测试指定 Key | P1 |
| **托盘图标** | 托盘显示额度预警状态 | P2 |

---

## 8. Data Model

### 8.1 utools.db — 持久化用户数据

> uTools 内置 `utools.db`（CouchDB 兼容 API）。  
> 使用 `_id` 前缀实现逻辑分表：`apikey/<uuid>` / `setting/<key>`
>
> **⚠️ 重要限制（官方文档原文）：**
> - "同步 DB 只存储'用户数据'，不要存储'程序运行数据'"
> - "请避免将高频变化的临时性数据写入同步数据库"
> - **额度缓存和历史属于程序运行数据 → 仅存 Pinia 内存，不写入 utools.db**
>
> **操作规则：**
> - 所有文档必须有 `_id`
> - 更新时必须带上当前的 `_rev`（`put()` 返回的版本号）
> - 查询用 `allDocs("prefix/")` 按 `_id` 前缀过滤

```typescript
// _id 前缀常量
export const COLLECTION = {
  API_KEY: 'apikey/',    // 用户数据 ✅
  SETTING: 'setting/',   // 用户偏好 ✅
  // 额度相关属于程序运行数据，不存 utools.db ❌
} as const

// === 通用操作包装 ===

/** 生成 _id */
export function docId(collection: string, ...parts: string[]): string {
  return collection + parts.join('/')
}

/** 按 _id 前缀查询 */
export function getByPrefix<T>(prefix: string): T[] {
  return utools.db.allDocs(prefix) as unknown as T[]
}

/** 写入文档（自动处理 _rev） */
export function putDoc<T extends { _id: string }>(doc: T): T {
  const existing = utools.db.get(doc._id) as T | null
  if (existing) {
    doc._rev = (existing as any)._rev
  }
  const result = utools.db.put(doc)
  if (result.ok) {
    (doc as any)._rev = result.rev
  }
  return doc
}

/** 删除文档 */
export function removeDoc(_id: string): boolean {
  const result = utools.db.remove(_id)
  return result.ok
}

// === API Key 文档 (apikey/<uuid>) ===
export interface IApiKeyEntity {
  _id: string
  _rev?: string
  type: 'apikey'
  provider: ProviderType
  label: string
  encryptedKey: string           // AES-GCM 加密
  keyPreview: string             // 脱敏 "sk-****abcd"
  baseUrl: string | null
  models: string[]
  status: KeyStatus
  quotaAlertThreshold: number    // 预警阈值 %
  lastTestedAt: number | null
  lastTestResult: ITestResult | null
  sortOrder: number
  createdAt: number
  updatedAt: number
}

// === 设置文档 (setting/<key>) ===
export interface ISettingEntity {
  _id: string
  _rev?: string
  type: 'setting'
  key: string
  value: any
}
```

### 8.2 Pinia 内存状态 — 程序运行数据

> 以下数据属于程序运行数据，**仅存 Pinia Store 内存中**，不写入 utools.db。

```typescript
// === Pinia quotas store (内存) ===
export interface IQuotaCacheState {
  [apiKeyId: string]: {
    rolling: IQuotaWindow | null
    weekly: IQuotaWindow | null
    monthly: IQuotaWindow | null
    fetchedAt: number
    loading: boolean
  }
}

// === 额度历史 (运行时累计，session 级) ===
export interface IQuotaHistoryEntry {
  apiKeyId: string
  usedPercent: number
  recordedAt: number
  source: 'auto' | 'manual'
}

// 额度历史存 Pinia 数组中，session 内有效
// 可选：页面关闭时清除，或每个 session 重新积累
```

---

## 9. Supported Providers

| 提供商 | 适配器 | 额度 API | 额度支持 | 优先级 |
|--------|--------|----------|---------|--------|
| **OpenAI** | `openai.ts` | `GET /v1/dashboard/billing/usage` | ✅ | P0 |
| **Anthropic** | `anthropic.ts` | `GET /v1/messages` (rate limit headers) | ✅ | P0 |
| **Google Gemini** | `google.ts` | `GET /v1/models` (quota info) | ✅ | P0 |
| **Azure OpenAI** | `azure.ts` | Azure Resource Management API | ✅ | P0 |
| **DeepSeek** | `deepseek.ts` | `GET /user/balance` | ✅ 余额 | P0 |
| **OpenRouter** | `openrouter.ts` | `GET /v1/auth/key` | ✅ | P0 |
| **Moonshot (Kimi)** | `moonshot.ts` | `GET /v1/billing/balance` | ✅ 余额 | P1 |
| **Groq** | `groq.ts` | `GET /v1/user/usage` | ✅ 用量 | P1 |
| **通义千问 (Qwen)** | `qwen.ts` | `POST /api/v1/billing/query` | ✅ 余额 | P1 |
| **GLM (智谱)** | `glm.ts` | `GET /api/biz/account/query-customer-account-report` | ✅ 余额 | P1 |
| **Ollama** | `ollama.ts` | 本地模型，无远程额度 API | ❌ 仅连通性 + 模型列表（已确认） | P0 |
| **自定义** | — | 兼容 OpenAI 格式 | 取决于后端 | P0 |

> 以上额度查询端点为参考，实际接入时以各平台最新 API 文档为准。  
> 参考 cc-hud 的设计哲学：**API 不匹配则静默降级**，不影响其他功能。

---

## 10. Testing Strategy

### 10.1 测试层级

| 层级 | 框架 | 覆盖范围 | 目标覆盖率 |
|------|------|---------|-----------|
| **单元测试** | Vitest | services/providers/ (每个适配器 4 维度), stores/, utils/, db/ | ≥ 80% |
| **集成测试** | Vitest | 跨模块流程（添加 Key→测试→查额度→刷新） | 关键路径 100% |
| **E2E 测试** | Playwright | uTools 插件 Web UI 操作（后续可选） | 核心流程 |

### 10.2 适配器 4 维度测试（参考 cc-hud 的测试模式）

每个后端适配器必须覆盖：

| 维度 | 描述 | 示例 |
|------|------|------|
| **Isolation** | 不匹配时返回 null | 非 OpenAI endpoint 返回 null |
| **Parse** | 正确解析 API 响应 | 模拟成功响应，验证 IQuotaWindows 结构 |
| **Error** | HTTP 错误/超时/异常 | 模拟 401/429/timeout → 静默返回 null |
| **Cache** | TTL 命中/过期 | 缓存在 TTL 内不重复请求 |

### 10.3 运行方式

```bash
pnpm test                    # 全部测试
pnpm test:unit               # 仅单元测试
pnpm test:integration        # 仅集成测试
pnpm test -- --coverage      # 覆盖率报告
pnpm test -- --watch         # watch 模式
```

---

## 11. Boundaries

### ✅ Always do（始终执行）

- API Key 写入 utools.db 前必须 AES-GCM 加密
- UI 中 API Key 必须脱敏展示（仅显示前后 4 位：`sk-****abcd`）
- 每个 HTTP 请求设超时（默认 5s，参考 cc-hud）
- 所有网络请求和 DB 读写必须 try-catch，失败静默降级
- 每个新的提供商适配器必须包含 4 维度测试
- 类型检查 + lint + 测试通过后才提交
- 提交信息用中文（参考 cc-hud 的 CLAUDE.md 语言约定）
- 代码注释用中文，变量/函数命名用英文
- ⚠ 额度缓存/历史等**程序运行数据**只存 Pinia 内存，不写入 utools.db

### ❓ Ask first（先问再动）

- 添加新的 ProviderType 和适配器
- 添加新的文档类型（新的 _id 前缀）和对应的 Repository
- 引入新的 npm 依赖（目前预期零外部依赖或极少）
- 修改 `plugin.json` 权限声明
- 更改加密/解密方案
- 修改自动刷新默认策略
- 添加网络请求到新域名

### 🚫 Never do（绝对不做）

- **不要** 在日志、控制台、UI 中明文显示完整 API Key
- **不要** 将 API Key 上传到任何第三方服务
- **不要** 将 API Key 硬编码在源码中
- **不要** 在未加密的通道中传输 API Key
- **不要** 将程序运行数据（额度缓存、历史记录、日志等）写入 utools.db 同步数据库
- **不要** 删除或绕过测试
- **不要** 修改 `node_modules/` 和外部依赖
- **不要** 阻塞 uTools 主线程（长时间同步操作走 Web Worker）

---

## 12. Success Criteria

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | 支持 8+ 默认提供商 | 查看提供商选择列表 |
| 2 | 支持自定义 endpoint | 添加自定义→填入 URL→测试通过 |
| 3 | 添加 Key → 测试 → 看到结果，全流程 ≤ 5 步 | 手工验证 |
| 4 | 额度看板展示三窗口（滚动/周/月）使用率 | 页面截图比对 |
| 5 | 自动刷新按配置间隔正常轮询 | 调试日志 + utools.db 数据检查 |
| 6 | 额度低于阈值时弹出预警 | 手动调低阈值触发 |
| 7 | API Key 在 utools.db 中为加密状态 | utools.db 开发工具检查 |
| 8 | 每个适配器有 4 维度测试（isolation/parse/error/cache） | `pnpm test` 通过 |
| 9 | 单元测试覆盖率 ≥ 80% | `pnpm test --coverage` |
| 10 | uTools 中输入 `aw` 能搜索到插件 | 手工验证 |
| 11 | 构建产物 < 5MB | 检查 `dist/` 大小 |
| 12 | 零外部运行时依赖（仅 devDependencies） | `npm ls --prod` |

---

## 13. 已确认决策（Closed Questions）

> 以下问题已在 Phase 1 Specify 中确认，直接纳入规格。

| # | 问题 | 决策 |
|---|------|------|
| 1 | UI 语言 | **中英双语**（vue-i18n，默认中文，可切换英文） |
| 2 | 发布渠道 | **上架 uTools 官方市场**，打包为 `.upx` 格式 |
| 3 | 图表库 | **Chart.js**（轻量，额度趋势可视化） |
| 4 | Ollama 处理 | **仅显示连通性状态 + 模型列表**，无额度概念 |
| 5 | 模块关系 | **两大独立模块**：API Key 管理（核心）+ 额度监控（附加模块，参考 cc-hud） |

## 14. 发布计划（uTools 官方市场）

### 14.1 上架准备

| 阶段 | 事项 | 说明 |
|------|------|------|
| **开发期** | `plugin.json` 按 uTools 市场规范填写 | name、version、logo、description、author、homepage |
| **构建期** | Vite 构建 → 输出到 `dist/` | 包含所有静态资源 |
| **打包期** | 使用 `utools-pack` 或手动打包 `.upx` | uTools 插件包格式 |
| **提交期** | 通过 uTools 开发者平台提交审核 | 需要开发者账号 |

### 14.2 plugin.json 结构（参考）

```json
{
  "manifest_version": 1,
  "name": "AI Usage Watch",
  "version": "1.0.0",
  "description": "AI 模型 API Key 管理与额度监控工具 / AI API Key Manager & Quota Watcher",
  "author": "wyouwd1",
  "homepage": "https://github.com/wyouwd1/utools-usage-watch",
  "logo": "logo.png",
  "main": "index.html",
  "preload": "preload.js",
  "features": [
    {
      "code": "aw",
      "explain": "输入 aw 打开 AI 额度监控 / Open AI Quota Watcher",
      "cmds": ["aw"]
    }
  ]
}
```

---

## 15. Architecture Overview: 两大模块

```
┌─────────────────────────────────────────────────────────┐
│                    uTools 插件入口                        │
│              plugin.json → preload → index.html          │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│    模块一：API Key 管理   │   模块二：额度监控             │
│    （核心功能）           │   （附加模块，参考 cc-hud）    │
│                          │                              │
│  ┌──────────────────┐   │  ┌─────────────────────────┐  │
│  │ 提供商配置        │   │  │ Provider Adapter 适配器  │  │
│  │ Key CRUD         │   │  │ ← OpenAI / Anthropic    │  │
│  │ 加密存储          │   │  │ ← DeepSeek / Qwen ...  │  │
│  │ 连通性测试        │   │  │ ← 每个模块独立 I/O     │  │
│  │ 模型列表获取      │   │  │                          │  │
│  └──────────────────┘   │  │  QuotaChecker 引擎        │  │
│                          │  │  withCache (5min TTL)   │  │
│                          │  │  三时间窗口模型           │  │
│                          │  │  自动刷新调度器           │  │
│                          │  │  预警阈值检测             │  │
│                          │  └─────────────────────────┘  │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│                    Pinia 状态管理层                        │
│              apiKeys + quotas + providers + settings      │
├─────────────────────────────────────────────────────────┤
│                    utools.db 持久层（用户数据）          │
│           apikey/* · setting/*                         │
│           ⚠ 额度缓存/历史存 Pinia（不写 utools.db）     │
└─────────────────────────────────────────────────────────┘
```

---

## 16. Open Questions（待确认）

> ~~以下问题已全部关闭，见第 13 节。~~ 如有其他疑问请提出。
