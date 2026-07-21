# Spec: cURL 直执行模式 — 粘贴即用，自动解析额度

## Objective

简化额度源的添加流程：用户粘贴一个能正常返回额度数据的 cURL 命令 → 系统自动执行并解析 → 如果额度数据有效则自动保存。后续每次刷新都重新执行该 cURL 获取最新数据。

**用户场景：**
1. 用户打开 OpenCode Go 页面，F12 → Network → Copy as cURL
2. 回到工具，粘贴 cURL，系统自动执行
3. 如果返回的 HTML 中解析出额度数据（滚动/每周/每月使用率），自动保存
4. 额度看板展示数据，后续刷新自动重新执行 cURL 获取最新数据

**与手动模式的区别：**
- **cURL 模式**：保存完整的 cURL 命令，每次刷新重新执行
- **手动模式**：保存凭证（API Key / Cookie），每次刷新由适配器构造请求执行

## Tech Stack

保持不变：
- Vue 3 + TypeScript strict + Vite 5 + Tailwind CSS + Pinia
- uTools plugin v6 (utools.db)
- Web Crypto API (AES-GCM)
- 已有的 `curl-parser.ts` 复用

## Commands

```bash
# 开发
npm run dev

# 构建
npm run build

# 测试
npm test
```

## Project Structure

```
src/
├── services/
│   ├── curl-parser.ts         # [已有] 解析 cURL → URL + headers
│   ├── curl-executor.ts       # [新增] 执行 cURL → 返回 response text
│   ├── response-parsers/      # [新增] 各额度源的响应解析器（纯函数）
│   │   ├── index.ts           #   注册表：sourceType → parser
│   │   ├── opencode.ts        #   解析 OpenCode Go HTML → IQuotaWindows
│   │   ├── bailian.ts         #   解析百炼 JSON → IQuotaWindows
│   │   └── ...
│   ├── quota-sources/         # [保留] 适配器，仅在手动模式使用
│   └── quota-checker.ts       # [改造] 判断使用 cURL 还是 adapter
├── components/
│   ├── AddQuotaSourceDialog.vue  # [改造] 简化 cURL 流程
│   └── ...
└── views/
    ├── QuotaSourceDetail.vue     # [改造] 简化 cURL 流程
    └── ...
```

## 核心流程

### 添加额度源（cURL 模式）

```
用户选择额度源类型
  → 默认 cURL 输入模式展开，手动模式入口可选
  → 用户粘贴 cURL → 点击"验证"（或自动触发）
  → 解析 cURL → fetch() 请求（10s timeout）
  → 按 sourceType 选择响应解析器解析
  → 如果 IQuotaWindows 完整（rolling/weekly/monthly 有数据）
    → 自动保存额度源（含 curlRaw、label）
    → 跳转到额度看板展示数据
  → 如果解析失败或额度数据不完整
    → 显示错误信息，不清除 cURL 输入
```

### 刷新额度数据（自动/手动）

```
对于 cURL 模式的额度源：
  → 读取 curlRaw
  → parseCurlToRequest() 解析出 URL + method + headers + body
  → fetch(url, { method, headers, body })
  → 按 sourceType 选择对应的响应解析器
  → parseResponse(html) → IQuotaWindows
  → 更新 Pinia store 和界面

对于手动模式的额度源：
  → 保持现有 flow（decrypt credential → adapter.checkQuota）
```

### 响应解析器

```typescript
// src/services/response-parsers/opencode.ts
export function parseOpenCodeHtml(html: string): IQuotaWindows | null {
  // 从 data-slot DOM 结构中提取三个窗口数据
  // 同现有 opencode.ts 中 extractQuota() 逻辑
}

// src/services/response-parsers/bailian.ts
export function parseBailianJson(json: string): IQuotaWindows | null {
  // 从 JSON 响应中提取三个窗口数据
}

// 注册表
// src/services/response-parsers/index.ts
export const responseParsers: Record<string, (body: string) => IQuotaWindows | null> = {
  [QuotaSourceType.OPENCODE_GO]: parseOpenCodeHtml,
  [QuotaSourceType.BAILIAN]: parseBailianJson,
  ...
}
```

## 改造清单

### 1. curl-parser.ts — 增强
增加 `CurlRequest` 类型和 `parseCurlToRequest()`，提取 method、body：

```typescript
export interface CurlRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}
```

### 2. src/services/curl-executor.ts — 新增
```typescript
export async function executeCurl(request: CurlRequest): Promise<string> {
  const res = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}
```

### 3. src/services/response-parsers/ — 新增目录
从现有 `quota-sources/` 各适配器中提取 parser 逻辑为纯函数。

### 4. quota-checker.ts — 改造
在 `checkSingleSource` 中先判断 `source.curlRaw`：
- 有 curlRaw → cURL 模式：executeCurl → responseParser
- 无 curlRaw → 手动模式：现有 adapter 流程

### 5. AddQuotaSourceDialog.vue — 简化 cURL 流程
- 移除：解析预览 → 确认填充 两步流程
- 改为：粘贴 cURL → [验证并保存] 按钮 → 执行 + 解析 + 自动保存
- 验证成功前保存按钮不可用
- 验证失败显示错误
- 手动模式入口保留（"改为手动输入"切换）

### 6. QuotaSourceDetail.vue — 同上
- cURL 模式编辑时：显示已有 curlRaw，可修改后重新验证
- 手动模式编辑时：保持现有字段

## 数据模型

`IQuotaSourceEntity` 已有字段 `curlRaw?: string`，无需新增。

添加额度源时：
- cURL 模式：`curlRaw` 有值，`encryptedCredential` 可为空
- 手动模式：`encryptedCredential` 有值，`curlRaw` 为空

## UI 文案

cURL 模式的 label 自动从响应中推断（例如响应中的 workspace name），或者让用户手动输入。

## 验证标准

1. ✅ 用户粘贴正确的 cURL → 自动执行 → 解析到数据 → 自动保存到看板
2. ✅ 额度看板展示 cURL 源的三个窗口数据（cc-hud 风格）
3. ✅ 手动刷新 → 重新执行 cURL → 更新数据
4. ✅ 自动刷新 → 同上的定时执行
5. ✅ cURL 过期（返回 401/403）→ 提示用户更新 cURL
6. ✅ 手动模式额度源不受任何影响
7. ✅ 184+ 全部测试通过，构建无错误

## 边界

- **Always:**
  - 执行 cURL 必须设 timeout（10s）
  - 解析响应必须验证包含有效额度数据才保存
  - cURL 失败时在 UI 显示明确错误
  - cURL 模式和手动模式在 UI 上清晰区分

- **Ask first:**
  - 新增 npm 依赖
  - 修改 utools 插件配置
  - 修改数据库 schema

- **Never:**
  - 在浏览器/utools 中执行 shell 命令
  - 不验证响应有效性就保存
  - 移除手动模式
