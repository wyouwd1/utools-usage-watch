# Implementation Plan: utools-usage-watch 重构

> 聚焦两个核心修正：① API Key 纯化 ② 额度监控独立化（参考 cc-hud）

---

## 代码复用分析（摸完代码后的结论）

### 可直接复用（零修改）

| 文件 | 复用方式 |
|------|---------|
| `db/index.ts` — `docId()`, `getByPrefix()`, `putDoc()`, `removeDoc()` | 额度源 CRUD 直接调用 |
| `services/encrypt.ts` — `encrypt()`, `decrypt()` | 凭证加密直接复用 |
| `components/QuotaGauge.vue` | cc-hud 进度条，直接复用 |
| `components/QuotaTrendChart.vue` | Chart.js 趋势，直接复用 |
| `components/AlertToast.vue` | 通知组件，直接复用 |
| `components/SearchInput.vue` | 搜索框，直接复用 |
| `services/auto-refresh.ts` | 调度器 class（需改回调逻辑） |
| `stores/quotas.ts` | 内存缓存机制不变，key 从 apiKeyId 改为 sourceId |

### 需修改

| 文件 | 改什么 |
|------|--------|
| `types/apikey.ts` | 删除 `quotaAlertThreshold` 字段 |
| `types/quota.ts` | 新增 `QuotaSourceType` 枚举 + `IQuotaSourceEntity` 接口 |
| `db/apiKeys.repo.ts` | 删除 `add()` 中的 `quotaAlertThreshold` |
| `components/AddKeyDialog.vue` | 删除阈值滑块（4 行） |
| `services/quota-checker.ts` | 重写：基于 quota sources 而非 API keys |
| `services/auto-refresh.ts` | 告警逻辑改为使用 quota sources 而非 apiKeys |
| `stores/quotas.ts` | 键名重构：apiKeyId → sourceId |
| `views/QuotaBoard.vue` | 重写：展示额度源而非 API Key |
| `views/QuotaDetail.vue` | 重写：展示单个额度源详情 |
| `views/Dashboard.vue` | 更新额度告警区引用 |
| `router/index.ts` | 添加 `/quota-source/:id` 路由 |
| `i18n/zh-CN.ts` + `en-US.ts` | 增补额度源相关翻译 |

### 需新增

| 文件 | 说明 |
|------|------|
| `db/quotaSources.repo.ts` | CRUD（复用 db/index.ts 工具） |
| `stores/quotaSources.ts` | Pinia store |
| `components/AddQuotaSourceDialog.vue` | 新增额度源弹窗 |
| `views/QuotaSourceDetail.vue` | 额度源详情/编辑页 |
| `services/quota-sources/` | **额度源适配器体系** |

---

## Architecture Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| **额度源适配器 vs Provider 适配器** | 完全独立 | API Key 的 Provider Adapter 只管连通性测试；Quota Source Adapter 只管额度查询，两者数据不互通 |
| **额度源凭证存储** | utools.db，加密 | 与 API Key 共用 AES-GCM 加密服务 |
| **适配器注册** | 手动注册（类似 cc-hud fallback 链） | 每个额度源独立模块，在 registry 中统一注册 |
| **UI 复用** | QuotaBoard 保持独立页面 | 侧边栏现有「额度监控」入口不变，内容改为展示额度源 |

---

## Task List

### Phase 1: 类型清理 + 额度源类型定义

#### Task 1.1: API Key 类型清理

**Description:** 从 `IApiKeyEntity` 中删除 `quotaAlertThreshold` 字段，清理相关代码。

**Files:**
- `src/types/apikey.ts` — 删除 `quotaAlertThreshold: number`（第 35 行）
- `src/db/apiKeys.repo.ts` — 删除 `quotaAlertThreshold: data.quotaAlertThreshold ?? 80`（第 40 行）
- `src/components/AddKeyDialog.vue` — 删除阈值滑块（第 28 行 `alertThreshold`、第 112 行、第 243-250 行）
- `src/i18n/zh-CN.ts` + `en-US.ts` — 删除 `apiKeys.alertThreshold` 翻译

**Acceptance:**
- [ ] `IApiKeyEntity` 中无 `quotaAlertThreshold`
- [ ] AddKeyDialog 中无阈值滑块
- [ ] 构建通过，无类型错误

**Verify:** `pnpm build && pnpm test`

**Scope:** S（4 文件，简单删除）

---

#### Task 1.2: 额度源类型定义

**Description:** 在 `types/quota.ts` 中新增 `QuotaSourceType` 枚举和 `IQuotaSourceEntity` 接口。

**Files:**
- `src/types/quota.ts` — 新增：

```typescript
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

export interface IQuotaSourceEntity {
  _id: string
  _rev?: string
  type: 'quota-source'
  sourceType: QuotaSourceType
  label: string
  encryptedCredential: string
  credentialHint: string
  baseUrl?: string
  config?: Record<string, any>
  enabled: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}
```

- `src/types/index.ts` — 确保导出新类型

**Acceptance:**
- [ ] `QuotaSourceType` 枚举含全部 8 种额度源
- [ ] `IQuotaSourceEntity` 接口完整
- [ ] 构建通过

**Verify:** `pnpm build`

**Scope:** S（2 文件）

---

### ✅ Checkpoint: Phase 1
- [ ] 构建通过，类型无错误
- [ ] 测试全部通过

---

### Phase 2: 额度源数据层

#### Task 2.1: quotaSources Repository

**Description:** 创建 `quotaSources.repo.ts`，复用 `db/index.ts` 的 `docId()`、`getByPrefix()`、`putDoc()`、`removeDoc()` 工具函数。模式完全参考 `apiKeys.repo.ts`。

**Files:**
- `src/db/quotaSources.repo.ts`

```typescript
// CRUD: getAll, getById, add, update, remove, search
// _id 前缀: quota-source/<uuid>
// 凭证加密: 调用 encrypt() 服务
// 脱敏: 生成 credentialHint
```

**Acceptance:**
- [ ] CRUD 完整（getAll / getById / add / update / remove / search）
- [ ] 新增时自动加密凭证 + 生成脱敏提示
- [ ] 复用 `getByPrefix("quota-source/")` 查询

**Verify:** `pnpm build`

**Scope:** M（1 文件，~60 行）

---

#### Task 2.2: quotaSources Pinia Store

**Description:** 创建 `quotaSources` store，模式参考 `apiKeys` store。

**Files:**
- `src/stores/quotaSources.ts`

**Acceptance:**
- [ ] state: `sourceList`, `loading`, `error`
- [ ] actions: `fetchAll`, `addSource`, `updateSource`, `removeSource`
- [ ] getters: `enabledSources`（过滤 enabled=true）

**Verify:** `pnpm build`

**Scope:** S（1 文件）

---

#### Task 2.3: COLLECTION 常量更新

**Description:** 在 `db/index.ts` 的 `COLLECTION` 对象中添加 `QUOTA_SOURCE: 'quota-source/'`。

**Files:**
- `src/db/index.ts` — 添加一行

**Acceptance:**
- [ ] `COLLECTION.QUOTA_SOURCE` 可用

**Verify:** `pnpm build`

**Scope:** XS（1 行）

---

### ✅ Checkpoint: Phase 2
- [ ] 数据层完整：类型 + repo + store
- [ ] `pnpm build` 通过

---

### Phase 3: 额度源 UI

#### Task 3.1: AddQuotaSourceDialog 组件

**Description:** 新增额度源的弹窗表单，参考 `AddKeyDialog.vue` 的模式。

**表单字段：**
- 额度源类型下拉（QuotaSourceType 枚举）
- 用户标签
- 凭证输入（password 类型，可切换显示）
- 凭证脱敏提示
- Base URL（可选，预填默认值）
- 额外配置（根据类型动态显示：如百炼需要 sec_token + region）

**Files:**
- `src/components/AddQuotaSourceDialog.vue`

**Acceptance:**
- [ ] 选择类型后显示对应的凭证字段
- [ ] 保存时加密凭证，写入 quotaSources repo
- [ ] 表单校验：类型必选、凭证必填
- [ ] 保存后关闭弹窗，列表更新

**Verify:** 手动 UI 检查

**Scope:** M（1 文件）

---

#### Task 3.2: QuotaSourceDetail 页面

**Description:** 单个额度源的详情/编辑页面，参考 `ApiKeyDetail.vue`。

**Files:**
- `src/views/QuotaSourceDetail.vue`

**Acceptance:**
- [ ] 编辑已有额度源的标签、凭证、配置
- [ ] 保存更新到 repo
- [ ] 返回列表页

**Verify:** 手动 UI 检查

**Scope:** M（1 文件）

---

#### Task 3.3: 路由更新

**Description:** 添加 `/quota-source/:id` 路由。

**Files:**
- `src/router/index.ts` — 添加路由：

```typescript
{
  path: 'quota-source/:id',
  name: 'QuotaSourceDetail',
  component: () => import('@/views/QuotaSourceDetail.vue'),
}
```

**Acceptance:**
- [ ] `/quota-source/new` → 新增
- [ ] `/quota-source/:id` → 编辑

**Verify:** `pnpm build`

**Scope:** XS（1 文件，2 行）

---

### ✅ Checkpoint: Phase 3
- [ ] 可以添加/编辑/删除额度源
- [ ] 凭证加密存储

---

### Phase 4: 额度源适配器体系（参考 cc-hud）

#### Task 4.1: IQuotaSourceAdapter 接口 + Registry

**Description:** 定义额度源适配器接口和注册表。与 Provider Adapter 完全独立。

**Files:**
- `src/services/quota-sources/index.ts` — 接口定义
- `src/services/quota-sources/registry.ts` — 注册表 + fallback 链

```typescript
export interface IQuotaSourceAdapter {
  readonly sourceType: QuotaSourceType
  readonly label: string
  readonly defaultBaseUrl?: string
  checkQuota(credential: string, config?: Record<string, any>): Promise<IQuotaWindows | null>
}
```

**Acceptance:**
- [ ] 接口定义完整
- [ ] 注册表支持 register / get / getAll

**Verify:** `pnpm build`

**Scope:** S（2 文件）

---

#### Task 4.2: 核心额度源适配器（参考 cc-hud 对应模块）

**Description:** 实现 8 个额度源适配器。参考 cc-hud 的现有实现直接移植。

**Files:**

| 适配器 | 参考 cc-hud | 凭证类型 | API |
|--------|------------|---------|-----|
| `opencode.ts` | `opencode.js` | auth cookie | 解析 opencode.ai workspace HTML |
| `bailian.ts` | `bailian.js` | cookie + sec_token | 百炼 API |
| `deepseek.ts` | `balance.js` | apiKey | `GET /user/balance` |
| `moonshot.ts` | `moonshot.js` | apiKey | `GET /v1/billing/balance` |
| `groq.ts` | `groq.js` | apiKey | `GET /v1/user/usage` |
| `qwen.ts` | `qwen.js` | apiKey | `POST /api/v1/billing/query` |
| `glm.ts` | `glm.js` | apiKey | `GET /api/biz/account/query*` |
| `minimax.ts` | `mmx.js` | apiKey | `GET /v1/token_plan/remains` |

**Acceptance:**
- [ ] 每个适配器 `checkQuota()` 正常返回 `IQuotaWindows | null`
- [ ] 网络错误时静默返回 null（不抛异常）
- [ ] 每个适配器有 isolation / parse / error 测试

**Verify:** `pnpm test`

**Scope:** L（8 适配器 + 注册）

---

#### Task 4.3: 配额源适配器测试

**Description:** 每个适配器 4 维度测试（isolation / parse / error / cache）。

**Files:**
- `tests/unit/services/quota-sources/opencode.spec.ts`
- `tests/unit/services/quota-sources/bailian.spec.ts`
- ... (每个适配器一个测试文件)

**Acceptance:**
- [ ] 每个适配器覆盖 4 个维度
- [ ] 测试通过

**Verify:** `pnpm test`

**Scope:** M（8 测试文件）

---

### ✅ Checkpoint: Phase 4
- [ ] 全部 8 个额度源适配器实现 + 测试通过

---

### Phase 5: 额度查询引擎重构

#### Task 5.1: QuotaChecker 重写

**Description:** 重写 `quota-checker.ts`，从基于 API Key 改为基于 Quota Source。核心逻辑不变（withCache + TTL + stale-while-revalidate），只是数据源从 `apiKeysStore.activeKeys` 改为 `quotaSourcesStore.enabledSources`。

**Files:**
- `src/services/quota-checker.ts` — 重写
- `src/stores/quotas.ts` — 键名重构：`apiKeyId` → `sourceId`（保持内部结构不变）

**Acceptance:**
- [ ] `checkSingleSource(sourceId)` — 基于额度源 ID 查询
- [ ] `refreshAll()` — 并行刷新所有 enabled 额度源
- [ ] `forceRefreshSource(sourceId)` — 强制刷新
- [ ] 缓存 TTL 5min 保持不变

**Verify:** `pnpm test`

**Scope:** M（2 文件）

---

#### Task 5.2: AutoRefresh 告警逻辑重构

**Description:** 将 `auto-refresh.ts` 中的告警检测从关联 API Key 改为关联 Quota Source。删除 `alertedKeys` 中的 `apiKey.quotaAlertThreshold` 引用。

**Files:**
- `src/services/auto-refresh.ts`

**Acceptance:**
- [ ] 告警检测基于 quota source 的阈值
- [ ] 不再引用 apiKeys store
- [ ] 通知消息显示额度源标签

**Verify:** `pnpm build`

**Scope:** M（1 文件）

---

### ✅ Checkpoint: Phase 5
- [ ] 额度查询引擎基于额度源工作
- [ ] 自动刷新 + 告警正常

---

### Phase 6: 额度看板 UI 重构

#### Task 6.1: QuotaBoard 重写

**Description:** 重写 QuotaBoard.vue — 从展示 API Key 的额度改为展示 Quota Source 的额度。

**Files:**
- `src/views/QuotaBoard.vue` — 重写

**逻辑：**
- 顶部：标题 + 手动刷新按钮 + "添加额度源"按钮
- 统计栏：已配置额度源数 / 活跃额度源数 / 告警数
- 卡片网格：每个额度源一张卡
  - 显示：额度源类型图标 + 标签 + 启用状态
  - 三个 QuotaGauge（rolling / weekly / monthly）
  - 操作按钮：刷新 / 编辑 / 删除
- 空状态：引导添加第一个额度源
- 点击卡片 → QuotaSourceDetail

**Acceptance:**
- [ ] 显示所有已配置额度源的额度
- [ ] 可手动刷新单个或全部
- [ ] 空状态有引导

**Verify:** 手动 UI 检查

**Scope:** L（1 文件）

---

#### Task 6.2: QuotaDetail 重写

**Description:** 重写 QuotaDetail.vue — 展示单个额度源的详细额度数据和趋势图。

**Files:**
- `src/views/QuotaDetail.vue` — 重写

**Acceptance:**
- [ ] 展示额度源信息 + 三窗口详情
- [ ] 展示 Chart.js 趋势图
- [ ] 单独刷新按钮

**Verify:** 手动 UI 检查

**Scope:** M（1 文件）

---

#### Task 6.3: Dashboard 更新

**Description:** 更新 Dashboard.vue 中的额度告警区域，从引用 apiKeys 改为引用 quotaSources。

**Files:**
- `src/views/Dashboard.vue`

**Acceptance:**
- [ ] 额度告警区显示正确的数据

**Verify:** `pnpm build`

**Scope:** S（1 文件）

---

### ✅ Checkpoint: Phase 6
- [ ] 额度看板完整展示额度源
- [ ] 构建 + 测试通过

---

### Phase 7: i18n + 收尾

#### Task 7.1: i18n 翻译更新

**Description:** 增补额度源模块的中英文翻译。

**Files:**
- `src/i18n/zh-CN.ts` — 新增 `quotaSources` 翻译段
- `src/i18n/en-US.ts` — 新增 `quotaSources` 翻译段
- 删除原有的 `apiKeys.alertThreshold` 翻译

**Acceptance:**
- [ ] 添加额度源弹窗所有文本中英文完整
- [ ] 额度看板所有文本中英文完整
- [ ] 设置页无额度相关残留

**Verify:** 手动切换语言检查

**Scope:** S（2 文件）

---

#### Task 7.2: 最终验证

**Description:** 全量测试 + 构建 + 人工验收。

**Actions:**
- [ ] `pnpm test` 全部通过
- [ ] `pnpm build` 构建成功
- [ ] 手工检查：添加 API Key（无阈值字段）
- [ ] 手工检查：添加额度源 → 查询额度 → 展示

**Verify:** `pnpm test && pnpm build`

**Scope:** XS

---

### ✅ Checkpoint: Complete
- [ ] 全部测试通过
- [ ] 构建成功
- [ ] 验收通过

---

## 依赖关系图

```
Phase 1 (类型清理) ───→ Phase 2 (数据层) ───→ Phase 3 (额度源 UI)
                              │                       │
                              │                       ▼
                              │               Phase 4 (适配器)
                              │                       │
                              └───────────┬───────────┘
                                          ▼
                                  Phase 5 (查询引擎)
                                          │
                                          ▼
                                  Phase 6 (看板 UI)
                                          │
                                          ▼
                                  Phase 7 (i18n + 收尾)
```

## 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| 额度源 API 差异大（与 cc-hud 相同） | 中 | 直接移植 cc-hud 现成代码 |
| 重构可能破坏现有 API Key 功能 | 高 | 每 Phase 后运行 `pnpm test` |
| 额度源适配器测试需要 mock 复杂响应 | 中 | 参考现有 provider 测试模式 |

## 总结

| Phase | 内容 | 文件数 | 工作量 |
|-------|------|--------|--------|
| P1 | 类型清理 + 额度源类型 | 6 | ★★ |
| P2 | 额度源数据层（repo + store） | 3 | ★★ |
| P3 | 额度源 UI（弹窗 + 详情 + 路由） | 3 | ★★★ |
| P4 | 8 个额度源适配器 + 测试 | 18 | ★★★★★ |
| P5 | QuotaChecker + AutoRefresh 重构 | 3 | ★★★ |
| P6 | QuotaBoard + QuotaDetail 重写 | 3 | ★★★ |
| P7 | i18n + 收尾 | 3 | ★ |
