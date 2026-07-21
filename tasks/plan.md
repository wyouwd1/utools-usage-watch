# Implementation Plan: utools-usage-watch

> AI 模型管理与额度监控 uTools 插件
> 参考: Cherry Studio (API Key 管理) + cc-hud (额度监控架构)

---

## Overview

构建一个 uTools 插件，两大模块：
1. **API Key 管理** — 多提供商 Key 的 CRUD、加密存储、连通性测试
2. **额度监控** — 参考 cc-hud 的适配器架构 + 三时间窗口模型 + 缓存策略

分 **9 个 Phase** 实施，每个 Phase 包含多个 Task，每个 Task 是垂直切片（端到端可用）。

---

## Architecture Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| **存储** | `utools.db` (CouchDB 兼容) | uTools 官方内置数据库。`allDocs("prefix/")` 前缀查询，`_rev` 版本管理。**只存用户数据（API Key / 设置）**，额度缓存等程序数据存 Pinia 内存 |
| **加密** | Web Crypto API (AES-GCM) | uTools WebView 基于 Chromium，内置支持，零依赖 |
| **HTTP** | `fetch` + `AbortSignal.timeout` | 内置 API，参考 cc-hud fetchWithTimeout |
| **状态** | Pinia setup stores | Vue 3 官方，TypeScript 友好 |
| **i18n** | vue-i18n | 中英双语，默认中文 |
| **图表** | Chart.js | 轻量（~60KB），额度趋势可视化 |
| **构建** | Vite | 静态输出，uTools 直接加载 |
| **架构模式** | Provider Adapter（参考 cc-hud） | 每个提供商独立模块，统一接口 |
| **缓存策略** | withCache（参考 cc-hud） | 5min TTL，stale-while-revalidate |
| **三时间窗口** | rolling(5h) / weekly(7d) / monthly | 直接复用 cc-hud 的数据模型 |

---

## Dependency Graph

```
Phase 1 (Scaffold)
    └── pnpm init, Vite+Vue+TS, plugin.json, router, i18n, vitest
        │
        ▼
Phase 2 (Data Layer + Encrypt)
    ├── utools.db schema (apikey/* / setting/*)
    │   ⚠ 额度数据属程序运行数据，存 Pinia 内存
    ├── Repository CRUD
    └── Web Crypto AES-GCM
        │
        ▼
Phase 3 (API Key Management UI)
    ├── Pinia stores (apiKeys, providers)
    ├── List view (ApiKeys.vue)
    └── Add/Edit view (ApiKeyDetail.vue, AddKeyDialog.vue)
        │
        ▼
Phase 4 (Provider Adapters + Test)
    ├── IProviderAdapter interface + registry
    ├── 5 core adapters (OpenAI/Anthropic/DeepSeek/OpenRouter/Ollama)
    └── TestConnection.vue + key-tester.ts
        │
        ▼
Phase 5 (Quota Monitoring) ←── cc-hud withCache pattern
    ├── QuotaChecker engine
    ├── Quota gauges + board UI
    └── Auto-refresh scheduler
        │
        ├─────────────────────┐
        ▼                     ▼
Phase 6 (More Adapters)   Phase 7 (Alerts + i18n full)
    │                        │
    └──────────┬─────────────┘
               ▼
        Phase 8 (uTools Integration + Package)
               │
               ▼
        Phase 9 (Final QA)
```

---

## Task List

### Phase 1: 项目脚手架 (Scaffold)

#### Task 1.1: 初始化 npm 项目 + 安装依赖

**Description:** 创建 package.json、配置 Vite + Vue 3 + TypeScript + Tailwind CSS，安装所有必需的依赖。

**Steps:**
1. `pnpm init` 初始化 package.json
2. 安装依赖:
   - 运行时: `vue@3`, `vue-router@4`, `pinia`, `vue-i18n`, `chart.js`, `vue-chartjs`
   - 开发时: `vite`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`, `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@vue/test-utils`, `jsdom`
3. 配置 `tsconfig.json` (strict: true, path alias `@/`)
4. 配置 `vite.config.ts` (vue plugin + resolve alias)
5. 配置 `tailwind.config.js` + `postcss.config.js`

**Acceptance:**
- [ ] `pnpm install` 无报错
- [ ] `tsconfig.json` 启用 strict 模式
- [ ] `vite.config.ts` 有 `@/` → `src/` alias

**Files:** `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`

**Size:** M (4 files)

---

#### Task 1.2: uTools 插件骨架

**Description:** 创建 plugin.json、preload.js、index.html，使 uTools 能识别和加载插件。

**Steps:**
1. `plugin.json` — manifest v1, name "AI Usage Watch", features 含 `aw` 关键词
2. `preload.js` — 基础 Node 桥接，expose `window.utools`
3. `index.html` — `<!DOCTYPE html>` + `<div id="app">` + `<script type="module" src="/src/main.ts">`

**Acceptance:**
- [ ] uTools 可识别 plugin.json 并注册 `aw` 关键词
- [ ] index.html 正确加载 Vue 入口
- [ ] preload.js 无语法错误

**Files:** `plugin.json`, `preload.js`, `index.html`

**Size:** S (3 files)

---

#### Task 1.3: Vue 应用骨架 + 路由 + 布局

**Description:** 创建 Vue 入口、路由配置、主布局组件，搭建前端应用基本骨架。

**Steps:**
1. `src/main.ts` — createApp + createPinia + createRouter + createI18n
2. `src/App.vue` — `<router-view />`
3. `src/router/index.ts` — hash 模式路由
   - `/` → Dashboard
   - `/api-keys` → ApiKeys
   - `/api-keys/:id` → ApiKeyDetail
   - `/quota` → QuotaBoard
   - `/quota/:id` → QuotaDetail
   - `/settings` → Settings
4. `src/layouts/MainLayout.vue` — 侧边导航 + 内容区
   - 导航项：概览 / API Keys / 额度监控 / 设置
   - 当前语言切换按钮

**Acceptance:**
- [ ] `pnpm dev` 启动后浏览器渲染含侧边栏的布局
- [ ] 点击侧边栏可切换路由
- [ ] 路由切换后 URL 更新（hash 模式）

**Files:** `src/main.ts`, `src/App.vue`, `src/router/index.ts`, `src/layouts/MainLayout.vue`

**Size:** M (4 files)

---

#### Task 1.4: i18n 初始化 + 测试基础设施

**Description:** 配置 vue-i18n 中英双语，设置 Vitest 测试框架，编写第一个冒烟测试。

**Steps:**
1. `src/i18n/index.ts` — vue-i18n createI18n({ locale: 'zh-CN', fallbackLocale: 'en-US' })
2. `src/i18n/zh-CN.ts` — 导航、通用 UI 的中文翻译
3. `src/i18n/en-US.ts` — 导航、通用 UI 的英文翻译
4. `vitest.config.ts` — 配置 environment: 'jsdom', alias 匹配 vite
5. `tests/unit/smoke.spec.ts` — 最简单的 "true === true" 测试

**Acceptance:**
- [ ] 页面导航栏文字可切换中/英文
- [ ] `pnpm test` 通过冒烟测试
- [ ] vitest 配置正确（jsdom 环境）

**Files:** `src/i18n/index.ts`, `src/i18n/zh-CN.ts`, `src/i18n/en-US.ts`, `vitest.config.ts`, `tests/unit/smoke.spec.ts`

**Size:** M (5 files)

---

### ✅ Checkpoint: Phase 1 — 基础架构已完成

- [ ] `pnpm dev` 启动正常，浏览器渲染带导航的空白布局
- [ ] 中英文切换生效
- [ ] `pnpm test` 通过
- [ ] `pnpm type-check` 无类型错误
- [ ] uTools 加载 dist 可正常显示
- [ ] **检查点：确认后再进入 Phase 2**

---

### Phase 2: 数据层 + 加密

#### Task 2.1: 类型定义 + utools.db 集合设计

**Description:** 定义所有 TypeScript 类型，设计 utools.db 的 `_id` 前缀方案，编写通用操作包装。

**Steps:**
1. `src/types/apikey.ts` — IApiKeyEntity, KeyStatus enum, ProviderType enum
2. `src/types/quota.ts` — IQuotaWindows, IQuotaWindow, IQuotaHistoryEntity
3. `src/types/settings.ts` — ISettingEntity
4. `src/db/index.ts` — COLLECTION 常量 + 通用工具函数
   - `docId(collection, ...parts)` 拼装 `_id`
   - `getByPrefix<T>(prefix)` 封装 `allDocs()`
   - `putDoc<T>(doc)` 封装 `put()`（自动处理 `_rev`）

**Acceptance:**
- [ ] utools.db 集合前缀定义清晰（`apikey/` / `setting/`）— 额度数据不写入 utools.db
- [ ] TypeScript 类型定义完整，无 `any`
- [ ] ProviderType 枚举包含所有计划支持的提供商

**Files:** `src/types/apikey.ts`, `src/types/quota.ts`, `src/types/settings.ts`, `src/db/index.ts`

**Size:** M (4 files)

---

#### Task 2.2: Repository 层 — API Key CRUD

**Description:** 实现 API Key 的完整 CRUD 操作，基于 utools.db API。

**Steps:**
1. `src/db/apiKeys.repo.ts`:
   - `getAll()` → `allDocs("apikey/")` → 按 sortOrder 排序
   - `getById(id)` → `utools.db.get("apikey/" + id)`
   - `add(data)` → `utools.db.put({ _id: "apikey/" + uuid, type: 'apikey', ...data })` → 保存返回的 `rev`
   - `update(id, data)` → 先 `get()` 获取当前 `_rev`，再 `put()`
   - `remove(id)` → `utools.db.remove("apikey/" + id)`
   - `search(query)` → getAll() 后 JS 过滤（按 label/provider 模糊匹配）

**Acceptance:**
- [ ] 4 种 CRUD 操作均通过
- [ ] 搜索可按 provider 过滤、按 label 模糊匹配
- [ ] 新增后自动生成 id (uuid) 和 timestamp

**Files:** `src/db/apiKeys.repo.ts`

**Size:** M (1 file)

---

#### Task 2.3: Repository 层 — 设置

**Description:** 实现 settings repository，基于 utools.db API。

**Steps:**
1. `src/db/settings.repo.ts`:
   - `get(key)` → `utools.db.get("setting/" + key)?.value`
   - `set(key, value)` → 先 get 获取 `_rev`，再 `putDoc`
   - `getAll()` → `allDocs("setting/")` → key-value map

**Acceptance:**
- [ ] 设置支持 get/set/getAll
- [ ] 设置值存 utools.db（用户偏好数据 ✅）

**Files:** `src/db/settings.repo.ts`

**Acceptance:**
- [ ] 额度缓存 upsert（存在则更新，不存在则插入）
- [ ] 历史记录按时间倒序查询
- [ ] 设置支持 get/set/delete

**Files:** `src/db/apiKeys.repo.ts`, `src/db/settings.repo.ts`

**Size:** M (3 files)

---

#### Task 2.4: API Key 加密/解密服务

**Description:** 使用 Web Crypto API 实现 AES-GCM 加密，确保 API Key 安全存储。

**Steps:**
1. `src/services/encrypt.ts`:
   - `generateKey()` → 生成 AES-GCM 密钥，存储在 settings 表
   - `encrypt(plaintext)` → AES-GCM 加密 → base64 编码
   - `decrypt(ciphertext)` → base64 解码 → AES-GCM 解密
   - 密钥派生方案：PBKDF2（用户首次生成随机 salt + 派生密钥）
2. 密钥持久化到 settings 表 (`key: 'encryption_key'`)

**Acceptance:**
- [ ] `encrypt("test-key")` 返回 base64 密文
- [ ] `decrypt(密文)` 还原为 `"test-key"`
- [ ] 两次加密同一内容得到不同的密文（AES-GCM 含随机 IV）
- [ ] 加密密钥首次自动生成并持久化
- [ ] 错误密钥解密抛出友好错误

**Files:** `src/services/encrypt.ts`

**Size:** M (1 file)

---

#### Task 2.5: 校验工具

**Description:** API Key 格式校验和 URL 校验工具函数。

**Steps:**
1. `src/utils/validators.ts`:
   - `isValidApiKey(key, provider)` — 各提供商的 Key 格式校验
   - `isValidUrl(url)` — endpoint URL 格式校验
   - `isValidProviderType(type)` — 提供商类型校验

**Acceptance:**
- [ ] OpenAI 格式 (`sk-...`) 正确识别
- [ ] Anthropic 格式 (`sk-ant-...`) 正确识别
- [ ] 非法 URL 被拒绝

**Files:** `src/utils/validators.ts`

**Size:** S (1 file)

---

#### Task 2.6: 数据层测试

**Description:** 为 Phase 2 的核心逻辑编写测试。

**Steps:**
1. `tests/unit/db/apiKeys.repo.spec.ts` — CRUD + 搜索测试
2. `tests/unit/services/encrypt.spec.ts` — 加密/解密/密钥生成测试
3. `tests/unit/utils/validators.spec.ts` — 校验函数测试

**Acceptance:**
- [ ] 所有测试通过
- [ ] 加密测试覆盖：正常流程 + 错误密钥 + 空值
- [ ] CRUD 测试覆盖：增删改查 + 边界情况

**Files:** `tests/unit/db/apiKeys.repo.spec.ts`, `tests/unit/services/encrypt.spec.ts`, `tests/unit/utils/validators.spec.ts`

**Size:** M (3 files)

---

### ✅ Checkpoint: Phase 2 — 数据层已完成

- [ ] `pnpm test` 全部通过（含新测试）
- [ ] utools.db 集合设计完成，`allDocs("prefix/")` 按前缀查询正常
- [ ] API Key 加密存储 → 读取解密全流程验证
- [ ] 设置存储/读取正确
- [ ] ⚠ 确认额度缓存等程序运行数据不写入 utools.db
- [ ] `pnpm type-check` 无错误
- [ ] **检查点：确认数据层稳定后再进入 Phase 3**

---

### Phase 3: API Key 管理界面

#### Task 3.1: Pinia 状态管理 — apiKeys + providers

**Description:** 创建 API Key 和提供商的 Pinia store。

**Steps:**
1. `src/stores/apiKeys.ts` — setup store:
   - state: `apiKeyList`, `loading`, `error`
   - getters: `activeKeys`, `getByProvider(provider)`, `getById(id)`
   - actions: `fetchAll()`, `addKey()`, `updateKey()`, `removeKey()`, `searchKeys()`
2. `src/stores/providers.ts` — setup store:
   - state: `defaultProviders`（预定义提供商列表含 endpoint、默认模型等）
   - getters: `getProvider(type)`, `allProviders`
   - actions: `registerCustomProvider()`

**Acceptance:**
- [ ] store 可加载 API Key 列表（从 utools.db）
- [ ] addKey → 写入 DB → 列表更新
- [ ] 提供商 store 返回预设提供商配置

**Files:** `src/stores/apiKeys.ts`, `src/stores/providers.ts`

**Size:** M (2 files)

---

#### Task 3.2: API Key 列表页

**Description:** API Key 列表展示界面，按提供商分组，支持搜索过滤。

**Steps:**
1. `src/views/ApiKeys.vue`:
   - 顶部：搜索框 + "添加 Key" 按钮
   - 主区域：按 ProviderType 分组的卡片列表
   - 每个卡片：提供商图标 + 标签 + 脱敏 Key + 状态 Badge + 最近测试 + 操作按钮
   - 操作按钮组：编辑 / 测试连接 / 删除
2. `src/components/SearchInput.vue` — 搜索输入框（v-model + debounce）

**Acceptance:**
- [ ] 空状态时显示 "暂无 API Key，点击添加" 引导
- [ ] 列表按提供商分组展示
- [ ] 搜索框输入实时过滤（按 label / provider 名称）
- [ ] 每行显示脱敏 Key（`sk-****abcd`）
- [ ] 删除操作有确认弹窗

**Files:** `src/views/ApiKeys.vue`, `src/components/SearchInput.vue`

**Size:** L (2 files, 但 UI 复杂度高)

---

#### Task 3.3: API Key 编辑/新增界面

**Description:** 添加和编辑 API Key 的表单界面。

**Steps:**
1. `src/views/ApiKeyDetail.vue` — 编辑已有 Key 的完整页面
2. `src/components/AddKeyDialog.vue` — 新增 Key 的弹窗表单
3. 共用表单字段：
   - 提供商选择（下拉，含图标）
   - 自定义标签（文本输入）
   - API Key 输入（password 类型，可切换显示）
   - Base URL（可选，预填默认值）
   - 模型多选（从提供商配置获取可选模型列表）

**Acceptance:**
- [ ] 新增表单保存后列表立即更新
- [ ] 编辑表单预填已有数据
- [ ] 表单校验：Key 必填、URL 格式校验
- [ ] 取消编辑返回列表页

**Files:** `src/views/ApiKeyDetail.vue`, `src/components/AddKeyDialog.vue`

**Size:** L (2 files, 表单逻辑复杂)

---

#### Task 3.4: 状态显示组件

**Description:** 提供商图标和 Key 状态标签组件。

**Steps:**
1. `src/components/ProviderIcon.vue` — 根据 ProviderType 显示对应 SVG 图标
2. `src/components/KeyStatusBadge.vue` — 状态标签（颜色 + 文案）
   - ACTIVE → 绿色
   - INACTIVE → 灰色
   - EXPIRED → 黄色
   - ERROR → 红色
   - UNTESTED → 蓝色虚线

**Acceptance:**
- [ ] 每个提供商有对应的图标
- [ ] 状态标签颜色正确
- [ ] 图标和标签在列表中正常渲染

**Files:** `src/components/ProviderIcon.vue`, `src/components/KeyStatusBadge.vue`

**Size:** S (2 files)

---

#### Task 3.5: API Key Store 测试

**Description:** 为 apiKeys store 编写单元测试。

**Steps:**
1. `tests/unit/stores/apiKeys.spec.ts` — 使用 Pinia testing + utools.db mock
   - 添加/删除/更新 Key 后状态正确
   - 搜索过滤逻辑正确
   - 状态管理（loading/error）正确切换

**Acceptance:**
- [ ] 测试通过
- [ ] 覆盖 CRUD 操作的 store 状态变化

**Files:** `tests/unit/stores/apiKeys.spec.ts`

**Size:** M (1 file)

---

### ✅ Checkpoint: Phase 3 — API Key 管理 UI 已完成

- [ ] API Key CRUD（新增/编辑/删除/搜索）完整可用
- [ ] 加密存储验证（DB 中不可读明文）
- [ ] 搜索过滤正常
- [ ] `pnpm test` 通过
- [ ] **检查点：确认 UI 流程后再进入 Phase 4**

---

### Phase 4: 提供商适配器 + 连通性测试

#### Task 4.1: Adapter 接口 + 注册表

**Description:** 定义 IProviderAdapter 接口和适配器注册机制。

**Steps:**
1. `src/services/providers/index.ts` — 接口定义:
   - `testConnection(apiKey, baseUrl?) → Promise<ITestResult>`
   - `checkQuota(apiKey, baseUrl?) → Promise<IQuotaWindows | null>`
   - `fetchModels(apiKey, baseUrl?) → Promise<string[] | null>` (Ollama 需要)
2. `src/services/providers/registry.ts` — Registry class:
   - `register(adapter)` / `get(type)` / `getAll()` / `listTypes()`
   - 启动时自动注册所有内置适配器

**Acceptance:**
- [ ] 接口定义完整，类型安全
- [ ] 注册表可注册和查询适配器
- [ ] 未知 provider type 返回 null

**Files:** `src/services/providers/index.ts`, `src/services/providers/registry.ts`

**Size:** M (2 files)

---

#### Task 4.2: 核心适配器 × 5

**Description:** 实现 5 个核心提供商适配器，参考 cc-hud 的模块模式。

**Steps:**
每个适配器实现 IProviderAdapter：

1. `src/services/providers/openai.ts`:
   - test: `GET /v1/models` + 检查 Authorization header
   - quota: `GET /v1/dashboard/billing/usage`（需 subscription_id）

2. `src/services/providers/anthropic.ts`:
   - test: `POST /v1/messages` 的 lightweight 验证
   - quota: 从 response headers 解析 `request-limit` / `request-remaining`

3. `src/services/providers/deepseek.ts`（参考 cc-hud balance.ts）:
   - test: `GET /v1/models`
   - quota: `GET /user/balance` → 解析 `balance_infos[0].total_balance`

4. `src/services/providers/openrouter.ts`:
   - test: `GET /v1/auth/key`
   - quota: 解析 credits 剩余

5. `src/services/providers/ollama.ts`:
   - test: `GET /api/tags` → 连通性检查
   - quota: 返回 null（无额度概念）
   - fetchModels: `GET /api/tags` → 返回本地模型列表

**Acceptance:**
- [ ] 每个适配器的 testConnection 在模拟成功响应时返回 success=true
- [ ] 每个适配器在模拟 HTTP 错误时返回 success=false + error 信息
- [ ] Ollama 的 fetchModels 返回模型名称数组
- [ ] 所有适配器通过 TypeScript 类型检查

**Files:** `src/services/providers/openai.ts`, `src/services/providers/anthropic.ts`, `src/services/providers/deepseek.ts`, `src/services/providers/openrouter.ts`, `src/services/providers/ollama.ts`

**Size:** L (5 files)

---

#### Task 4.3: Key Tester 服务

**Description:** 统一的 API Key 连通性测试服务，串联适配器 + 更新状态。

**Steps:**
1. `src/services/key-tester.ts`:
   - `testKey(apiKeyId)` → 从 store 获取 Key → 查找适配器 → 调用 testConnection → 更新 store
   - 更新 lastTestedAt + lastTestResult + status
   - 超时处理（5s 硬超时，参考 cc-hud TIMEOUT_MS）

**Acceptance:**
- [ ] 测试成功后更新 Key 状态为 ACTIVE
- [ ] 测试失败后更新为 ERROR（保留原因为 lastTestResult.error）
- [ ] 超时返回友好错误 "连接超时（5s）"

**Files:** `src/services/key-tester.ts`

**Size:** S (1 file)

---

#### Task 4.4: 测试连通性 UI 组件

**Description:** 可复用的连通性测试按钮和结果展示组件。

**Steps:**
1. `src/components/TestConnection.vue`:
   - 按钮：点击 → 显示加载动画 → 显示结果
   - 结果显示：✅ 成功 (XXXms) 或 ❌ 失败: 错误原因
   - 如果是成功 + adapter 支持模型列表 → 显示可用模型列表

**Acceptance:**
- [ ] 点击按钮后显示加载动画
- [ ] 测试结果显示状态码 + 延迟（ms）
- [ ] Ollama 测试成功后显示本地模型下拉列表
- [ ] 失败时显示错误信息

**Files:** `src/components/TestConnection.vue`

**Size:** M (1 file)

---

#### Task 4.5: 适配器 4 维度测试

**Description:** 每个适配器编写 isolation / parse / error / cache 测试。

**Steps:**
参考 cc-hud 的测试模式，每个适配器一个测试文件：
1. `tests/unit/services/providers/openai.spec.ts`
2. `tests/unit/services/providers/anthropic.spec.ts`
3. `tests/unit/services/providers/deepseek.spec.ts`
4. `tests/unit/services/providers/openrouter.spec.ts`
5. `tests/unit/services/providers/ollama.spec.ts`
6. `tests/unit/services/key-tester.spec.ts`

每个测试覆盖：
- **Isolation** — 不相关 provider 返回 null
- **Parse** — 正确解析模拟响应
- **Error** — HTTP 错误/超时 → 静默返回 null
- **Cache** — 缓存命中不重复请求（Key Tester 测试）

**Acceptance:**
- [ ] 每个适配器 4 个维度全部覆盖
- [ ] 全部测试通过
- [ ] 使用 mocked fetch（vitest mock 或 MSW）

**Files:** 6 个测试文件

**Size:** L (6 files)

---

### ✅ Checkpoint: Phase 4 — 适配器系统已完成

- [ ] 5 个核心适配器可用
- [ ] API Key 详情页可一键测试连通性
- [ ] 全部适配器测试通过（4 维度）
- [ ] Ollama 连通性测试显示本地模型列表
- [ ] `pnpm test` 全通过
- [ ] **检查点：确认适配器系统稳定后再进入 Phase 5**

---

### Phase 5: 额度监控模块 (核心模块，参考 cc-hud)

#### Task 5.1: 适配器额度查询扩展

**Description:** 在 Phase 4 的适配器中追加 checkQuota() 完整实现。

**Steps:**
1. `src/services/providers/openai.ts` — 补充 checkQuota:
   - `GET /v1/dashboard/billing/usage?start_date=&end_date=` → `{total_usage, total_granted}`
   - 解析为 IQuotaWindows（weekly 窗口）

2. `src/services/providers/anthropic.ts` — 补充 checkQuota:
   - `POST /v1/messages` 的 response headers: `request-limit` / `request-remaining`
   - 注意：实际调用会消耗额度，只在用户触发时调用

3. `src/services/providers/deepseek.ts` — 完善 checkQuota:
   - `GET /user/balance` → `balance_infos[0].total_balance`
   - 解析为 IQuotaWindows.monthly

4. `src/services/providers/openrouter.ts` — 补充 checkQuota:
   - `GET /v1/auth/key` → `{data: {credits, usage}}`

**Acceptance:**
- [ ] 每个适配器的 checkQuota 返回正确的 IQuotaWindows 结构
- [ ] API 错误时静默返回 null（不抛异常）
- [ ] 与 testConnection 共享超时配置

**Files:** 在 Phase 4 适配器中追加方法

**Size:** M (4 files 追加)

---

#### Task 5.2: 额度查询引擎 (QuotaChecker)

**Description:** 实现 QuotaChecker 引擎，参考 cc-hud 的 withCache 模式。额度缓存存 Pinia 内存（不入 utools.db）。

**Steps:**
1. `src/services/quota-checker.ts`:
   - `checkSingleKey(apiKeyId)`:
     - 读取 Pinia store 中的缓存 → 检查 TTL（5min）→ 缓存命中直接返回
     - TTL 过期 → 调用 adapter.checkQuota → 更新 Pinia store → 返回
     - 网络错误 → 返回过期缓存（stale-while-revalidate）
   - `refreshAll()`:
     - Promise.allSettled 并行刷新所有 ACTIVE Key
     - 跳过无额度概念的适配器（Ollama）
   - `refreshKey(keyId)` — 强制刷新（跳过缓存）

**Acceptance:**
- [ ] TTL 内不重复请求
- [ ] 网络错误时使用过期缓存
- [ ] 强制刷新跳过缓存
- [ ] refreshAll 并行刷新所有 Key

**Files:** `src/services/quota-checker.ts`

**Size:** L (1 file, 但逻辑复杂度高)

---

#### Task 5.3: 自动刷新调度器 (AutoRefreshScheduler)

**Description:** 实现后台定时刷新调度器，参考 cc-hud 的快速失败哲学。

**Steps:**
1. `src/services/auto-refresh.ts`:
   - `start(intervalMs)` — 启动定时轮询，默认 15 分钟
   - `stop()` — 停止调度
   - `setInterval(minutes)` — 动态调整间隔
   - 页面可见性感知：页面隐藏时暂停轮询（`document.visibilitychange`）
   - 去重：同一 Key 在 TTL 内不重复刷新

**Acceptance:**
- [ ] 按配置间隔自动调用 QuotaChecker.refreshAll()
- [ ] 页面隐藏时暂停，重新可见时恢复
- [ ] 切换间隔后下一周期立即生效
- [ ] 停止后不再触发

**Files:** `src/services/auto-refresh.ts`

**Size:** M (1 file)

---

#### Task 5.4: Pinia Quota Store

**Description:** 额度数据的 Pinia 状态管理。

**Steps:**
1. `src/stores/quotas.ts` — setup store:
   - state: `quotaMap: Map<apiKeyId, IQuotaCacheEntity>`, `loadingKeys: Set<string>`, `lastRefreshAt`
   - getters: `getQuota(keyId)`, `lowestQuotas(n)`（最低的 N 个）, `isLoading(keyId)`
   - actions: `refreshAll()`, `refreshKey(keyId)`, `updateQuota(keyId, data)`, `clearCache()`

**Acceptance:**
- [ ] quotaMap 按 apiKeyId 索引
- [ ] 刷新时 loadingKeys 正确变化
- [ ] lowestQuotas 按使用率降序排列

**Files:** `src/stores/quotas.ts`

**Size:** M (1 file)

---

#### Task 5.5: 额度看板 UI (QuotaBoard + QuotaGauge)

**Description:** 额度总览看板和进度条组件，应用 cc-hud 的配色方案。

**Steps:**
1. `src/views/QuotaBoard.vue`:
   - 顶部：手动刷新按钮 + 上次刷新时间
   - 主体：所有 Key 的额度卡片网格
   - 每个卡片：Key 标签 + 提供商图标 + 
     - **滚动窗口** (5h): QuotaGauge
     - **每周窗口** (7d): QuotaGauge
     - **每月窗口**: QuotaGauge
   - 空状态：引导用户先添加 API Key
   - 排序：按使用率从高到低

2. `src/components/QuotaGauge.vue`（参考 cc-hud render.ts）:
   - 进度条，宽度 100%，高度 12px
   - 颜色分级：🟢 ≤50% / 🟡 ≤70% / 🟠 ≤85% / 🔴 >85%
   - 显示：百分比 + 重置倒计时（参考 cc-hud formatCountdown）
   - null 状态（尚未采集）显示脉冲动画

**Acceptance:**
- [ ] 额度看板展示所有已配置 Key
- [ ] 三窗口分组正确
- [ ] 颜色分级与 cc-hud 一致
- [ ] 进度条动画流畅
- [ ] 刷新按钮工作正常
- [ ] 重置倒计时友好显示（"2h" / "3d"）

**Files:** `src/views/QuotaBoard.vue`, `src/components/QuotaGauge.vue`

**Size:** L (2 files, UI 复杂度高)

---

#### Task 5.6: 额度详情 + 趋势图

**Description:** 单个 API Key 的额度详情页和趋势折线图。

**Steps:**
1. `src/views/QuotaDetail.vue`:
   - 顶部：Key 信息卡（提供商 + 标签 + 脱敏 Key）
   - 三窗口进度条展开显示（含 used/total/unit）
   - QuotaTrendChart 组件

2. `src/components/QuotaTrendChart.vue`:
   - Chart.js 折线图
   - X 轴：时间（过去 N 天）
   - Y 轴：使用率 (%)
   - 多条线：滚动 / 周 / 月（如果历史数据支持）
   - 响应式（窗口缩放自适应）

**Acceptance:**
- [ ] 详情页显示完整的额度数据
- [ ] 趋势图渲染正常
- [ ] 无历史数据时显示 "暂无数据" 占位
- [ ] 响应式布局

**Files:** `src/views/QuotaDetail.vue`, `src/components/QuotaTrendChart.vue`

**Size:** M (2 files)

---

#### Task 5.7: 额度模块测试

**Description:** 为 Phase 5 的核心逻辑编写测试。

**Steps:**
1. `tests/unit/services/quota-checker.spec.ts` — 缓存/TTL/并行刷新
2. `tests/unit/services/auto-refresh.spec.ts` — 定时器/可见性/暂停
3. `tests/unit/stores/quotas.spec.ts` — store actions/getters

**Acceptance:**
- [ ] 全部测试通过
- [ ] 缓存测试：TTL 内不重复请求，过期后刷新
- [ ] 自动刷新测试：间隔/暂停/恢复

**Files:** 3 个测试文件

**Size:** M (3 files)

---

### ✅ Checkpoint: Phase 5 — 额度监控已完成

- [ ] 额度看板展示所有 Key 的三窗口使用率
- [ ] 颜色分级正确
- [ ] 手动刷新可用
- [ ] 自动刷新按间隔轮询
- [ ] 趋势图（Chart.js）正确渲染
- [ ] 全部测试通过
- [ ] `pnpm build` 构建成功
- [ ] **重要检查点：核心功能全部可用，确认后再进入 Phase 6-9**

---

### Phase 6: 扩展适配器 + 总览看板

#### Task 6.1: 扩展适配器 × 6（参考 cc-hud 对应模块）

**Description:** 补齐所有 P1 提供商适配器，每个参考 cc-hud 的对应实现。

**Steps:**

1. `src/services/providers/google.ts`:
   - test: `GET /v1/models` with API key in header
   - quota: 解析 rate limit headers

2. `src/services/providers/azure.ts`:
   - test: `GET /openai/models?api-version=2024-` with Azure endpoint
   - quota: Azure Resource Management (较复杂，先做基本)

3. `src/services/providers/moonshot.ts`（参考 cc-hud moonshot.ts）:
   - test + quota: `GET /v1/billing/balance` → balance

4. `src/services/providers/groq.ts`（参考 cc-hud groq.ts）:
   - test + quota: `GET /v1/user/usage` → remaining requests

5. `src/services/providers/qwen.ts`（参考 cc-hud qwen.ts）:
   - test + quota: `POST /api/v1/billing/query` → balance

6. `src/services/providers/glm.ts`（参考 cc-hud glm.ts）:
   - test + quota: `GET /api/biz/account/query-customer-account-report`

**Acceptance:**
- [ ] 6 个新适配器全部注册
- [ ] 每个通过 4 维度测试
- [ ] 提供商下拉可选所有 11+ 选项

**Files:** 6 个适配器 + 6 个测试文件

**Size:** L (12 files)

---

#### Task 6.2: 总览看板 (Dashboard)

**Description:** 插件首页 Dashboard，展示关键数据摘要。

**Steps:**
1. `src/views/Dashboard.vue`:
   - 统计卡片：Key 总数 / 活跃数 / 今日测试次数
   - 额度告急区：使用率最高的 3 个 Key（红色级别）
   - 最近测试记录：最近 5 次测试状态
   - 快速操作：添加 Key / 刷新额度 / 打开看板

**Acceptance:**
- [ ] Dashboard 数据与 store 同步
- [ ] 额度告急区正确显示高使用率 Key
- [ ] 快速操作按钮跳转正确

**Files:** `src/views/Dashboard.vue`

**Size:** M (1 file)

---

### ✅ Checkpoint: Phase 6 — 扩展适配器已完成

- [ ] 所有 11+ 提供商可选
- [ ] Dashboard 显示有意义的摘要
- [ ] 全部适配器测试通过
- [ ] `pnpm test` 全通过

---

### Phase 7: 预警系统 + i18n 完整 + 设置页

#### Task 7.1: 预警系统

**Description:** 额度低于阈值时触发应用内 + 系统通知。

**Steps:**
1. `src/components/AlertToast.vue` — 轻提示组件
   - 位置：右下角
   - 类型：warning / danger / info
   - 自动消失（5s）+ 手动关闭
2. 预警检测逻辑插入 `auto-refresh.ts` 的刷新回调中
3. 检测到额度低于阈值 → 触发 Toast + `utools.showNotification()`
4. 同一 Key 同一阈值级别不重复通知（去重 24h）

**Acceptance:**
- [ ] 额度低于阈值时弹出 Toast
- [ ] 可配置每个 Key 的预警阈值（默认 20%）
- [ ] 同一预警不重复弹出
- [ ] uTools 系统通知生效（如果环境支持）

**Files:** `src/components/AlertToast.vue`

**Size:** M (1 file + 修改 auto-refresh.ts)

---

#### Task 7.2: 完整 i18n + 设置页

**Description:** 补齐所有 UI 文本的翻译 + 全局设置页面。

**Steps:**
1. 完善 `src/i18n/zh-CN.ts` + `src/i18n/en-US.ts`:
   - 覆盖：所有表单字段、按钮、提示、错误、时间格式、状态文案
   - 约 100+ 翻译条目
2. `src/views/Settings.vue`:
   - 语言切换（中文/English）
   - 刷新间隔选择（5/15/30/60 分钟）
   - 默认预警阈值滑块（10% ~ 50%）
   - 数据导入/导出（JSON）
   - 关于信息（版本号、作者、GitHub 链接）
3. `src/stores/settings.ts` — 设置 Pinia store

**Acceptance:**
- [ ] 页面所有文字可完整切换中/英文
- [ ] 设置页修改后即时生效 + 持久化到 DB
- [ ] 导入/导出 JSON 数据完整
- [ ] 切换语言后页面刷新保持选择

**Files:** `src/i18n/zh-CN.ts`, `src/i18n/en-US.ts`, `src/views/Settings.vue`, `src/stores/settings.ts`

**Size:** M (4 files)

---

### ✅ Checkpoint: Phase 7 — 预警 + i18n 已完成

- [ ] 额度预警可视化
- [ ] 中英文切换覆盖全部 UI
- [ ] 设置页功能完整
- [ ] `pnpm test` 通过

---

### Phase 8: uTools 集成 + 打包 + 上架准备

#### Task 8.1: uTools 关键字增强 + 系统通知

**Description:** 优化 uTools 全局搜索体验，支持子命令跳转。

**Steps:**
1. 更新 `plugin.json` — 添加更多 features/subcommands
2. 更新 `preload.js`:
   - 处理 subcommand 参数 (`aw quota` → 路由到 /quota)
   - `aw test openai` → 跳转到 API Key 列表并自动测试第一个对应提供商
3. 系统通知集成：
   - 使用 `utools.showNotification(title, body, callback?)`

**Acceptance:**
- [ ] uTools 中输入 `aw quota` 直接打开额度看板
- [ ] `aw test` 触发对应操作
- [ ] 预警触发 uTools 系统通知

**Files:** `plugin.json`, `preload.js`

**Size:** S (2 files)

---

#### Task 8.2: 构建优化 + 打包命令

**Description:** 优化 Vite 构建配置，添加 .upx 打包命令。

**Steps:**
1. 更新 `vite.config.ts`:
   - `base: ''` (相对路径, 适配 uTools)
   - `build.outDir: 'dist'`
   - `build.rollupOptions.output.manualChunks` — 代码分割（vendor / chart）
   - Tree-shaking 启用
2. `package.json scripts`:
   - `"pack-upx": "vite build && cd dist && zip -r ../ai-usage-watch-{version}.upx ."`（或使用 utools-pack）
3. 构建验证：产物 < 5MB

**Acceptance:**
- [ ] `pnpm build` 输出到 dist/
- [ ] 构建产物 < 5MB
- [ ] dist/ 结构符合 uTools 要求（index.html 在根目录）

**Files:** `vite.config.ts`, `package.json`

**Size:** S (2 files)

---

#### Task 8.3: 上架文档 + 集成测试

**Description:** 编写市场上架步骤文档 + 核心流程集成测试。

**Steps:**
1. `docs/marketplace-submission.md`:
   - uTools 开发者平台注册
   - 上传 .upx 插件包
   - 填写市场信息（描述、截图、分类）
   - 审核流程说明
2. `tests/integration/quota-flow.spec.ts`:
   - 添加 Key → 测试连通性 → 查额度 → 刷新 → 验证数据一致性

**Acceptance:**
- [ ] 上架文档步骤清晰可执行
- [ ] 集成测试覆盖核心全流程

**Files:** `docs/marketplace-submission.md`, `tests/integration/quota-flow.spec.ts`

**Size:** M (2 files)

---

### ✅ Checkpoint: Phase 8 — uTools 集成已完成

- [ ] `aw quota` 子命令跳转正常
- [ ] `pnpm pack-upx` 成功生成 .upx 文件
- [ ] 构建产物 < 5MB
- [ ] 集成测试通过
- [ ] 上架文档就绪

---

### Phase 9: 最终质量收尾

#### Task 9.1: 全量测试 + 覆盖率达标

**Description:** 确保单元测试覆盖率 ≥ 80%。

**Actions:**
1. 运行 `pnpm test --coverage` 检查覆盖率
2. 补足低覆盖率的模块测试
3. 确保每个适配器包含 4 维度测试

**Acceptance:**
- [ ] 覆盖率 ≥ 80%
- [ ] 每个适配器 4 维度测试存在

---

#### Task 9.2: 文档完善

**Description:** 更新 README 和 CHANGELOG。

**Actions:**
1. `README.md` — 项目介绍、截图、安装方式（uTools 市场）、功能列表、截图
2. `CHANGELOG.md` — v1.0.0 初始版本

**Acceptance:**
- [ ] README 完整可读
- [ ] CHANGELOG 有初始条目

---

#### Task 9.3: Success Criteria 验收

**Description:** 逐一验证 SPEC.md 中的 12 条 Success Criteria。

| # | 标准 | 验证结果 |
|---|------|---------|
| 1 | 支持 8+ 默认提供商 | □ |
| 2 | 支持自定义 endpoint | □ |
| 3 | 添加 Key → 测试 ≤ 5 步 | □ |
| 4 | 额度看板三窗口展示 | □ |
| 5 | 自动刷新正常轮询 | □ |
| 6 | 额度预警 | □ |
| 7 | Key 加密存储 | □ |
| 8 | 适配器 4 维度测试 | □ |
| 9 | 覆盖率 ≥ 80% | □ |
| 10 | uTools aw 搜索 | □ |
| 11 | 构建产物 < 5MB | □ |
| 12 | 零外部运行时依赖 | □ |

---

### Final Checkpoint: 🎉 项目完成

- [ ] 全部 9 个 Phase 完成
- [ ] 所有 12 条 Success Criteria 通过
- [ ] `pnpm test --coverage` ≥ 80%
- [ ] `pnpm build` 构建成功
- [ ] `pnpm pack-upx` 打包成功
- [ ] 准备好提交 uTools 市场审核

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 各提供商额度 API 差异大 | High | 适配器模式隔离差异；先实现核心 5 个，其余 P1 |
| `utools.db` 同步限制 — 高频写入影响用户体验 | Medium | 额度缓存/history 存 Pinia 内存，不写入 utools.db。严格遵守"同步 DB 只存用户数据"原则 |
| `utools.db` API 在测试环境中不可用 | Medium | 测试时 mock `globalThis.utools.db`（allDocs / get / put / remove） |
| Web Crypto API 在 uTools WebView 中受限 | Medium | 备选方案：preload.js 中用 Node crypto 模块 |
| 额度查询消耗用户 API 配额 | Medium | 使用低频 API（如 OpenAI billing 不消耗配额）；自动刷新间隔默认 15min |

---

## Success Criteria

- [ ] 9 个 Phase 按时按质完成
- [ ] 每个 Phase 的 Checkpoint 验证点通过
- [ ] `pnpm test` 全量通过
- [ ] `pnpm type-check` 无错误
- [ ] `pnpm build` 成功产出 < 5MB
- [ ] SPEC.md 中 12 条 Success Criteria 全部达标
