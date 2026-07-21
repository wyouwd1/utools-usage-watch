# Todo: 额度监控模块增强

基于 SPEC.md（访谈后版本），增量增强现有实现。

---

## Round 1 — 3 Agents 并行启动

### Agent A: cURL 解析引擎
- [ ] **0.1** 创建 `src/services/curl-parser.ts` + 单元测试
  - 验收: `pnpm test -- --grep "curl-parser"` 通过
  - 文件: `src/services/curl-parser.ts`, `tests/unit/services/curl-parser.spec.ts`

### Agent B: 类型扩展 + 过期检测逻辑
- [ ] **0.2** IQuotaSourceEntity 新增 `credentialExpiredAt` / `lastCheckSucceeded` / `lastError`
  - 验收: `pnpm type-check` 通过
  - 文件: `src/types/quota.ts`
- [ ] **2.1** quota-checker.ts 401 检测 + quotaSources store `markCheckResult()` + `expiredSources`
  - 验收: `pnpm test -- --grep "quota-checker|quotaSources"` 通过
  - 文件: `src/services/quota-checker.ts`, `src/stores/quotaSources.ts`, `src/db/quotaSources.repo.ts`

### Agent C: Settings 清理 + i18n
- [ ] **0.3** Settings.vue 移除阈值滑块 + 导出导入含 quotaSources + i18n stale keys 清理
  - 验收: `pnpm test` 通过，导出 JSON 含 quotaSources
  - 文件: `src/views/Settings.vue`, `src/i18n/zh-CN.ts`, `src/i18n/en-US.ts`

---

## ✅ Checkpoint: Round 1
- [ ] `pnpm type-check` 通过
- [ ] `pnpm test -- --grep "curl-parser"` 通过
- [ ] Settings 阈值移除 + 导出导入含额度源

---

## Round 2 — 依赖 Round 1 完成

### Agent A (继续): cURL UI
- [ ] **1.1** AddQuotaSourceDialog 集成 curl-parser + 内联预览确认区域
  - 验收: 粘贴 cURL → 解析 → 预览 → 确认填充
  - 文件: `src/components/AddQuotaSourceDialog.vue`
- [ ] **1.2** QuotaSourceDetail 修复 OpenCode Go 配置 + cURL 重绑定
  - 验收: OpenCode Go configFields 正确 + 编辑页可粘贴 cURL
  - 文件: `src/views/QuotaSourceDetail.vue`

### Agent B (继续): 过期 UI + 自动禁用
- [ ] **2.2** CredentialExpiredBanner + QuotaBoard/QuotaDetail 集成
  - 验收: 过期源显示 ⚠️ Banner + 灰色卡片
  - 文件: `src/components/CredentialExpiredBanner.vue`, `src/views/QuotaBoard.vue`, `src/views/QuotaDetail.vue`
- [ ] **2.3** auto-refresh 3 次失败自动禁用
  - 验收: 连续 3 次失败 → enabled = false
  - 文件: `src/services/auto-refresh.ts`

---

## ✅ Checkpoint: Round 2
- [ ] `pnpm test` 全量通过
- [ ] `pnpm build` 构建成功

---

## Round 3 — 验证
- [ ] `pnpm test` 全量通过（150+ 测试）
- [ ] `pnpm build` 构建成功，无警告
- [ ] 手动验证 cURL 流程：粘贴 → 解析 → 预览 → 确认 → 保存
- [ ] 手动验证过期流程：mock 401 → 过期标记 → Banner → 重绑定 → 恢复
- [ ] 手动验证 Settings：导出含 quotaSources → 导入恢复
- [ ] H5 预览检查 UI 无异常

---

## 进度追踪

| # | 任务 | 文件数 | 状态 |
|---|------|--------|------|
| 0.1 | curl-parser.ts + tests | 2 | ⏳ |
| 0.2 | 类型扩展 | 1 | ⏳ |
| 0.3 | Settings 清理 + i18n | 3 | ⏳ |
| 1.1 | AddQuotaSourceDialog 预览 | 1 | ⏳ |
| 1.2 | QuotaSourceDetail 修复 | 1 | ⏳ |
| 2.1 | 过期检测逻辑 | 3 | ⏳ |
| 2.2 | CredentialExpiredBanner + UI | 3 | ⏳ |
| 2.3 | AutoRefresh 自动禁用 | 1 | ⏳ |
