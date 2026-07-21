# Plan: utools-usage-watch — 分阶段实施方案

> 本计划将 SPEC.md 中的规格转化为可执行的增量构建步骤。每阶段独立可验证，前一阶段完成后再进入下一阶段。

---

## Phase 0: 风险识别与架构决策

### 关键风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 各提供商额度 API 差异大 | 适配器开发周期长 | 先实现 4 个核心适配器(OpenAI/Anthropic/DeepSeek/Ollama)，其余 P1 |
| API Key 加密密钥管理 | 密钥泄漏或丢失 | 加密密钥从用户主密码派生(PBKDF2)，不硬编码 |
| uTools WebView 可能限制某些 Web API | 功能受限 | 关键路径 (加密/存储) 都有 fallback：Web Crypto API 不行就 fallback 到 preload Node crypto |

### 架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| **数据存储** | Dexie.js (IndexedDB) | 比 utools.db 有更好的查询能力（按 provider/status 过滤、排序） |
| **加密 API** | Web Crypto API (AES-GCM) | uTools WebView 基于 Chromium，Web Crypto 可用，零依赖 |
| **HTTP** | `fetch` + `AbortSignal.timeout` | 内置 API，无需外部依赖，参考 cc-hud 的 fetchWithTimeout |
| **构建** | Vite + @vitejs/plugin-vue | uTools 插件的 HTML 最终是静态资源，Vite 最合适 |
| **预加载** | minimal preload.js | 仅做 uTools bridge 初始化，业务逻辑全在 Vue 层 |
| **状态管理** | Pinia (setup stores) | Vue 3 官方推荐，TypeScript 支持好 |

---

## Phase 1: 项目脚手架 (Scaffold)

**目标**: 搭建可运行的最小 Vite + Vue 3 + TypeScript 工程，包含 uTools 插件骨架。

### 任务清单

- [ ] **1.1 初始化 npm 项目**
  - `package.json`：Vue 3, Vite, TypeScript, Tailwind CSS, vue-i18n, Dexie, Pinia, Chart.js, Vitest
  - `tsconfig.json`：strict mode, path alias `@/`
  - `vite.config.ts`：Vue plugin + path alias
  - `tailwind.config.js` + `postcss.config.js`

- [ ] **1.2 uTools 插件骨架**
  - `plugin.json`：manifest, name, features 含 `aw` 关键词
  - `preload.js`：基础结构，expose utools API 到 `window`
  - `index.html`：Vue 挂载点

- [ ] **1.3 项目目录结构**（按 SPEC 创建所有空目录）
- [ ] **1.4 Vue 应用骨架**
  - `src/main.ts`：Vue app create + Pinia + Router + vue-i18n
  - `src/App.vue`：根组件，`<router-view>`
  - `src/router/index.ts`：Hash 模式路由（Dashboard / ApiKeys / ApiKeyDetail / QuotaBoard / QuotaDetail / Settings）
  - `src/layouts/MainLayout.vue`：侧边导航栏 + 内容区

- [ ] **1.5 i18n 初始化**
  - `src/i18n/index.ts`：vue-i18n createI18n
  - `src/i18n/zh-CN.ts` + `src/i18n/en-US.ts`：初步翻译（导航、通用 UI）

- [ ] **1.6 测试基础设施**
  - `vitest.config.ts`
  - 第一个冒烟测试：`tests/unit/smoke.spec.ts`

### 验收标准

- [ ] `pnpm dev` 启动后浏览器可渲染空白布局（含导航侧边栏）
- [ ] uTools 加载 `dist/index.html` 可正常显示
- [ ] 中英文切换有效
- [ ] `pnpm test` 通过冒烟测试
- [ ] 目录结构完整

### 涉及文件

```
package.json, tsconfig.json, vite.config.ts, tailwind.config.js, postcss.config.js
plugin.json, preload.js, index.html
src/main.ts, src/App.vue, src/router/index.ts, src/layouts/MainLayout.vue
src/i18n/index.ts, src/i18n/zh-CN.ts, src/i18n/en-US.ts
vitest.config.ts, tests/unit/smoke.spec.ts
```

---

## Phase 2: 数据层 + 加密 (Data Layer)

**目标**: IndexedDB 存储层 + API Key 加密/解密就绪。

### 任务清单

- [ ] **2.1 Dexie 数据库**
  - `src/db/index.ts`：AiUsageWatchDB 类，version(1) 定义四张表
  - `src/types/apikey.ts`：IApiKey, KeyStatus, ProviderType
  - `src/types/quota.ts`：IQuotaWindows, IQuotaWindow
  - `src/types/settings.ts`：ISettings

- [ ] **2.2 Repository 层**
  - `src/db/apiKeys.repo.ts`：getAll / getById / add / update / remove / search
  - `src/db/quotas.repo.ts`：getByKeyId / upsert / removeStale
  - `src/db/quotaHistory.repo.ts`：add / getByKeyId / getRecent
  - `src/db/settings.repo.ts`：get / set / getAll

- [ ] **2.3 加密工具**
  - `src/services/encrypt.ts`：AES-GCM 加密/解密
  - 密钥方案：用户首次使用时生成随机主密钥，用 PBKDF2 派生
  - 加密密钥存储在 IndexedDB settings 表中

- [ ] **2.4 校验工具**
  - `src/utils/validators.ts`：API Key 格式校验、URL 校验

- [ ] **2.5 Repository 测试**
  - `tests/unit/db/apiKeys.repo.spec.ts`
  - `tests/unit/services/encrypt.spec.ts`

### 验收标准

- [ ] IndexedDB 初始化四张表，无 Migration 错误
- [ ] API Key CRUD（加密写入 → 读取解密 → 更新 → 删除）全流程通过
- [ ] 加密后存储在 IndexedDB 中的内容不可读（明文不可见）
- [ ] 搜索/过滤按 provider、status、label 正常
- [ ] `pnpm test` 新增测试通过

### 涉及文件

```
src/db/index.ts, src/db/apiKeys.repo.ts, src/db/quotas.repo.ts
src/db/quotaHistory.repo.ts, src/db/settings.repo.ts
src/types/apikey.ts, src/types/quota.ts, src/types/settings.ts
src/services/encrypt.ts, src/utils/validators.ts
tests/unit/db/apiKeys.repo.spec.ts, tests/unit/services/encrypt.spec.ts
```

---

## Phase 3: API Key 管理界面 (Core UI)

**目标**: 完整的 API Key CRUD 界面。

### 任务清单

- [ ] **3.1 Pinia Store**
  - `src/stores/apiKeys.ts`：apiKeyList, activeKeys, loading, error + CRUD actions
  - `src/stores/providers.ts`：provider registry, default providers list

- [ ] **3.2 API Key 列表页**
  - `src/views/ApiKeys.vue`：表格/卡片列表，按提供商分组
  - 每行显示：提供商图标 + 标签 + 脱敏 Key + 状态 + 最近测试时间 + 操作按钮
  - 搜索框 SearchInput.vue（按名称/提供商/标签过滤）

- [ ] **3.3 API Key 编辑/新增**
  - `src/views/ApiKeyDetail.vue`：编辑已有 Key
  - `src/components/AddKeyDialog.vue`：新增弹窗
  - 表单含：提供商选择、自定义标签、Key 输入、Endpoint（可选的）、模型选择

- [ ] **3.4 状态显示组件**
  - `src/components/ProviderIcon.vue`：提供商 SVG 图标
  - `src/components/KeyStatusBadge.vue`：ACTIVE/INACTIVE/EXPIRED/ERROR 标签

- [ ] **3.5 Store 测试**
  - `tests/unit/stores/apiKeys.spec.ts`

### 验收标准

- [ ] uTools 中打开插件可见 API Key 列表（初始为空）
- [ ] 可添加新 API Key → 选择提供商 → 填入 Key → 保存
- [ ] API Key 显示为脱敏格式（`sk-****abcd`）
- [ ] 可编辑标签、Endpoint、模型列表
- [ ] 可删除 API Key（含确认弹窗）
- [ ] 搜索过滤正常
- [ ] 列表按提供商分组展示

### 涉及文件

```
src/stores/apiKeys.ts, src/stores/providers.ts
src/views/ApiKeys.vue, src/views/ApiKeyDetail.vue
src/components/AddKeyDialog.vue, src/components/ProviderIcon.vue
src/components/KeyStatusBadge.vue, src/components/SearchInput.vue
tests/unit/stores/apiKeys.spec.ts
```

---

## Phase 4: 提供商适配器系统 + 连通性测试

**目标**: 可扩展的 Provider Adapter 体系，5 个核心适配器 + 一键测试连通性。

### 任务清单

- [ ] **4.1 Adapter 接口 + 注册表**
  - `src/services/providers/index.ts`：IProviderAdapter 接口
  - `src/services/providers/registry.ts`：type → adapter 映射

- [ ] **4.2 核心适配器（参考 cc-hud 模式）**
  - `src/services/providers/openai.ts`：`GET /v1/models` 测试 + `GET /v1/dashboard/billing/usage` 额度
  - `src/services/providers/anthropic.ts`：`GET /v1/messages`（仅验证 headers）
  - `src/services/providers/deepseek.ts`：`GET /v1/models` + `GET /user/balance`（参考 cc-hud balance.ts）
  - `src/services/providers/openrouter.ts`：`GET /v1/auth/key`
  - `src/services/providers/ollama.ts`：`GET /api/tags` 连通性 + 模型列表（无额度）

- [ ] **4.3 Key Tester 服务**
  - `src/services/key-tester.ts`：runTest(apiKeyId) → 调用对应 adapter.testConnection → 更新状态

- [ ] **4.4 测试连通性 UI**
  - `src/components/TestConnection.vue`：点击测试 → 显示状态 + 延迟 + 模型列表

- [ ] **4.5 适配器 4 维度测试（参考 cc-hud 测试模式）**
  - `tests/unit/services/providers/openai.spec.ts`
  - `tests/unit/services/providers/anthropic.spec.ts`
  - `tests/unit/services/providers/deepseek.spec.ts`
  - `tests/unit/services/providers/openrouter.spec.ts`
  - `tests/unit/services/providers/ollama.spec.ts`
  - `tests/unit/services/key-tester.spec.ts`

### 验收标准

- [ ] 每个适配器通过 isolation / parse / error / cache 4 维度测试
- [ ] 在 API Key 详情页中点击"测试连通性"按钮，显示成功/失败 + 延迟（ms）
- [ ] Ollama 显示本地模型列表
- [ ] 测试失败时显示友好错误提示
- [ ] 失败后 API Key 状态标记为 ERROR

### 涉及文件

```
src/services/providers/index.ts, src/services/providers/registry.ts
src/services/providers/openai.ts, src/services/providers/anthropic.ts
src/services/providers/deepseek.ts, src/services/providers/openrouter.ts
src/services/providers/ollama.ts
src/services/key-tester.ts
src/components/TestConnection.vue
tests/unit/services/providers/*.spec.ts
tests/unit/services/key-tester.spec.ts
```

---

## Phase 5: 额度监控模块 (核心模块，参考 cc-hud)

**目标**: 完整的额度监控系统，含适配器额度查询、缓存、看板、自动刷新。

### 任务清单

- [ ] **5.1 适配器扩展 — 额度查询**
  - 在 Phase 4 适配器中追加 `checkQuota()` 实现
  - OpenAI：`GET /v1/dashboard/billing/usage`
  - Anthropic：从 response headers 解析 rate limits
  - DeepSeek：`GET /user/balance`（已完成 Phase 4）

- [ ] **5.2 额度查询引擎**
  - `src/services/quota-checker.ts`：QuotaChecker 类（参考 cc-hud withCache）
  - `checkSingleKey(apiKeyId)`：cache → check TTL → fetch → write cache → return
  - `refreshAll()`：Promise.allSettled 并行刷新所有 Key

- [ ] **5.3 自动刷新调度器**
  - `src/services/auto-refresh.ts`：AutoRefreshScheduler 类
  - 可配置间隔（5/15/30/60 分钟）
  - 页面可见性感知（页面隐藏时暂停）

- [ ] **5.4 Pinia Store**
  - `src/stores/quotas.ts`：quotaMap, loadingKeys, 刷新/缓存/预警 actions

- [ ] **5.5 额度看板 UI**
  - `src/views/QuotaBoard.vue`：所有 Key 的额度总览
  - 按 cc-hud 三窗口分组（滚动/周/月）展示
  - `src/components/QuotaGauge.vue`：进度条组件，cc-hud 颜色体系
  - 手动刷新按钮 + 上次刷新时间
  - `src/views/QuotaDetail.vue`：单 Key 额度详情 + 趋势
  - `src/components/QuotaTrendChart.vue`：Chart.js 折线图

- [ ] **5.6 额度缓存**
  - 利用 Dexie quotaCache 表，5 分钟 TTL（同 cc-hud）
  - 强制刷新跳过缓存

- [ ] **5.7 测试**
  - `tests/unit/services/quota-checker.spec.ts`
  - `tests/unit/services/auto-refresh.spec.ts`
  - `tests/unit/stores/quotas.spec.ts`

### 验收标准

- [ ] 额度看板展示所有已配置 Key 的三窗口使用率
- [ ] 每个窗口有进度条 + 百分比 + 重置倒计时（参考 cc-hud formatCountdown）
- [ ] 颜色分级正确（绿/黄/橙/红）
- [ ] 手动刷新正常拉取最新数据
- [ ] 自动刷新按配置间隔轮询
- [ ] 缓存 5 分钟内不重复请求
- [ ] 额度历史趋势图（Chart.js）正常渲染

### 涉及文件

```
src/services/quota-checker.ts, src/services/auto-refresh.ts
src/stores/quotas.ts
src/views/QuotaBoard.vue, src/views/QuotaDetail.vue
src/components/QuotaGauge.vue, src/components/QuotaTrendChart.vue
tests/unit/services/quota-checker.spec.ts
tests/unit/services/auto-refresh.spec.ts
tests/unit/stores/quotas.spec.ts
```

---

## Phase 6: 扩展适配器 + 总览看板

**目标**: 补齐所有 P1 提供商适配器 + Dashboard 总览页。

### 任务清单

- [ ] **6.1 扩展适配器（参考 cc-hud 的对应模块）**
  - `src/services/providers/google.ts`：Google Gemini
  - `src/services/providers/azure.ts`：Azure OpenAI
  - `src/services/providers/moonshot.ts`（参考 cc-hud moonshot.ts）：`GET /v1/billing/balance`
  - `src/services/providers/groq.ts`（参考 cc-hud groq.ts）：`GET /v1/user/usage`
  - `src/services/providers/qwen.ts`（参考 cc-hud qwen.ts）：`POST /api/v1/billing/query`
  - `src/services/providers/glm.ts`（参考 cc-hud glm.ts）：`GET /api/biz/account/query-customer-account-report`

- [ ] **6.2 总览看板**
  - `src/views/Dashboard.vue`：显示概览统计（Key 总数/活跃数、额度最低的 3 个 Key、最近测试状态）

- [ ] **6.3 扩展适配器 4 维度测试**

### 验收标准

- [ ] 所有 8+ 提供商在列表可选
- [ ] 各适配器通过 4 维度测试
- [ ] Dashboard 显示有意义的概览数据

### 涉及文件

```
src/services/providers/google.ts, azure.ts, moonshot.ts, groq.ts, qwen.ts, glm.ts
src/views/Dashboard.vue
tests/unit/services/providers/google.spec.ts, moonshot.spec.ts, etc.
```

---

## Phase 7: 预警系统 + i18n 完整 + 全局设置

**目标**: 额度预警通知 + 完整双语覆盖 + 设置页。

### 任务清单

- [ ] **7.1 预警系统**
  - 额度低于阈值时触发：Toast 提示 + uTools 系统通知
  - `src/components/AlertToast.vue`
  - 预警检测逻辑插入 auto-refresh 调度器

- [ ] **7.2 设置页**
  - `src/views/Settings.vue`：刷新间隔、预警阈值、语言选择、数据导入/导出
  - `src/stores/settings.ts`

- [ ] **7.3 完整 i18n**
  - 补齐 zh-CN.ts / en-US.ts 所有 UI 文本
  - 覆盖：导航、表单字段、按钮、提示、错误信息、时间格式

- [ ] **7.4 测试**
  - `tests/unit/services/auto-refresh.spec.ts`（含预警逻辑）

### 验收标准

- [ ] 额度低于阈值时出现 Toast 通知
- [ ] 设置页可切换语言、调整刷新间隔、修改预警阈值
- [ ] 所有 UI 文字中英文切换完整

### 涉及文件

```
src/components/AlertToast.vue, src/views/Settings.vue
src/stores/settings.ts
src/i18n/zh-CN.ts, src/i18n/en-US.ts（补充完成）
```

---

## Phase 8: uTools 集成 + 打包 + 上架准备

**目标**: uTools 全局搜索、系统交互、市场发布就绪。

### 任务清单

- [ ] **8.1 uTools 关键字增强**
  - `aw quota` → 直接跳转额度看板
  - `aw test <provider>` → 快速测试指定提供商
  - preload.js 中处理 subcommand 路由

- [ ] **8.2 系统通知**
  - 使用 `utools.showNotification()` 推送预警通知

- [ ] **8.3 构建优化**
  - Vite 构建优化（代码分割、tree-shaking）
  - `.upx` 打包命令（`pnpm pack-upx`）

- [ ] **8.4 上架文档**
  - `docs/marketplace-submission.md`：市场提交步骤
  - plugin.json 完成市场所需字段（logo、截图、描述）

- [ ] **8.5 最终集成测试**
  - `tests/integration/quota-flow.spec.ts`

### 验收标准

- [ ] uTools 中输入 `aw` 打开插件
- [ ] uTools 中输入 `aw quota` 直接跳转额度看板
- [ ] 额度预警时弹出 uTools 系统通知
- [ ] `pnpm pack-upx` 成功生成 `.upx` 文件 < 5MB
- [ ] 集成测试通过

### 涉及文件

```
plugin.json, preload.js
vite.config.ts（优化配置）
docs/marketplace-submission.md
tests/integration/quota-flow.spec.ts
```

---

## Phase 9: 最终质量收尾

**目标**: 覆盖率达标、文档完善、全量测试通过。

### 任务清单

- [ ] 所有单元测试覆盖率 ≥ 80%
- [ ] Provider 适配器各包含 4 维度测试
- [ ] `README.md` 更新（截图、安装方式、功能列表）
- [ ] `CHANGELOG.md` 初始版本
- [ ] 人工验收 SPEC.md 中的 12 条 Success Criteria

---

## 依赖关系图

```
Phase 1 (Scaffold)
    │
    ▼
Phase 2 (Data Layer)  ←─────────────┐
    │                               │
    ▼                               │
Phase 3 (Key Mgmt UI)  ←─────┐     │
    │                        │     │
    ▼                        │     │
Phase 4 (Adapters + Test) ──┘     │
    │                              │
    ▼                              │
Phase 5 (Quota Monitor) ──────────┘
    │
    ▼
Phase 6 (More Providers + Dashboard)
    │
    ▼
Phase 7 (Alerts + i18n Full + Settings)
    │
    ▼
Phase 8 (uTools Integration + Package)
    │
    ▼
Phase 9 (Final QA)
```

---

## 总工作量预估

| Phase | 内容 | 预估文件数 | 预估工作量 |
|-------|------|-----------|-----------|
| P1 | 项目脚手架 | ~15 | ★★★ 中等 |
| P2 | 数据层 + 加密 | ~12 | ★★★ 中等 |
| P3 | API Key 管理 UI | ~10 | ★★★★ 较大 |
| P4 | 适配器 + 连通性测试 | ~18 | ★★★★★ 最大 |
| P5 | 额度监控模块 | ~10 | ★★★★★ 最大 |
| P6 | 扩展适配器 + 总览 | ~15 | ★★★ 中等 |
| P7 | 预警 + i18n + 设置 | ~8 | ★★ 较小 |
| P8 | uTools + 打包 | ~6 | ★★ 较小 |
| P9 | QA 收尾 | ~5 | ★ 最小 |

---

## 核心参考：cc-hud 设计复用清单

| cc-hud 文件 | 本项目对应 | 复用方式 |
|------------|-----------|---------|
| `src/cache.ts` (withCache, TTL, extractBalance) | `src/services/quota-checker.ts` | 移植 withCache 核心逻辑 |
| `src/opencode.ts` (detect → fetch → parse pattern) | `src/services/providers/*.ts` | 每个适配器采用相同模式 |
| `src/balance.ts` (DeepSeek) | `src/services/providers/deepseek.ts` | 直接移植 fetch + parse |
| `src/moonshot.ts` | `src/services/providers/moonshot.ts` | 直接移植 |
| `src/groq.ts` | `src/services/providers/groq.ts` | 直接移植 |
| `src/qwen.ts` | `src/services/providers/qwen.ts` | 直接移植 |
| `src/glm.ts` | `src/services/providers/glm.ts` | 直接移植 |
| `src/render.ts` (color, progressBar, formatCountdown) | `src/components/QuotaGauge.vue` | 配色方案 + 倒计时显示移植 |
| `src/index.ts` (fallback 链, Promise.all 并行) | `src/services/quota-checker.ts` | fallback 模式 + 并行查询 |

---

**本计划现提请审批。确认后按 Phase 1 → Phase 9 顺序执行。**
