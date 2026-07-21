# uTools 应用市场上架指南

> AI Usage Watch — AI 模型 API Key 管理与额度监控插件

---

## 前置条件

1. 注册 uTools 开发者账号：https://developer.u-tools.cn
2. 确保 `plugin.json` 中所有字段填写完整
3. 准备应用图标（`logo.png`，建议 256×256）
4. 准备应用截图（至少 2 张，建议 1280×720）

## 构建插件包

```bash
# 1. 构建生产版本
pnpm build

# 2. 打包为 .upx 文件
pnpm pack-upx

# 输出: ai-usage-watch-1.0.0.upx
```

## 提交步骤

1. 登录 [uTools 开发者平台](https://developer.u-tools.cn)
2. 点击「创建插件应用」
3. 填写基本信息：
   - **名称**: AI Usage Watch
   - **描述**: AI 模型 API Key 管理与额度监控工具。支持 11+ AI 提供商，一键测连通性，实时额度看板。
   - **分类**: 开发工具
4. 上传 `ai-usage-watch-1.0.0.upx` 插件包
5. 上传 Logo 和截图
6. 提交审核

## plugin.json 字段说明

| 字段 | 值 | 说明 |
|------|-----|------|
| `name` | AI Usage Watch | 应用名称 |
| `version` | 1.0.0 | 版本号 |
| `main` | index.html | 入口文件 |
| `preload` | preload.js | 预加载脚本 |
| `logo` | logo.png | 应用图标 |
| `features[0].code` | aw | 功能编码 |
| `features[0].cmds` | ["aw", "aw quota", "aw keys", "aw settings"] | 搜索关键词 |

## 审核注意事项

- 插件不能包含恶意代码
- 所有 API Key 必须加密存储（已实现 AES-GCM）
- 不能将用户数据上传到第三方服务（已确保）
- 需要联网权限说明（插件需要访问各 AI 提供商的 API）

## 版本更新

更新时只需：
1. 修改 `package.json` 和 `plugin.json` 中的 `version`
2. 重新 `pnpm build && pnpm pack-upx`
3. 在开发者平台上传新版本
