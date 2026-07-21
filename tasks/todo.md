# Todo: utools-usage-watch

> 完整实施清单，按 Phase 组织。每完成一项勾选一项。
> 详细说明见 `tasks/plan.md`。

---

## Phase 1: 项目脚手架 (Scaffold)

### Task 1.1: 初始化 npm 项目 + 安装依赖
- [ ] 创建 `package.json`（Vue 3 + Vite + TypeScript + Tailwind + Pinia + vue-i18n + Chart.js + Vitest）
- [ ] `tsconfig.json` — strict: true, path alias `@/`
- [ ] `vite.config.ts` — vue plugin + resolve alias
- [ ] `tailwind.config.js` + `postcss.config.js`
- [ ] `pnpm install` 无报错

### Task 1.2: uTools 插件骨架
- [ ] `plugin.json` — manifest v1, `aw` 关键词
- [ ] `preload.js` — 基础 Node 桥接
- [ ] `index.html` — Vue 挂载点

### Task 1.3: Vue 应用骨架 + 路由 + 布局
- [ ] `src/main.ts` — createApp + Pinia + Router + i18n
- [ ] `src/App.vue` — `<router-view />`
- [ ] `src/router/index.ts` — 6 个路由（Dashboard/ApiKeys/ApiKeyDetail/QuotaBoard/QuotaDetail/Settings）
- [ ] `src/layouts/MainLayout.vue` — 侧边导航 + 内容区

### Task 1.4: i18n 初始化 + 测试基础设施
- [ ] `src/i18n/index.ts` — vue-i18n 配置
- [ ] `src/i18n/zh-CN.ts` — 初始中文翻译
- [ ] `src/i18n/en-US.ts` — 初始英文翻译
- [ ] `vitest.config.ts` — jsdom 环境
- [ ] `tests/unit/smoke.spec.ts` — 冒烟测试通过

### ✅ Checkpoint Phase 1
- [ ] `pnpm dev` 启动正常，布局渲染
- [ ] 中英文切换生效
- [ ] `pnpm test` 通过
- [ ] `pnpm type-check` 无错误

---

## Phase 2: 数据层 + 加密

### Task 2.1: 类型定义 + utools.db 集合设计
- [ ] `src/types/apikey.ts` — IApiKeyEntity, KeyStatus, ProviderType
- [ ] `src/types/quota.ts` — IQuotaWindows, IQuotaHistoryEntity
- [ ] `src/types/settings.ts` — ISettingEntity
- [ ] `src/db/index.ts` — COLLECTION 常量 + docId() / getByPrefix() / putDoc() 通用工具

### Task 2.2: API Key Repository (utools.db)
- [ ] `src/db/apiKeys.repo.ts` — getAll / getById / add / update / remove / search

### Task 2.3: 设置 Repository
- [ ] `src/db/settings.repo.ts` — get / set / getAll

### Task 2.4: 加密服务
- [ ] `src/services/encrypt.ts` — AES-GCM encrypt/decrypt + PBKDF2 key derivation

### Task 2.5: 校验工具
- [ ] `src/utils/validators.ts` — API Key 格式校验 + URL 校验

### Task 2.6: 数据层测试
- [ ] `tests/unit/db/apiKeys.repo.spec.ts` — CRUD 测试
- [ ] `tests/unit/services/encrypt.spec.ts` — 加密/解密测试
- [ ] `tests/unit/utils/validators.spec.ts` — 校验测试

### ✅ Checkpoint Phase 2
- [ ] `pnpm test` 全部通过
- [ ] utools.db API 验证（allDocs / put / get / remove / _rev 管理）
- [ ] ⚠ 确认额度缓存/历史不写入 utools.db（存 Pinia 内存）
- [ ] Key 加密存储 → 解密读取全流程验证
- [ ] `pnpm type-check` 无错误

---

## Phase 3: API Key 管理界面

### Task 3.1: Pinia Stores
- [ ] `src/stores/apiKeys.ts` — API Key CRUD + 搜索
- [ ] `src/stores/providers.ts` — 提供商注册表

### Task 3.2: API Key 列表页
- [ ] `src/views/ApiKeys.vue` — 按提供商分组 + 搜索过滤
- [ ] `src/components/SearchInput.vue` — 搜索输入框

### Task 3.3: API Key 编辑/新增
- [ ] `src/views/ApiKeyDetail.vue` — 编辑页
- [ ] `src/components/AddKeyDialog.vue` — 新增弹窗

### Task 3.4: 状态显示组件
- [ ] `src/components/ProviderIcon.vue` — 提供商图标
- [ ] `src/components/KeyStatusBadge.vue` — 状态标签

### Task 3.5: Store 测试
- [ ] `tests/unit/stores/apiKeys.spec.ts`

### ✅ Checkpoint Phase 3
- [ ] API Key CRUD 完整可用
- [ ] 脱敏显示正确
- [ ] 搜索过滤正常
- [ ] `pnpm test` 通过

---

## Phase 4: 提供商适配器 + 连通性测试

### Task 4.1: Adapter 接口 + 注册表
- [ ] `src/services/providers/index.ts` — IProviderAdapter 接口
- [ ] `src/services/providers/registry.ts` — 适配器注册表

### Task 4.2: 5 个核心适配器
- [ ] `src/services/providers/openai.ts` — OpenAI
- [ ] `src/services/providers/anthropic.ts` — Anthropic
- [ ] `src/services/providers/deepseek.ts` — DeepSeek（参考 cc-hud balance.ts）
- [ ] `src/services/providers/openrouter.ts` — OpenRouter
- [ ] `src/services/providers/ollama.ts` — Ollama（仅连通性 + 模型列表）

### Task 4.3: Key Tester 服务
- [ ] `src/services/key-tester.ts` — 测试 + 更新状态

### Task 4.4: 测试连通性 UI
- [ ] `src/components/TestConnection.vue` — 测试按钮 + 结果展示 + 模型列表

### Task 4.5: 适配器 4 维度测试
- [ ] `tests/unit/services/providers/openai.spec.ts`
- [ ] `tests/unit/services/providers/anthropic.spec.ts`
- [ ] `tests/unit/services/providers/deepseek.spec.ts`
- [ ] `tests/unit/services/providers/openrouter.spec.ts`
- [ ] `tests/unit/services/providers/ollama.spec.ts`
- [ ] `tests/unit/services/key-tester.spec.ts`

### ✅ Checkpoint Phase 4
- [ ] 5 个适配器通过 4 维度测试
- [ ] 一键测试连通性可用
- [ ] Ollama 显示本地模型列表
- [ ] `pnpm test` 全通过

---

## Phase 5: 额度监控模块

### Task 5.1: 适配器扩展 — 额度查询
- [ ] OpenAI: `GET /v1/dashboard/billing/usage`
- [ ] Anthropic: response headers rate limits
- [ ] DeepSeek: `GET /user/balance`（已实现）
- [ ] OpenRouter: `GET /v1/auth/key` credits

### Task 5.2: 额度查询引擎
- [ ] `src/services/quota-checker.ts` — withCache + TTL + stale-while-revalidate

### Task 5.3: 自动刷新调度器
- [ ] `src/services/auto-refresh.ts` — 定时轮询 + 可见性感知 + 去重

### Task 5.4: Pinia Quota Store
- [ ] `src/stores/quotas.ts` — quotaMap + loadingKeys + actions

### Task 5.5: 额度看板 UI
- [ ] `src/views/QuotaBoard.vue` — 三窗口总览看板
- [ ] `src/components/QuotaGauge.vue` — 进度条（cc-hud 配色）
- [ ] 手动刷新按钮 + 上次刷新时间
- [ ] 重置倒计时（formatCountdown）

### Task 5.6: 额度详情 + 趋势图
- [ ] `src/views/QuotaDetail.vue` — 单 Key 额度详情
- [ ] `src/components/QuotaTrendChart.vue` — Chart.js 趋势折线图

### Task 5.7: 额度模块测试
- [ ] `tests/unit/services/quota-checker.spec.ts`
- [ ] `tests/unit/services/auto-refresh.spec.ts`
- [ ] `tests/unit/stores/quotas.spec.ts`

### ✅ Checkpoint Phase 5
- [ ] 额度看板展示三窗口使用率
- [ ] 颜色分级正确（绿/黄/橙/红）
- [ ] 手动刷新 + 自动刷新可用
- [ ] 趋势图渲染正常
- [ ] `pnpm test` 通过
- [ ] `pnpm build` 成功

---

## Phase 6: 扩展适配器 + 总览看板

### Task 6.1: 6 个扩展适配器 + 测试
- [ ] `src/services/providers/google.ts`
- [ ] `src/services/providers/azure.ts`
- [ ] `src/services/providers/moonshot.ts`（参考 cc-hud moonshot.ts）
- [ ] `src/services/providers/groq.ts`（参考 cc-hud groq.ts）
- [ ] `src/services/providers/qwen.ts`（参考 cc-hud qwen.ts）
- [ ] `src/services/providers/glm.ts`（参考 cc-hud glm.ts）
- [ ] 每个对应的 4 维度测试

### Task 6.2: 总览看板
- [ ] `src/views/Dashboard.vue` — 统计摘要 + 额度告急区

### ✅ Checkpoint Phase 6
- [ ] 11+ 提供商可选
- [ ] 全部适配器测试通过
- [ ] Dashboard 有有意义的数据

---

## Phase 7: 预警系统 + i18n + 设置页

### Task 7.1: 预警系统
- [ ] `src/components/AlertToast.vue` — 预警 Toast 组件
- [ ] 预警检测逻辑插入 auto-refresh（阈值判断 + 去重）
- [ ] uTools 系统通知

### Task 7.2: 完整 i18n + 设置页
- [ ] 完善 `src/i18n/zh-CN.ts` — 全部翻译条目
- [ ] 完善 `src/i18n/en-US.ts` — 全部翻译条目
- [ ] `src/views/Settings.vue` — 语言/刷新间隔/预警阈值/导入导出
- [ ] `src/stores/settings.ts`

### ✅ Checkpoint Phase 7
- [ ] 额度预警可视化 + 系统通知
- [ ] 中英文切换覆盖全部 UI
- [ ] 设置页功能完整

---

## Phase 8: uTools 集成 + 打包 + 上架

### Task 8.1: uTools 关键字增强 + 系统通知
- [ ] 更新 `plugin.json` — subcommand 支持
- [ ] 更新 `preload.js` — subcommand 路由处理
- [ ] 集成 `utools.showNotification()`

### Task 8.2: 构建优化 + 打包
- [ ] `vite.config.ts` — 构建优化配置
- [ ] `package.json` — `pack-upx` 脚本
- [ ] 构建验证 < 5MB

### Task 8.3: 上架文档 + 集成测试
- [ ] `docs/marketplace-submission.md` — 市场提交指南
- [ ] `tests/integration/quota-flow.spec.ts`

### ✅ Checkpoint Phase 8
- [ ] `aw quota` 子命令跳转正常
- [ ] `pnpm pack-upx` 成功
- [ ] 构建产物 < 5MB
- [ ] 集成测试通过

---

## Phase 9: 最终质量收尾

### Task 9.1: 覆盖率达标
- [ ] 运行 `pnpm test --coverage` ≥ 80%
- [ ] 补足低覆盖率模块

### Task 9.2: 文档完善
- [ ] `README.md` — 项目介绍、截图、安装方式
- [ ] `CHANGELOG.md` — v1.0.0 初始版本

### Task 9.3: Success Criteria 验收
- [ ] 8+ 提供商可用
- [ ] 自定义 endpoint 支持
- [ ] 添加 Key → 测试 ≤ 5 步
- [ ] 额度看板三窗口展示
- [ ] 自动刷新正常
- [ ] 额度预警
- [ ] Key 加密存储
- [ ] 适配器 4 维度测试
- [ ] 覆盖率 ≥ 80%
- [ ] uTools `aw` 搜索
- [ ] 构建产物 < 5MB
- [ ] 零外部运行时依赖

---

## 进度追踪

| Phase | 状态 | 任务数 | 完成 | 备注 |
|-------|------|--------|------|------|
| P1 项目脚手架 | ⏳ 待开始 | 14 | 0/14 | |
| P2 数据层+加密 | ⏳ 待开始 | 12 | 0/12 | |
| P3 API Key UI | ⏳ 待开始 | 8 | 0/8 | |
| P4 适配器+连通性 | ⏳ 待开始 | 15 | 0/15 | |
| P5 额度监控 | ⏳ 待开始 | 15 | 0/15 | 核心模块，参考 cc-hud |
| P6 扩展适配器 | ⏳ 待开始 | 13 | 0/13 | |
| P7 预警+i18n+设置 | ⏳ 待开始 | 7 | 0/7 | |
| P8 uTools集成+打包 | ⏳ 待开始 | 7 | 0/7 | |
| P9 QA 收尾 | ⏳ 待开始 | 6 | 0/6 | |
| **总计** | | **97** | **0/97** | |
