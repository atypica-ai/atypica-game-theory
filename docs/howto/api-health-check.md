# API 健康检查和监控

本文档介绍如何使用 check-status 脚本测试系统 API 健康状况，以及如何与 Uptime Kuma 集成实现自动化监控。

## 快速开始

### 基本使用

```bash
# 启动开发服务器
pnpm dev

# 在另一个终端运行健康检查
npx tsx scripts/admin/check-status.ts
```

### 测试指定站点

```bash
# 测试生产环境
npx tsx scripts/admin/check-status.ts --site https://atypica.ai

# 测试本地环境
npx tsx scripts/admin/check-status.ts --site http://localhost:3000
```

## 监控内容

check-status 脚本会测试以下 API 端点的健康状况：

### 基础服务

- **Ping** - 基本连接测试
- **Database** - 数据库连接测试

### 浏览器 API

- **HTML to PDF** - HTML 转 PDF 功能

### 通信服务

- **Email** - 邮件发送服务

### AI 服务

- **Embedding** - 文本向量化服务
- **Web Search** - 网页搜索服务

### LLM 模型

- **Claude** - Anthropic Claude API
- **GPT** - OpenAI GPT API
- **Gemini** - Google Gemini API

### 语音服务

- **Whisper** - 语音转文字服务

### 社交媒体搜索

- **XHS Search** - 小红书搜索
- **Douyin Search** - 抖音搜索
- **Instagram Search** - Instagram 搜索
- **TikTok Search** - TikTok 搜索
- **Twitter Search** - Twitter 搜索

## Uptime Kuma 集成

### 环境配置

在 `.env` 文件中添加 Uptime Kuma 配置：

```env
# Uptime Kuma Socket.io API
UPTIME_KUMA_API_URL=http://your-uptime-kuma.com
UPTIME_KUMA_USERNAME=your-username
UPTIME_KUMA_PASSWORD=your-password
```

### 创建监控项目

#### 智能模式（推荐）

智能模式会检查现有监控项目并进行更新，避免创建重复项目：

```bash
npx tsx scripts/admin/check-status.ts --create-monitors --site https://atypica.ai
```

**工作流程：**

1. 连接到 Uptime Kuma
2. 检查是否存在对应的监控分组
3. 检查是否存在相同名称的监控项
4. 如果存在，更新配置；如果不存在，创建新项目

#### 强制重建模式

强制删除现有监控项目并重新创建：

```bash
npx tsx scripts/admin/check-status.ts --create-monitors --override --site https://atypica.ai
```

**警告：** 此模式会删除所有相关监控项目的历史数据。

### 监控结构

脚本会创建分层的监控结构：

```
atypica.ai (主分组)
├── Website
│   ├── Ping
│   └── Database
├── Social Media Agents
│   ├── XHS Search
│   ├── Douyin Search
│   ├── Instagram Search
│   ├── TikTok Search
│   └── Twitter Search
├── Edge Functions
│   ├── HTML to PDF
│   └── Email API
├── AI Services
│   ├── Text Embedding
│   └── Web Search
├── LLM Models
│   ├── Claude API
│   ├── GPT API
│   └── Gemini API
└── Transcription
    └── Whisper API
```

### 监控配置

每个监控项目的默认配置：

- **类型**: HTTP(s)
- **心跳间隔**: 60 秒
- **重试次数**: 3 次
- **超时时间**: 30 秒
- **请求方法**: POST
- **期望状态码**: 200

## API 端点说明

所有健康检查端点都位于 `/api/health` 路径下：

| 端点                            | 功能           | 请求体               |
| ------------------------------- | -------------- | -------------------- |
| `/api/health?api=ping`          | 基本连接       | -                    |
| `/api/health?api=database`      | 数据库连接     | -                    |
| `/api/health?api=htmlToPdf`     | PDF 转换       | `{ url: string }`    |
| `/api/health?api=sendEmail`     | 邮件发送       | `{ to: string }`     |
| `/api/health?api=embedding`     | 文本向量化     | `{ text: string }`   |
| `/api/health?api=webSearch`     | 网页搜索       | `{ query: string }`  |
| `/api/health?api=claude`        | Claude API     | `{ prompt: string }` |
| `/api/health?api=gpt`           | GPT API        | `{ prompt: string }` |
| `/api/health?api=gemini`        | Gemini API     | `{ prompt: string }` |
| `/api/health?api=whisper`       | 语音转文字     | `{ audio: base64 }`  |
| `/api/health?api=xhsSearch`     | 小红书搜索     | `{ query: string }`  |
| `/api/health?api=dySearch`      | 抖音搜索       | `{ query: string }`  |
| `/api/health?api=insSearch`     | Instagram 搜索 | `{ query: string }`  |
| `/api/health?api=tiktokSearch`  | TikTok 搜索    | `{ query: string }`  |
| `/api/health?api=twitterSearch` | Twitter 搜索   | `{ query: string }`  |

## 输出示例

### 成功输出

```
Testing APIs for: https://atypica.ai

✓ ping - OK (123ms)
✓ database - OK (456ms)
✓ htmlToPdf - OK (789ms)
...

Summary:
  Total: 15
  Success: 15
  Failed: 0
```

### 失败输出

```
Testing APIs for: https://atypica.ai

✓ ping - OK (123ms)
✗ database - FAILED (Connection timeout)
✓ htmlToPdf - OK (789ms)
...

Summary:
  Total: 15
  Success: 14
  Failed: 1

Failed tests:
  - database: Connection timeout
```

## 故障排查

### 连接问题

**问题**: 无法连接到 API 端点

**解决方案**:

1. 确认服务器正在运行（`pnpm dev` 或生产环境）
2. 检查网络连接
3. 验证 URL 是否正确
4. 检查防火墙设置

### 认证问题

**问题**: API 返回 401 或 403 错误

**解决方案**:

1. 检查环境变量是否正确配置
2. 验证 API keys 是否有效
3. 检查 API 配额是否已用完

### Uptime Kuma 连接失败

**问题**: 无法连接到 Uptime Kuma

**解决方案**:

1. 验证 `UPTIME_KUMA_API_URL` 是否正确
2. 检查用户名和密码
3. 确认 Uptime Kuma 服务正在运行
4. 检查网络防火墙规则

### 监控项目重复

**问题**: 创建监控时出现重复项目

**解决方案**:

1. 使用智能模式（不加 `--override`）会自动检测并更新
2. 如果需要完全重建，使用 `--override` 标志
3. 手动在 Uptime Kuma 中删除重复项目

## 最佳实践

### 定期健康检查

建议设置定时任务定期运行健康检查：

```bash
# crontab 示例：每小时运行一次
0 * * * * cd /path/to/project && npx tsx scripts/admin/check-status.ts --site https://atypica.ai >> /var/log/health-check.log 2>&1
```

### 监控告警

在 Uptime Kuma 中配置告警通知：

1. 邮件通知
2. Slack 集成
3. Discord webhook
4. Telegram bot

### 多环境监控

为不同环境创建独立的监控分组：

```bash
# 生产环境
npx tsx scripts/admin/check-status.ts --create-monitors --site https://atypica.ai

# 测试环境
npx tsx scripts/admin/check-status.ts --create-monitors --site https://staging.atypica.ai
```

## 扩展开发

### 添加新的健康检查端点

1. 在 `src/app/api/health/route.ts` 中添加新的 API 处理
2. 在 `scripts/admin/check-status.ts` 中添加对应的测试配置
3. 更新本文档

### 自定义监控配置

编辑 `scripts/admin/check-status.ts` 中的监控配置：

```typescript
const monitorConfig = {
  interval: 60, // 心跳间隔（秒）
  retryInterval: 60, // 重试间隔（秒）
  maxretries: 3, // 最大重试次数
  timeout: 30, // 超时时间（秒）
};
```

## 相关文档

- [脚本工具文档](../../scripts/README.md)
- [系统监控最佳实践](https://github.com/louislam/uptime-kuma/wiki)
- [API 文档](../../src/app/api/health/)
