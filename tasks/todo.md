# Todo: utools-usage-watch 重构

> 核心修正：API Key 纯化 + 额度监控独立化

---

## Phase 1: 类型清理 + 额度源类型

### Task 1.1: API Key 类型清理
- [ ] `types/apikey.ts` — 删除 `quotaAlertThreshold` 字段
- [ ] `db/apiKeys.repo.ts` — 删除 `quotaAlertThreshold` 引用
- [ ] `components/AddKeyDialog.vue` — 删除阈值滑块（4 处）
- [ ] `i18n/zh-CN.ts` + `en-US.ts` — 删除 `apiKeys.alertThreshold`

### Task 1.2: 额度源类型定义
- [ ] `types/quota.ts` — 新增 `QuotaSourceType` 枚举
- [ ] `types/quota.ts` — 新增 `IQuotaSourceEntity` 接口
- [ ] `types/index.ts` — 确保导出

### ✅ Checkpoint P1
- [ ] `pnpm build` 通过
- [ ] `pnpm test` 通过

---

## Phase 2: 额度源数据层

### Task 2.1: quotaSources Repository
- [ ] `src/db/quotaSources.repo.ts` — 复用 db/index.ts 工具

### Task 2.2: quotaSources Pinia Store
- [ ] `src/stores/quotaSources.ts`

### Task 2.3: COLLECTION 常量更新
- [ ] `db/index.ts` — 添加 `QUOTA_SOURCE: 'quota-source/'`

### ✅ Checkpoint P2
- [ ] `pnpm build` 通过

---

## Phase 3: 额度源 UI

### Task 3.1: AddQuotaSourceDialog
- [ ] `src/components/AddQuotaSourceDialog.vue`

### Task 3.2: QuotaSourceDetail 页面
- [ ] `src/views/QuotaSourceDetail.vue`

### Task 3.3: 路由更新
- [ ] `src/router/index.ts` — 添加 `/quota-source/:id`

### ✅ Checkpoint P3
- [ ] 可添加/编辑/删除额度源
- [ ] 凭证加密存储

---

## Phase 4: 额度源适配器

### Task 4.1: 接口 + Registry
- [ ] `src/services/quota-sources/index.ts`
- [ ] `src/services/quota-sources/registry.ts`

### Task 4.2: 8 个适配器
- [ ] `src/services/quota-sources/opencode.ts`
- [ ] `src/services/quota-sources/bailian.ts`
- [ ] `src/services/quota-sources/deepseek.ts`
- [ ] `src/services/quota-sources/moonshot.ts`
- [ ] `src/services/quota-sources/groq.ts`
- [ ] `src/services/quota-sources/qwen.ts`
- [ ] `src/services/quota-sources/glm.ts`
- [ ] `src/services/quota-sources/minimax.ts`

### Task 4.3: 适配器测试
- [ ] 每个适配器 4 维度测试（isolation / parse / error / cache）

### ✅ Checkpoint P4
- [ ] `pnpm test` 全部通过

---

## Phase 5: 查询引擎重构

### Task 5.1: QuotaChecker 重写
- [ ] `src/services/quota-checker.ts` — 基于 quota sources
- [ ] `src/stores/quotas.ts` — apiKeyId → sourceId

### Task 5.2: AutoRefresh 告警重构
- [ ] `src/services/auto-refresh.ts` — 去掉 apiKeys 依赖

### ✅ Checkpoint P5
- [ ] `pnpm test` 通过

---

## Phase 6: 额度看板 UI

### Task 6.1: QuotaBoard 重写
- [ ] `src/views/QuotaBoard.vue`

### Task 6.2: QuotaDetail 重写
- [ ] `src/views/QuotaDetail.vue`

### Task 6.3: Dashboard 更新
- [ ] `src/views/Dashboard.vue`

### ✅ Checkpoint P6
- [ ] `pnpm build` 通过

---

## Phase 7: i18n + 收尾

### Task 7.1: 翻译更新
- [ ] `src/i18n/zh-CN.ts` — 新增 quotaSources 翻译
- [ ] `src/i18n/en-US.ts` — 新增 quotaSources 翻译

### Task 7.2: 最终验证
- [ ] `pnpm test` 全部通过
- [ ] `pnpm build` 构建成功
- [ ] 手工验收：API Key 无额度字段
- [ ] 手工验收：额度源独立配置

---

## 进度追踪

| Phase | 内容 | 状态 |
|-------|------|------|
| P1 | 类型清理 + 额度源类型 | ⏳ |
| P2 | 额度源数据层 | ⏳ |
| P3 | 额度源 UI | ⏳ |
| P4 | 8 个额度源适配器 | ⏳ |
| P5 | 查询引擎重构 | ⏳ |
| P6 | 额度看板 UI | ⏳ |
| P7 | i18n + 收尾 | ⏳ |
