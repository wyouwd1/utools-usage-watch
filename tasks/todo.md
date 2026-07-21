# Todo: cURL 与手动模式互斥

## Round 1 — 2 Agents 并行

### Agent A: AddQuotaSourceDialog 互斥改造
- [ ] **Task 1** AddQuotaSourceDialog.vue: cURL 模式与手动模式互斥
  - `manualMode` ref + watch 重置
  - 凭证/Base URL/配置字段加 `v-if="!hasCurlHint || manualMode"`
  - cURL 区改为 `v-if="hasCurlHint && !manualMode"`
  - 添加「改为手动输入」/「使用 cURL 粘贴」切换链接
  - `src/i18n/zh-CN.ts` + `en-US.ts` 新增 `switchToManual` / `switchToCurl`
  - 验收: `pnpm build && pnpm test` 通过

### Agent B: QuotaSourceDetail 互斥改造
- [ ] **Task 2** QuotaSourceDetail.vue: cURL 模式与手动模式互斥
  - 与 Task 1 相同逻辑改造
  - 编辑模式默认 cURL 模式（显示当前凭证脱敏提示）
  - 验收: `pnpm build && pnpm test` 通过

## Round 2 — 验证
- [ ] `pnpm test` 全量通过
- [ ] `pnpm build` 构建成功
- [ ] H5 预览验证互斥交互

## 进度追踪

| # | 任务 | 文件 | 状态 |
|---|------|------|------|
| 1 | AddQuotaSourceDialog 互斥 | 3 | ⏳ |
| 2 | QuotaSourceDetail 互斥 | 1 | ⏳ |
