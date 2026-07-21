# Changelog

## [1.0.0] - 2026-07-21

### 新增
- **API Key 管理**: 支持 11+ AI 提供商的 API Key 增删改查
  - OpenAI、Anthropic、DeepSeek、OpenRouter、Ollama
  - Google Gemini、Azure OpenAI、Moonshot、Groq、通义千问、GLM
  - 自定义 Endpoint（兼容 OpenAI 格式）
  - AES-GCM 加密存储 + 脱敏显示
  - 一键连通性测试（含延迟和模型列表）
- **额度监控**: 参考 cc-hud 架构的三窗口配额看板
  - 滚动窗口 (5h) / 每周 (7d) / 每月 使用率展示
  - cc-hud 配色体系（绿/黄/橙/红）
  - 自动定时刷新（5/15/30/60 分钟可配置）
  - 重置倒计时显示
  - Chart.js 使用趋势折线图
- **预警系统**: 额度低于阈值时 Toast + 系统通知
- **中英双语**: 完整中英文界面切换
- **uTools 集成**: `aw` / `aw quota` / `aw keys` 关键词搜索
- **数据导入导出**: JSON 格式批量导入/导出配置

### 技术栈
- Vue 3 + TypeScript + Tailwind CSS + Pinia
- Vite 构建（产物 < 500KB）
- utools.db 持久化（仅用户数据）
- Web Crypto API AES-GCM 加密
- 91+ 单元测试覆盖
