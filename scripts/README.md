# 脚本工具文档

本目录包含项目的各类脚本工具，按功能分类组织。

## 目录结构

```
scripts/
├── admin/              # 运维管理工具
├── utils/              # 实用工具
├── dumps/              # 数据导入导出工具
├── archive/            # 历史归档
├── mock-server-only.ts # 服务端环境模拟（基础设施）
└── README.md           # 本文档
```

## 运维管理工具 (admin/)

### admintool.ts - 用户和订阅管理

用于管理用户、团队和订阅的命令行工具。

**使用方法：**

```bash
# 创建新用户（自动验证邮箱）
pnpm admintool create-user email@example.com password123

# 将用户设为超级管理员
pnpm admintool make-admin email@example.com

# 为用户创建团队
pnpm admintool create-team owner@example.com "Team Name"

# 列出用户的所有团队
pnpm admintool list-teams owner@example.com

# 为个人用户添加订阅（支持 pro 和 max 计划）
pnpm admintool add-subscription --email user@example.com --plan pro --start 2024-01-30 --months 3

# 为团队添加订阅
pnpm admintool add-team-subscription --teamId 123 --seats 5 --start 2024-01-30 --months 3
```

**功能特性：**
- 用户创建与邮箱验证
- 超级管理员权限管理
- 团队创建与管理
- 个人和团队订阅管理
- 完善的参数验证和错误处理

---

### check-status.ts - API 健康检查

测试系统 API 的健康状况，支持与 Uptime Kuma 集成。

**使用方法：**

```bash
# 测试本地开发环境
npx tsx scripts/admin/check-status.ts

# 测试指定站点
npx tsx scripts/admin/check-status.ts --site https://atypica.ai
npx tsx scripts/admin/check-status.ts --site http://localhost:3000

# 创建或更新 Uptime Kuma 监控项目（智能模式）
npx tsx scripts/admin/check-status.ts --create-monitors --site https://atypica.ai

# 强制重新创建所有监控项目
npx tsx scripts/admin/check-status.ts --create-monitors --override --site https://atypica.ai
```

**监控内容：**
- Ping 服务
- 数据库连接
- 浏览器 API (HTML to PDF)
- 邮件服务
- AI 服务（Embedding、Web Search）
- LLM 模型（Claude、GPT、Gemini）
- 语音转写（Whisper）
- 社交媒体搜索（小红书、抖音、Instagram、TikTok、Twitter）

**环境变量配置：**
```env
# Uptime Kuma Socket.io API
UPTIME_KUMA_API_URL=http://your-uptime-kuma.com
UPTIME_KUMA_USERNAME=your-username
UPTIME_KUMA_PASSWORD=your-password
```

详细说明：[docs/howto/api-health-check.md](../docs/howto/api-health-check.md)

---

### analytics-report.ts - Google Analytics 数据报表

生成 Google Analytics 数据报表，统计页面浏览量。

**使用方法：**

```bash
# 默认统计（最近30天，前100条）
pnpm analytics

# 自定义时间范围
pnpm analytics --days 7

# 限制结果数量
pnpm analytics -n 50

# 按地区过滤
pnpm analytics --region mainland  # 仅中国大陆
pnpm analytics --region global    # 仅海外
pnpm analytics --region all        # 全部地区（默认）

# 查询特定 token
pnpm analytics study <token>
pnpm analytics report <token>
pnpm analytics podcast <token>
```

**功能特性：**
- Study/Report/Podcast 分享页面浏览统计
- 支持单个 token 查询或批量查询
- 地域过滤（mainland/global/all）
- 自定义时间范围和结果数量
- 中文字符正确对齐显示

详细说明：[docs/howto/google-analytics-api.md](../docs/howto/google-analytics-api.md)

---

## 实用工具 (utils/)

### payment-stats.ts - 付款统计导出

导出用户付款和 token 消费数据，用于财务对账。

**使用方法：**

```bash
# 导出付款统计到 CSV
pnpm tsx scripts/utils/payment-stats.ts > payment-stats.csv
```

**输出内容：**
- 订单号和发票信息
- Stripe Charge ID
- 付款方式和金额
- Token 收到/使用/应付数量
- 用户邮箱和订阅计划
- 付款日期

**注意事项：**
- 脚本中的时间范围需要根据导出需求调整（默认 2025-11-01 之前）
- 包含手动修复的异常订单注释
- 需要处理退款订单标记

---

### public-assets.ts - S3 公共资源管理

上传文件到 S3 存储桶，并列出已上传的文件。

**使用方法：**

```bash
# 上传文件到指定区域
npx tsx scripts/utils/public-assets.ts --region mainland --upload path/to/file.png
npx tsx scripts/utils/public-assets.ts --region global --upload path/to/file.jpg

# 列出已上传的文件
npx tsx scripts/utils/public-assets.ts --region mainland --list
npx tsx scripts/utils/public-assets.ts --region global --list
```

**支持的区域：**
- `mainland` - 中国北京（cn-north-1）
- `global` - 美国东部（us-east-1）

**支持的文件格式：**
- 图片：jpg, jpeg, png, gif, webp, svg
- 视频：mp4, webm
- 音频：mp3, wav, ogg, m4a
- 文档：pdf

**功能特性：**
- 自动设置正确的 Content-Type
- 公共读取权限
- 文件存储在 `atypica/public/` 前缀下

---

### rescore-personas.ts - AI 人设评分批处理

批量重新计算 persona 的评分。

**使用方法：**

```bash
pnpm tsx scripts/utils/rescore-personas.ts
```

**功能特性：**
- 分批处理（batch size: 30）
- 并行处理提高效率
- 支持断点续传（可配置起始 ID）
- 实时进度显示

**适用场景：**
- 评分算法更新后的数据迁移
- 批量修复异常评分
- 定期重新评分维护

---

### utility-sqls.sql - 常用数据库查询

包含各类常用的数据库查询语句，用于数据分析和业务报表。

**主要查询类型：**
- 研究数据导出查询
- 用户转换付费周期统计
- 工具调用统计
- Token 消耗趋势分析
- 用户详细信息导出

**使用方法：**

在 PostgreSQL 客户端或 IDE 中直接执行所需的查询语句。

---

## 数据导入导出工具 (dumps/)

### export-interview-project.ts - 导出访谈项目

导出完整的访谈项目数据为 JSON 文件，包含项目信息、会话、对话和消息。

**使用方法：**

```bash
# 导出访谈项目
pnpm tsx scripts/dumps/export-interview-project.ts <project-token>
```

**示例：**

```bash
pnpm tsx scripts/dumps/export-interview-project.ts abc123def456
```

**导出内容：**
- InterviewProject 基本信息（token, brief, extra, 时间戳）
- InterviewSession 会话列表（userId/personaId 用 `[PLACEHOLDER]` 标记）
- UserChat 对话数据（每个会话的聊天记录）
- ChatMessage 所有消息（包含 role, content, parts, attachments）

**不导出内容：**
- InterviewReport（可重新生成）
- ChatStatistics（统计数据）
- TokensLog（token 日志）
- 数据库自增 ID（导入时重新生成）
- 实际的 userId/personaId 值（用占位符标记类型）

**输出位置：** `scripts/dumps/exports/interview-project-{token}-{timestamp}.json`

---

### import-interview-project.ts - 导入访谈项目

从 JSON 文件导入访谈项目到指定用户账户。

**使用方法：**

```bash
# 导入访谈项目
pnpm tsx scripts/dumps/import-interview-project.ts <user-id> <json-file-path>
```

**示例：**

```bash
pnpm tsx scripts/dumps/import-interview-project.ts 123 scripts/dumps/exports/interview-project-abc123-2025-12-06.json
```

**功能特性：**
- 自动生成新的项目 token（避免冲突）
- 保留原始 token 到 `extra.originalToken`
- project brief 加上 `[IMPORTED]` 前缀方便识别
- 生成新的 UserChat token 和 ChatMessage messageId
- InterviewProject 使用当前时间戳，其他保持原始时间戳
- 根据 `[PLACEHOLDER]` 标记还原字段类型：
  - 原来有 userId → 设为当前导入用户
  - 原来有 personaId → 设为占位角色（id=1）
- 自动创建占位角色（persona id=1）如不存在
- 使用 Prisma 事务确保原子性

**导入效果：**
- 创建完整的项目副本
- 所有数据归属于指定用户
- 保留原始数据结构和内容
- 附件引用保持不变（仅保存 JSON）

**注意事项：**
- 确保目标用户 ID 存在
- 会根据导出时的标记保持原始的字段类型
- 附件文件不会被复制，只保留引用

---

## 历史归档 (archive/)

### archive/legacy/

包含 31 个历史遗留脚本，主要用于：
- 数据迁移（migrate-*.js/ts）
- 数据修复（fix-*.js/ts）
- 数据生成和处理（generate-*.js/ts）

**状态：** 已完成历史使命，仅作参考保留。

### archive/stripe-migration/

包含 5 个 Stripe 订阅系统迁移的 SQL 脚本：
- 活跃订阅 ID 迁移
- Stripe 支付数据迁移
- 团队 token 迁移
- 日志和订阅数据迁移
- 用户订阅字段迁移

**状态：** 已执行完毕，作为数据结构变更文档保留。

---

## 基础设施

### mock-server-only.ts

模拟 Next.js 服务端环境，用于在 CLI 脚本中正确执行依赖服务端 API 的代码。

**使用方法：**

在脚本开头导入：
```typescript
import "./mock-server-only";
```

**功能：** 提供 server-only 模块的 mock 实现，避免脚本执行时的模块解析错误。

---

## 开发指南

### 创建新脚本

1. 确定脚本分类：
   - 运维管理 → `admin/`
   - 实用工具 → `utils/`
   - 数据导入导出 → `dumps/`

2. 创建脚本文件：
```typescript
import { loadEnvConfig } from "@next/env";
import "./mock-server-only";  // 如果需要访问服务端代码

async function main() {
  loadEnvConfig(process.cwd());
  // 确保在 loadEnvConfig 之后再导入依赖 env 的模块
  const { prisma } = await import("@/prisma/prisma");

  // 脚本逻辑
}

if (require.main === module) {
  main();
}
```

3. 如果是常用命令，在 `package.json` 中添加快捷方式：
```json
{
  "scripts": {
    "your-command": "tsx scripts/admin/your-script.ts"
  }
}
```

4. 在本文档中添加使用说明

### 最佳实践

- 始终使用 `loadEnvConfig` 加载环境变量
- 在动态导入中引用依赖 env 的模块
- 提供清晰的错误信息和使用说明
- 添加参数验证和错误处理
- 使用 TypeScript 确保类型安全
- 为危险操作添加确认提示

---

## 相关文档

- [本地开发指南](../README.md#本地开发)
- [数据库维护](../docs/howto/how-to-squash-migrations.md)
- [月度 Token 重置](../docs/howto/monthly-tokens-reset.md)
- [批量播客生成](../docs/howto/batch-podcast-generation.md)
