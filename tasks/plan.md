# Implementation Plan: 额度监控模块增强

> 基于 SPEC.md（访谈后版本），在现有实现上增量增强。
> 聚焦：cURL 解析 + 预览确认 + 凭证过期检测 + 设置清理

## Overview

现有实现已是完整的，这次不做重写，而是**增量增强**：

1. **cURL 解析引擎** — 独立 `curl-parser.ts`，支持 OpenCode Go + 百炼
2. **预览确认流程** — 粘贴 cURL → 解析 → 内联预览 → 确认填充
3. **QuotaSourceDetail 修复** — OpenCode Go 配置字段修正 + cURL 重绑定
4. **凭证过期检测** — 401 响应标记 + CredentialExpiredBanner + 3 次失败自动禁用
5. **Settings 清理** — 移除无用阈值滑块 + 导出导入含额度源

## Architecture Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| cURL 解析器 | 独立 `src/services/curl-parser.ts` | 可单元测试，AddDialog 和 Detail 复用 |
| 解析预览 | 内联预览区域（非弹窗） | 交互更流畅，减少弹窗层级 |
| 过期字段 | 在 IQuotaSourceEntity 新增 3 个字段 | 持久化存储，重启后仍可识别过期状态 |
| 自动禁用 | auto-refresh.ts 内维护 failureCount Map（内存） | 不污染数据模型，重启后重置计数 |
| cURL 范围 | 仅 OpenCode Go 和百炼 | 其他源有 API Key，不需要 cURL |

## Dependency Graph

```
Round 1（3 Agents 并行）:
  Agent A: curl-parser.ts + tests ────────┐
  Agent B: 类型扩展 (expiry fields)        │  ┌── Settings清理 + i18n stale keys
  Agent C: Settings清理 + i18n stale keys ─┘  │

Round 2（Agent A 完成后，2 Agents 并行）:
  Agent A (继续): AddQuotaSourceDialog + CurlPreview ──┐
  Agent A (继续): QuotaSourceDetail 修复               │
  Agent B:  过期检测 (quota-checker + store) ──────────┤
  Agent B:  CredentialExpiredBanner + UI              │
  Agent B:  auto-refresh auto-disable ────────────────┘

Round 3:
  全量测试 + 构建 + H5 预览验证
```

---

## Task List

### Phase 0: Foundation（Round 1 — 3 Agents 并行）

---

#### Task 0.1: 创建独立 cURL 解析模块

**Description:** 将 `AddQuotaSourceDialog.vue` 中的 `parseCurl()` 函数抽离为独立模块 `src/services/curl-parser.ts`。支持 OpenCode Go 和百炼的 cURL 命令解析。返回结构化结果供 UI 预览。

**Implement `parseCurl()`:**
```typescript
interface CurlParseResult {
  url: string
  baseUrl: string
  headers: Record<string, string>
  cookies: Record<string, string>
  workspaceId?: string
  secToken?: string   // for Bailian
}

interface CurlParseError {
  code: 'NO_URL' | 'NO_CREDENTIAL' | 'INVALID_FORMAT'
  message: string
  userMessage: { zh: string; en: string }
}
```

- 提取 URL（`curl\s+['"]?([^'"\s]+)`）
- 提取 base URL（`https?://[^/]+`）
- 提取 Cookie（`Cookie: xxx` 或 `-H "cookie: xxx"`）
- 提取 workspaceId（`/workspace/([^/\s?]+)`）
- 提取 sec_token（query param 或 header）
- 所有提取失败返回结构化错误，不抛异常

**Acceptance criteria:**
- [ ] `parseCurl()` 成功返回 `CurlParseResult`
- [ ] 支持 OpenCode Go 格式：提取 Cookie auth + workspaceId
- [ ] 支持百炼格式：提取 Cookie + sec_token
- [ ] 解析失败返回 `CurlParseError` 含中英文错误信息
- [ ] 单元测试覆盖：成功、空字符串、无 URL、无 cookie、格式错误

**Verification:**
- [ ] `pnpm test -- --grep "curl-parser"` 通过
- [ ] 边界情况全覆盖

**Dependencies:** None

**Files:**
- `src/services/curl-parser.ts` **(创建)**
- `tests/unit/services/curl-parser.spec.ts` **(创建)**

**Estimated scope:** Small (2 files)

---

#### Task 0.2: 扩展 IQuotaSourceEntity 类型 — 过期检测字段

**Description:** 在 `IQuotaSourceEntity` 新增 3 个可选字段。

**Changes:**
```typescript
export interface IQuotaSourceEntity {
  // ... existing fields ...
  credentialExpiredAt?: number     // cookie 过期时间戳
  lastCheckSucceeded?: boolean     // 上次检查是否成功
  lastError?: string               // 上次错误信息
}
```

同时将 `CurlParseResult` 和 `CurlParseError` 接口定义放在 `types/quota.ts`（供 curl-parser.ts 和组件共用）。

**Acceptance criteria:**
- [ ] `IQuotaSourceEntity` 新增 3 个可选字段
- [ ] `CurlParseResult` 和 `CurlParseError` 接口在 `types/quota.ts` 中
- [ ] 无编译错误，向后兼容

**Verification:**
- [ ] `pnpm type-check` 通过

**Dependencies:** None

**Files:**
- `src/types/quota.ts` (修改)

**Estimated scope:** Small (1 file)

---

#### Task 0.3: Settings 清理 + i18n stale keys

**Description:** 三件事一起做：
1. **Settings.vue** 移除"默认预警阈值"整个 section（template + script）
2. **handleExport()** 增加 quotaSources 数据
3. **handleImport()** 增加 quotaSources 导入（向后兼容旧格式）
4. **i18n** 移除 `apiKeys.threshold`、`settings.alertThreshold*`

**Acceptance criteria:**
- [ ] Settings 页面不再有阈值滑块
- [ ] 导出的 JSON 包含 `quotaSources` 数组
- [ ] 导入能恢复额度源数据（调用 `quotaSourcesRepo.importEntity`）
- [ ] 旧备份文件（无 quotaSources 字段）也能正常导入
- [ ] i18n 无 `threshold`/`alertThreshold` 残留

**Verification:**
- [ ] `pnpm test` 通过
- [ ] 手动验证：导出含 quotaSources → 清空 → 导入恢复

**Dependencies:** None

**Files:**
- `src/views/Settings.vue` (修改)
- `src/i18n/zh-CN.ts` (修改)
- `src/i18n/en-US.ts` (修改)

**Estimated scope:** Medium (3 files)

---

### ✅ Checkpoint: Phase 0 Complete
- [ ] `pnpm type-check` 通过
- [ ] `pnpm test -- --grep "curl-parser"` 通过
- [ ] Settings 阈值移除 + 导出导入含额度源
- [ ] 可以进入 Round 2

---

### Phase 1: cURL Feature（Round 2 — 依赖 Task 0.1）

---

#### Task 1.1: AddQuotaSourceDialog 改造 — 集成 curl-parser + 预览确认

**Description:** 改造 `AddQuotaSourceDialog.vue`：
1. 引入 `curl-parser.ts` 替换内联 `parseCurl()`
2. 点击"解析"后，**在下方展开内联预览区域**（非弹窗），显示：
   - Base URL ✅
   - Cookie（脱敏）✅
   - Workspace ID（如有）✅
   - sec_token（如有，百炼）✅
3. 用户点击"确认填充" → 字段自动填入表单
4. 用户可手动修改预览结果再确认
5. 解析失败时显示具体错误 + 展开手动表单 fallback

**Preview UI (inline, same dialog):**
```
┌─────────────────────────────────────┐
│ 📋 粘贴 cURL                        │
│ ┌─────────────────────────────┐    │
│ │ curl 'https://...' -H ...  │    │
│ └─────────────────────────────┘    │
│ [🔍 解析 cURL]                      │
│                                     │
│ ┌─ 解析结果 ─────────────────────┐  │
│ │ ✅ Base URL: opencode.ai       │  │
│ │ ✅ Cookie:   oc_****89ab       │  │
│ │ ✅ Workspace: ws_abc123        │  │
│ │                                │  │
│ │ [✗ 取消]  [✓ 确认填充]        │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] 粘贴 cURL → 点击"解析" → 显示内联预览
- [ ] 预览数据脱敏显示
- [ ] 确认填充后表单字段自动填入
- [ ] 解析失败 → 显示错误原因 + 手动表单可用
- [ ] 引导文字保持 i18n（兼容双语，已实现）

**Verification:**
- [ ] `pnpm test` 通过
- [ ] 手动测试：粘贴 OpenCode Go cURL → 解析 → 预览 → 确认 → 保存

**Dependencies:** Task 0.1 (curl-parser.ts)

**Files:**
- `src/components/AddQuotaSourceDialog.vue` (修改)

**Estimated scope:** Medium (1 file)

---

#### Task 1.2: 修复 QuotaSourceDetail.vue — OpenCode Go 配置 + cURL 重绑定

**Description:** 修复两个问题：

**问题 A — 配置字段错误（当前 lines 21-27）：**
```
// 当前（错误 — 复制了百炼的字段）
OPENCODE_GO: {
  label: 'OpenCode Go',
  defaultBaseUrl: 'https://api.opencode-go.com',    // ← 错
  configFields: [
    { key: 'sec_token', label: 'SEC Token', type: 'password', required: true },  // ← 错
    { key: 'region', label: 'Region', type: 'text' },   // ← 错
  ],
},

// 修正后
OPENCODE_GO: {
  label: 'OpenCode Go',
  defaultBaseUrl: 'https://opencode.ai',               // ✅
  configFields: [
    { key: 'workspaceId', label: 'Workspace ID', type: 'text', required: false },  // ✅
  ],
},
```

**问题 B — 编辑页无 cURL 粘贴：**
- 在 credential 输入框下方添加 cURL 粘贴区域（与 AddQuotaSourceDialog 相同）
- 解析后直接填充 credential + baseUrl + configValues
- 支持"更新凭证"场景：用户粘贴新 cURL → 预览 → 确认 → 凭证更新

**Acceptance criteria:**
- [ ] OpenCode Go configFields 修正为 `workspaceId`
- [ ] OpenCode Go defaultBaseUrl 修正为 `https://opencode.ai`
- [ ] 编辑页有 cURL 粘贴 + 预览区域
- [ ] 粘贴新 cURL 可更新凭证

**Verification:**
- [ ] `pnpm test` 通过
- [ ] 手动测试：编辑 OpenCode Go 源 → 粘贴新 cURL → 凭证更新成功

**Dependencies:** Task 0.1 (curl-parser.ts), Task 1.1 (复用预览组件模式)

**Files:**
- `src/views/QuotaSourceDetail.vue` (修改)

**Estimated scope:** Medium (1 file)

---

### Phase 2: Expiry Detection（Round 2 — 可和 Phase 1 并行）

---

#### Task 2.1: 凭证过期检测 — quota-checker.ts + quotaSources store

**Description:** 
在 **quota-checker.ts** 的 `checkSingleSource()` 中增强：
- catch 检测 `error.message` 含 `401` 或 `Unauthorized` → 调用 `sourcesStore.markCheckResult(id, false, message)`
- 成功时调用 `markCheckResult(id, true)`
- 非 401 错误（超时、网络错误）不标记过期

在 **quotaSources store** 新增：
```typescript
function markCheckResult(id: string, succeeded: boolean, errorMsg?: string): void
// 更新 lastCheckSucceeded, lastError
// succeeded=false 时设置 credentialExpiredAt = Date.now()
// succeeded=true 时清空过期标记

const expiredSources: ComputedRef<IQuotaSourceEntity[]>
// 过滤 lastCheckSucceeded === false 的源
```

**quotaSources.repo.ts** 的 `update()` 要能持久化这些新字段（已有通用 update 逻辑，确认即可）。

**Acceptance criteria:**
- [ ] 401 响应 → `markCheckResult(id, false, '401 Unauthorized')`
- [ ] `credentialExpiredAt` 被设置
- [ ] 成功响应 → 清空过期标记
- [ ] 非 401 错误不标记过期
- [ ] `expiredSources` 正确返回过期源列表

**Verification:**
- [ ] `pnpm test -- --grep "quota-checker"` 通过
- [ ] `pnpm test -- --grep "quotaSources"` 通过

**Dependencies:** Task 0.2 (types updated)

**Files:**
- `src/services/quota-checker.ts` (修改)
- `src/stores/quotaSources.ts` (修改)
- `src/db/quotaSources.repo.ts` (确认或微调)

**Estimated scope:** Medium (2-3 files)

---

#### Task 2.2: CredentialExpiredBanner + UI 集成

**Description:** 创建凭证过期提示条组件，集成到 QuotaBoard 和 QuotaDetail。

**CredentialExpiredBanner.vue:**
```
┌──────────────────────────────────────────────┐
│ ⚠️ 凭证已过期 · opencode-go · 最后错误: 401  │
│ 请重新绑定凭证以继续监控额度                   │
│ [立即更新 → /quota-source/:id]               │
└──────────────────────────────────────────────┘
```

**QuotaBoard.vue 改动：**
- 卡片中 `credentialExpiredAt` 的源显示 ⚠️ 标记
- 卡片变为半透明灰色状态
- 但仍显示最后一次成功的额度数据

**QuotaDetail.vue 改动：**
- 页面顶部显示 CredentialExpiredBanner
- 刷新按钮旁提示"凭证已过期"

**Acceptance criteria:**
- [ ] CredentialExpiredBanner 渲染黄色警告条 + 跳转链接
- [ ] QuotaBoard 过期卡片 ⚠️ 标记 + 灰色半透明
- [ ] QuotaDetail 顶部显示 Banner
- [ ] 无过期源时不渲染

**Verification:**
- [ ] `pnpm test` 通过
- [ ] 手动验证：手动设置 `lastCheckSucceeded=false` → 页面过期提示

**Dependencies:** Task 2.1 (store 能返回过期源)

**Files:**
- `src/components/CredentialExpiredBanner.vue` **(创建)**
- `src/views/QuotaBoard.vue` (修改)
- `src/views/QuotaDetail.vue` (修改)

**Estimated scope:** Medium (3 files)

---

#### Task 2.3: AutoRefresh — 3 次连续失败自动禁用

**Description:** 在 `auto-refresh.ts` 中维护连续失败计数。连续 3 次失败 → 自动禁用额度源。

```typescript
class AutoRefreshScheduler {
  private failureCount = new Map<string, number>()  // sourceId → count
  
  // 每次 refreshAll 后检查
  private async refreshAllWithTracking(): Promise<void> {
    // 在 refreshAll 完成后，检查每个源的 lastCheckSucceeded
    // 如果 false → failureCount 增加
    // 如果 true → failureCount 删除
    // 如果 >= 3 → 调用 quotaSourcesStore.updateSource(id, { enabled: false })
  }
}
```

- 成功请求清除该源的计数
- 计数在 `start()` 调用时重置
- 自动禁用后不需要额外通知（credentialExpiredBanner 会显示）

**Acceptance criteria:**
- [ ] `failureCount` Map 跟踪每个源的连续失败次数
- [ ] 成功请求重置计数
- [ ] 达到 3 次时自动 `enabled = false`
- [ ] start() 重置所有计数

**Verification:**
- [ ] `pnpm test -- --grep "auto-refresh"` 通过
- [ ] 单元测试：mock 3 次失败 → 验证 updateSource 被调用

**Dependencies:** Task 2.1 (store 有 updateSource)

**Files:**
- `src/services/auto-refresh.ts` (修改)

**Estimated scope:** Small (1 file)

---

### ✅ Checkpoint: Final
- [ ] `pnpm test` 全量通过（150+ 测试）
- [ ] `pnpm build` 构建成功，无警告
- [ ] 手动验证 cURL 流程：粘贴 → 解析 → 预览 → 确认 → 保存
- [ ] 手动验证过期流程：mock 401 → 过期标记 → Banner → 重绑定 → 恢复
- [ ] 手动验证 Settings：导出含 quotaSources → 导入恢复
- [ ] H5 预览检查 UI 无异常

---

## Risks and Mitigations

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 百炼 sec_token 可能在 URL query 或 header 中 | Medium | curl-parser 同时检查 header + query param |
| 现有测试因类型变更失败 | Medium | Task 0.2 后立即跑 `pnpm test` 验证 |
| QuotaSourceDetail 和 AddDialog cURL 逻辑重复 | Low | 复用 curl-parser.ts，组件内只做 UI |
| Settings 导入旧备份（无 quotaSources） | Low | `?.` 可选链 + 默认 `[]` 处理 |

---

## Parallelization Strategy

```
Round 1 (3 Agents 并行启动):
  Agent A → Task 0.1 (curl-parser.ts + tests)
  Agent B → Task 0.2 (types) + Task 2.1 (expiry in checker + store)
  Agent C → Task 0.3 (Settings cleanup + i18n)

Round 2 (Agent A 完成后启动 2 Agents):
  Agent A → Task 1.1 (AddQuotaSourceDialog preview)
         → Task 1.2 (QuotaSourceDetail fix)
  Agent B → Task 2.2 (CredentialExpiredBanner + QuotaBoard/Detail)
         → Task 2.3 (auto-refresh auto-disable)

Round 3 (验证):
  Agent A → pnpm test 全量 + pnpm build
  Agent A → H5 预览验证
```

## 任务清单汇总

| # | 任务 | 文件数 | 工作量 | 依赖 |
|---|------|--------|--------|------|
| 0.1 | curl-parser.ts + tests | 2 | S | 无 |
| 0.2 | 类型扩展 | 1 | XS | 无 |
| 0.3 | Settings 清理 + i18n | 3 | M | 无 |
| 1.1 | AddQuotaSourceDialog 预览 | 1 | M | 0.1 |
| 1.2 | QuotaSourceDetail 修复 | 1 | M | 0.1 |
| 2.1 | 过期检测逻辑 | 3 | M | 0.2 |
| 2.2 | CredentialExpiredBanner + UI | 3 | M | 2.1 |
| 2.3 | AutoRefresh 自动禁用 | 1 | S | 2.1 |

**总计: ~15 文件 | ~8 任务 | 预期 2-3 轮 subagent 执行**
