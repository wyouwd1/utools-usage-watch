# Implementation Plan: cURL 与手动模式互斥

> 基于 SPEC.md 最新版本（已确认设计决策）。

## Overview

对于 OpenCode Go 和百炼（cURL 类额度源），将 cURL 粘贴区与手动填写区（凭证/Workspace ID/Base URL）改为**互斥模式**：默认只显示 cURL 粘贴区 + 标签输入框，用户可通过「改为手动输入」链接切换到手动模式。

**涉及文件：** `AddQuotaSourceDialog.vue` + `QuotaSourceDetail.vue`（2 个文件，逻辑相同）

## 改动对照

```
当前（问题）                              →  改为（互斥）
┌────────────────────────────┐          ┌────────────────────────────┐
│ 标签: [______________]     │          │ 标签: [______________]     │
│ 凭证: [______________]     │  同时    │                            │
│ Base URL: [__________]     │  显示    │ 📋 粘贴 cURL（推荐）       │
│ Workspace ID: [______]    │          │ ┌──────────────────────┐  │
│                            │          │ │ curl 'https://...'  │  │
│ 📋 粘贴 cURL               │          │ └──────────────────────┘  │
│ ┌──────────────────────┐  │          │ [🔍 解析 cURL]            │
│ │ curl 'https://...'   │  │          │                            │
│ └──────────────────────┘  │          │ ─── 或 ───                 │
│ [🔍 解析 cURL]            │          │ [✏️ 改为手动输入]          │
└────────────────────────────┘          └────────────────────────────┘
```

## Architecture Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 状态变量 | `manualMode: ref(false)` | 简单布尔值切换 cURL/手动模式 |
| cURL 模式显示 | 标签 + cURL 区 + 切换链接 | 满足"默认只填 cURL 和标签"需求 |
| 手动模式显示 | 标签 + 凭证 + Base URL + 配置字段 + 切换链接 | 保留原表单完整性 |
| 切换时数据 | 保留已解析值并回填 | 用户切到手动可修改，不丢失 |
| 条件判断 | `hasCurlHint` 决定是否启用互斥 | 不影响其他 6 种额度源（保持现有交互） |

## Task List

### Phase 1: 两个组件同时修改（可并行）

---

#### Task 1: AddQuotaSourceDialog 互斥改造

**Description:** 对 `AddQuotaSourceDialog.vue` 做互斥改造：当 `hasCurlHint` 为 true 时，默认只显示 cURL 粘贴区 + 标签输入框，隐藏凭证/配置字段；通过「改为手动输入」链接切换。

**Script 改动：**
```typescript
// 新增状态
const manualMode = ref(false)

// 监听 sourceType 变化时重置 manualMode
watch(sourceType, (val) => {
  // 原有逻辑...
  manualMode.value = false  // 重置为 cURL 模式
})
```

**Template 改动（共 3 处）：**

1. **凭证输入框**（当前 358-378 行）：
```html
<!-- 改动前：一直显示 -->
<div>
  <label>{{ t('quotaSources.credential') }}</label>
  <input v-model="credential" .../>
</div>

<!-- 改动后：hasCurlHint 时仅在 manualMode 显示 -->
<div v-if="!hasCurlHint || manualMode">
  <label>{{ t('quotaSources.credential') }}</label>
  <input v-model="credential" .../>
</div>
```

2. **Base URL 输入框**（当前 380-390 行）：同样加 `v-if="!hasCurlHint || manualMode"`

3. **动态配置字段**（当前 392-410 行）：同样加 `v-if="!hasCurlHint || manualMode"` 包裹

4. **cURL 区域**（当前 ~413 行起）：
```html
<!-- 改动前：v-if="hasCurlHint" -->
<!-- 改动后：hasCurlHint 时仅在非 manualMode 显示 -->
<div v-if="hasCurlHint && !manualMode">
  ...cURL 区域...
  
  <!-- 在 cURL 区域底部添加切换链接 -->
  <div class="text-center pt-2 border-t border-gray-100">
    <button
      type="button"
      @click="manualMode = true"
      class="text-xs text-gray-400 hover:text-gray-600"
    >
      ✏️ {{ t('quotaSources.switchToManual') }}
    </button>
  </div>
</div>
```

5. **手动模式下的切换链接**（在配置字段下方）：
```html
<div v-if="hasCurlHint && manualMode" class="text-center pt-2">
  <button
    type="button"
    @click="manualMode = false"
    class="text-xs text-blue-600 hover:text-blue-700"
  >
    📋 {{ t('quotaSources.switchToCurl') }}
  </button>
</div>
```

**i18n 新增**（两个文件都要加）：
zh-CN:
```typescript
switchToManual: '改为手动输入',
switchToCurl: '使用 cURL 粘贴',
```
en-US:
```typescript
switchToManual: 'Switch to manual input',
switchToCurl: 'Use cURL paste',
```

**Acceptance criteria:**
- [ ] 选择 OpenCode Go / 百炼时，默认只显示标签 + cURL 区，不显示凭证/配置字段
- [ ] 点击「改为手动输入」→ 隐藏 cURL 区，显示凭证/配置字段（保留已解析值）
- [ ] 点击「使用 cURL 粘贴」→ 回到 cURL 模式
- [ ] 选择其他额度源时不受影响（一直显示凭证输入框）
- [ ] 切换额度源类型时重置为 cURL 模式

**Verification:**
- [ ] `pnpm type-check` 通过
- [ ] `pnpm build` 成功
- [ ] `pnpm test` 全部通过

**Dependencies:** None

**Files:**
- `src/components/AddQuotaSourceDialog.vue` (修改)
- `src/i18n/zh-CN.ts` (修改)
- `src/i18n/en-US.ts` (修改)

**Estimated scope:** Small (3 files)

---

#### Task 2: QuotaSourceDetail 互斥改造

**Description:** 对 `QuotaSourceDetail.vue` 做同样的互斥改造。逻辑与 Task 1 完全一致，区别在于编辑模式下要显示当前凭证的脱敏提示。

**Script 改动：**
```typescript
// 新增状态
const manualMode = ref(false)

// 监听 sourceType 变化时重置
watch(sourceType, () => {
  // 原有逻辑...
  manualMode.value = false
})

// 加载已有数据时：如果是 hasCurlHint 且有凭证，默认显示 cURL 模式
function fillForm(es) {
  // 原有逻辑...
  // 如果是编辑且 hasCurlHint，默认 cURL 模式；
  // 但如果已有凭证且用户想手动编辑，也可切到手动
  manualMode.value = false
}
```

**Template 改动（与 Task 1 相同 5 处）：**

1. **凭证输入框**（当前 ~373 行）：加 `v-if="!hasCurlHint || manualMode"`
2. **Base URL 输入框**：加 `v-if="!hasCurlHint || manualMode"`
3. **动态配置字段**（configFields）：加 `v-if="!hasCurlHint || manualMode"`
4. **cURL 区域**（当前 ~399-460 行）：改为 `v-if="hasCurlHint && !manualMode"`
   - 在 cURL 区域底部添加「改为手动输入」切换链接
5. **手动模式下的切换链接**：在配置字段下方添加「使用 cURL 粘贴」链接

**编辑模式的特殊处理：**
- 编辑模式下，cURL 区域也显示「当前凭证: auth****e123」的提示文本
- 这已经在模板中通过 placeholder 实现，保持不动

**Acceptance criteria:**
- [ ] 新增时：行为与 Task 1 一致
- [ ] 编辑时：默认显示 cURL 重绑定区，不显示凭证输入框
- [ ] 切换模式保留数据
- [ ] 其他额度源不受影响

**Verification:**
- [ ] `pnpm type-check` 通过
- [ ] `pnpm build` 成功
- [ ] `pnpm test` 全部通过

**Dependencies:** None（与 Task 1 可并行，但 i18n key 需要协调）

**Files:**
- `src/views/QuotaSourceDetail.vue` (修改)

**Estimated scope:** Small (1 file)

---

## Checkpoints

### Checkpoint: Phase 1 Complete
- [ ] `pnpm test` 全部通过
- [ ] `pnpm build` 构建成功
- [ ] 手动验证：选择 OpenCode Go → 默认只显示 cURL + 标签
- [ ] 手动验证：点击「改为手动输入」→ 显示凭证/配置字段（数据保留）
- [ ] 手动验证：选择 DeepSeek → 不受影响，一直显示凭证输入框
- [ ] 手动验证：编辑已有 OpenCode Go 源 → 同样互斥

---

## Risks and Mitigations

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `manualMode` 未在 sourceType 切换时重置 | Low | watch sourceType 时重置 |
| 编辑模式下 fillForm 后 manualMode 状态不对 | Low | fillForm 末尾显式设 false |
| i18n key 在两个 task 同时添加导致冲突 | Low | Task 1 先加 i18n，Task 2 直接引用 |

---

## Parallelization Strategy

```
Round 1（2 Agents 并行）:
  Agent A → Task 1: AddQuotaSourceDialog 互斥改造 + i18n 新增
  Agent B → Task 2: QuotaSourceDetail 互斥改造

Round 2（验证）:
  pnpm test + pnpm build + H5 预览
```
