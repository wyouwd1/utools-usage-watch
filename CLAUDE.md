# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

uTools 插件 — AI 模型 API Key 管理与额度监控工具。支持 11+ AI 提供商，双轨额度检查（cURL 自动执行 + 手动适配器），AES-GCM 加密存储。

## 常用命令

```bash
# 安装依赖
pnpm install

# 启动 H5 开发服务器（浏览器预览，带 CORS 代理）
pnpm dev

# 构建生产版本（含类型检查）
pnpm build

# 类型检查（不构建）
pnpm type-check

# Lint
pnpm lint
pnpm lint:fix

# 运行所有测试
pnpm test

# 单个测试文件
pnpm vitest run tests/unit/services/curl-parser.spec.ts
pnpm vitest run tests/unit/services/curl-parser --reporter verbose

# 监听模式
pnpm test:watch

# 测试覆盖率
pnpm test:coverage

# 打包为 uTools .upx 插件
pnpm pack-upx

# 启动 Vite 预览
pnpm preview
```

## 项目结构

```
src/
├── main.ts                 # 入口：Vue/Pinia/I18n 初始化 + uTools 子命令路由
├── App.vue                 # 根组件
├── types/                  # TypeScript 类型定义
│   ├── quota.ts            #   额度数据模型 + 枚举（IQuotaWindows, QuotaSourceType, CurlRequest 等）
│   ├── apikey.ts           #   API Key 实体 + 枚举（ProviderType, KeyStatus）
│   ├── provider.ts         #   IProviderAdapter 接口定义
│   └── settings.ts         #   设置类型
├── components/             # 可复用 UI 组件
│   ├── QuotaGauge.vue      #   cc-hud 风格额度进度条（绿/黄/橙/红四色），compact + hideBar 双模式
│   ├── AddQuotaSourceDialog.vue  # 添加额度源弹窗（粘贴 cURL / 手动模式双入口）
│   ├── QuotaTrendChart.vue #   Chart.js 折线图
│   ├── ProviderIcon.vue    #   提供商图标
│   ├── KeyStatusBadge.vue  #   Key 状态徽标
│   └── ...
├── views/                  # 页面组件
│   ├── Dashboard.vue       #   概览页
│   ├── QuotaBoard.vue      #   额度看板（触发 autoRefreshScheduler.start）
│   ├── QuotaDetail.vue     #   额度详情（含 Chart.js 趋势图）
│   ├── ApiKeys.vue         #   API Key 列表
│   ├── ApiKeyDetail.vue    #   API Key 详情
│   ├── QuotaSourceDetail.vue # 额度源编辑
│   └── Settings.vue        #   设置页
├── services/               # 业务逻辑层
│   ├── quota-checker.ts    #   核心：双轨检查（curlRaw → curl-executor + response-parser，
│   │                       #   否则 → decrypt + quota-sources adapter）
│   ├── curl-parser.ts      #   解析 cURL 命令字符串 → CurlRequest / CurlParseResult
│   ├── curl-executor.ts    #   执行 CurlRequest → fetch → response text
│   ├── response-parsers/   #   [cURL 模式] 各额度源的响应解析器（纯函数注册表）
│   │   ├── index.ts        #     注册表：sourceType → (body: string) => IQuotaWindows | null
│   │   ├── opencode.ts     #     OpenCode Go HTML 解析
│   │   └── bailian.ts, deepseek.ts, moonshot.ts, groq.ts, qwen.ts, glm.ts, minimax.ts
│   ├── quota-sources/      #   [手动模式] 各额度源适配器（实现 IQuotaSourceAdapter 接口）
│   │   ├── index.ts        #     IQuotaSourceAdapter 接口定义
│   │   ├── registry.ts     #     注册表 ← 自动注册所有内建适配器
│   │   ├── opencode.ts     #     OpenCode Go adapter
│   │   └── bailian.ts, deepseek.ts, ...  # 同 response-parsers
│   ├── providers/          #   AI 提供商适配器（API Key 连通性测试 + 额度查询）
│   │   ├── index.ts        #     re-export types
│   │   ├── registry.ts     #     注册表 ← 自动注册所有内建适配器
│   │   └── openai.ts, anthropic.ts, deepseek.ts, openrouter.ts, ...
│   ├── auto-refresh.ts     #   自动刷新调度器（单例，支持 visibilitychange 暂停、
│   │                       #   连续 3 次失败自动停用额度源）
│   ├── encrypt.ts          #   AES-GCM 加密/解密
│   └── key-tester.ts       #   连通性测试
├── stores/                 # Pinia 状态管理
│   ├── quotas.ts           #   额度缓存（内存，5min TTL），历史记录，最低额度排序
│   ├── quotaSources.ts     #   额度源 CRUD，搜索，检查结果标记
│   ├── apiKeys.ts          #   API Key CRUD，按提供商计数
│   ├── providers.ts        #   提供商适配器查询
│   └── settings.ts         #   设置
├── db/                     # utools.db 数据访问层（H5 开发时用 Map 回退）
│   ├── index.ts            #   通用 db 操作（getByPrefix, putDoc, removeDoc, getDoc）
│   ├── apiKeys.repo.ts     #   API Key 仓库
│   ├── quotaSources.repo.ts #  额度源仓库（含加密存储）
│   └── settings.repo.ts    #   设置仓库
├── i18n/                   # vue-i18n 双语翻译
│   ├── zh-CN.ts
│   └── en-US.ts
├── router/                 # Vue Router（hash 模式）
│   └── index.ts
├── utils/
│   └── fetch.ts            # H5 开发 CORS 代理：monkey-patch 全局 fetch
├── layouts/
│   └── MainLayout.vue
└── assets/styles/
    └── main.css            # Tailwind 入口
```

## 架构要点

### 双轨额度检查模式

`quota-checker.ts` 中的 `checkSingleSource()` 根据额度源是否有 `curlRaw` 字段决定路径：

```
有 curlRaw → cURL 模式：
  parseCurlToRequest() → executeCurl() → responseParsers[sourceType]() → IQuotaWindows

无 curlRaw → 手动模式：
  decrypt(encryptedCredential) → adapter.checkQuota() → IQuotaWindows
```

### 注册表模式

两套独立的注册表，都采用自动注册 + Map 查找：
- `services/providers/registry.ts` — `AdapterRegistry`：11 个 AI 提供商
- `services/quota-sources/registry.ts` — `QuotaSourceRegistry`：8 个额度源

### 响应解析器 vs 适配器

两者解析相同的接口（HTML/JSON → IQuotaWindows），但用途不同：
- `response-parsers/` — **纯函数**，用于 cURL 模式（响应已由 fetch 获取）
- `quota-sources/` — **IQuotaSourceAdapter 类**，用于手动模式（自己构造请求 + 解析）

### H5 开发模式

在浏览器中预览（无 uTools 环境）时：
- `utils/fetch.ts` monkey-patch 全局 fetch，通过 Vite `/api/proxy` 转发请求
- `vite.config.ts` 的 `corsProxyPlugin` 中间件处理实际 HTTP 请求
- `db/index.ts` 自动回退到内存 Map（`window.__memDb` 可调试）

> **注意**：浏览器 Fetch API 禁止程序化设置 `Cookie` 头（forbidden header），
> 因此 cURL 模式如果使用 Cookie 认证，monkey-patch 会自动将 `Cookie` 头
> 重命名为 `x-forwarded-cookie` 绕过限制，Vite proxy 再将其还原。
> 见 `utils/fetch.ts` 和 `vite.config.ts` 中的处理逻辑。

### 数据层

- **持久化**：utools.db（类似 PouchDB 的 NoSQL），按 `type/` 前缀组织
- **加密**：AES-GCM，密钥存储在 `setting/encryption-key`
- **H5 回退**：内存 Map，无加密（仅开发用）
- **额度缓存**：Pinia 内存（5min TTL），非持久化

### 快捷键 / 子命令

uTools 唤醒后支持：`aw`（概览）、`aw quota`（额度看板）、`aw keys`（API Key 管理）、`aw settings`（设置）

## 测试

```bash
# 运行所有测试
pnpm test

# 运行单个测试文件
pnpm test -- tests/unit/services/curl-parser.spec.ts

# 运行匹配模式的测试
pnpm test -- -t "parseCurl" tests/unit/services/curl-parser.spec.ts
```

测试框架：Vitest + jsdom，当前 192 个测试用例，测试文件在 `tests/unit/`，按被测模块目录结构组织。

### 添加新额度源

1. 在 `types/quota.ts` 的 `QuotaSourceType` 枚举中添加新类型
2. 在 `services/response-parsers/` 中创建纯函数解析器，在 `index.ts` 注册
3. 在 `services/quota-sources/` 中创建适配器类，在 `registry.ts` 注册（自动注册列表）
4. 在 `components/AddQuotaSourceDialog.vue` 的 `sourceTypeConfig` 中添加配置项
5. 添加对应测试文件到 `tests/unit/services/`
