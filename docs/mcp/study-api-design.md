# MCP Study API 设计文档

> **目标**: 让 Claude Code 等 MCP 客户端能够调用 atypica.ai 的研究能力

## 架构概述

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Code (CLI)                      │
│  用户: "帮我研究年轻人对咖啡的偏好"                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼ MCP Protocol (JSON-RPC over HTTPS)
┌─────────────────────────────────────────────────────────┐
│           atypica MCP Server (云端)                      │
│        /mcp/study (Streamable HTTP Transport)            │
│                                                          │
│  Authentication:                                         │
│  └─ Authorization: Bearer atypica_xxx (API Key)         │
│                                                          │
│  MCP Tools:                                              │
│  ├─ atypica_study_create        创建研究会话         ✅  │
│  ├─ atypica_study_send_message  发送消息+执行AI      ✅  │
│  ├─ atypica_study_get_status    查询研究状态         ✅  │
│  ├─ atypica_study_list          列出历史研究         ✅  │
│  ├─ atypica_study_get_messages  获取对话历史         ✅  │
│  ├─ atypica_study_get_report    获取研究报告         ✅  │
│  ├─ atypica_study_get_podcast   获取播客内容         ✅  │
│  ├─ atypica_persona_search      搜索 AI 人设(语义)   ✅  │
│  └─ atypica_persona_get         获取人设详情         ✅  │
└─────────────────────────────────────────────────────────┘
```

## 设计原则

### 1. **MCP Tools = 原子操作**

MCP 工具提供底层的、可组合的原子操作，而不是高级封装。

```typescript
// ❌ 不要这样设计（太高级，不灵活）
quickStudy({ query: "咖啡偏好" })  // 一键完成

// ✅ 应该这样设计（原子化，可组合）
study = createStudy({ kind: "insights" })
sendMessage(study.id, { text: "研究咖啡偏好" })
status = getStudyStatus(study.id)
report = getReport(study.reportToken)
```

### 2. **Skill = 工作流编排（可选）**

Skill 负责组合 MCP 工具，实现业务逻辑和最佳实践。

```markdown
# atypica-research.skill/SKILL.md

当用户需要研究时：
1. createStudy() - 创建会话
2. sendMessage() - 发送需求
3. getMessages() - 流式获取进度（实时反馈）
4. getReport() - 下载报告
```

### 3. **保留 atypica 核心价值**

- ✅ Plan Mode 的意图澄清
- ✅ Agent 的智能决策
- ✅ 完整的研究流程
- ✅ 同步执行 AI（确保结果可靠保存）

### 4. **同步 vs 异步设计**

**选择同步执行的原因**:
- ✅ 简化客户端逻辑（不需要轮询）
- ✅ 结果可靠（AI 完成才返回）
- ✅ 与 Web 前端体验一致
- ✅ 错误处理更清晰

**如何处理长时间执行**:
- MCP client 应**异步调用** `send_message`
- 设置合理超时（2-5 分钟）
- 如果超时，使用 `get_status` 检查进度

## MCP Tools 定义

### Phase 1: 核心功能 ✅

#### 1. atypica_study_create

**描述**: 创建新的研究会话

**输入**:
```json
{
  "kind": "insights",  // 可选: "testing" | "insights" | "creation" | "planning" | "misc" | "productRnD" | "fastInsight"
  "locale": "zh-CN"    // 可选: "zh-CN" | "en-US", 默认 "zh-CN"
}
```

**输出**:
```json
{
  "studyId": 123,
  "token": "abc123",
  "status": "created"
}
```

**特殊行为**:
- 如果不指定 `kind`，进入 **Plan Mode**，Agent 会根据对话自动判断研究类型

#### 2. atypica_study_send_message

**描述**: 向研究会话发送消息并同步执行 AI 推理

**重要**: 这是一个**同步操作**，会等待 AI 完成推理后返回（通常需要 10-60 秒）

**输入**:
```json
{
  "userChatToken": "abc123",
  "message": {
    "role": "user",
    "lastPart": {
      "type": "text",
      "text": "我想了解年轻人对咖啡的偏好"
    }
  }
}
```

**输出**:
```json
{
  "messageId": "msg_xxx",
  "role": "user",
  "status": "completed",  // "completed" | "saved_no_ai" | "ai_failed"
  "attachmentCount": 0
}
```

**状态说明**:
- `completed` - AI 执行成功，对话已更新
- `saved_no_ai` - 消息已保存，但配额不足，未执行 AI
- `ai_failed` - AI 执行失败，消息已保存，可稍后重试

**性能考虑**:
- Plan Mode（意图澄清）: 5-10 秒
- Fast Insight: 20-40 秒
- Product R&D / Study: 30-120 秒
- 建议 MCP client 异步调用，设置 2-5 分钟超时

#### 3. atypica_study_get_status

**描述**: 查询研究会话的状态和进度

**输入**:
```json
{
  "studyId": 123
}
```

**输出**:
```json
{
  "status": "executing",  // "plan_mode" | "executing" | "completed" | "error"
  "kind": "insights",     // null 表示还在 plan_mode
  "topic": "咖啡偏好研究",
  "currentStep": "正在访谈第3位用户...",
  "artifacts": {
    "reportToken": "report_xxx",  // 可选
    "podcastToken": "podcast_xxx" // 可选
  }
}
```

#### 4. atypica_study_list

**描述**: 列出用户的历史研究会话

**输入**:
```json
{
  "kind": "insights",  // 可选: 过滤研究类型
  "page": 1,
  "pageSize": 20
}
```

**输出**:
```json
{
  "data": [
    {
      "studyId": 123,
      "token": "abc123",
      "title": "咖啡偏好研究",
      "kind": "insights",
      "topic": "年轻人咖啡偏好",
      "hasReport": true,
      "hasPodcast": false,
      "createdAt": "2025-01-31T10:00:00Z",
      "updatedAt": "2025-01-31T11:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 45,
    "totalPages": 3
  }
}
```

### Phase 2: 流式和查询 ✅

#### 5. atypica_study_get_messages

**描述**: 获取研究会话的对话历史

**输入**:
```json
{
  "userChatToken": "abc123",
  "afterMessageId": "msg_xxx",  // 可选: 只获取此消息之后的内容
  "limit": 50
}
```

**输出**:
```json
{
  "messages": [
    {
      "messageId": "msg_1",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "研究咖啡偏好"
        }
      ]
    },
    {
      "messageId": "msg_2",
      "role": "assistant",
      "parts": [
        {
          "type": "text",
          "text": "好的，我来帮你..."
        }
      ]
    }
  ],
  "hasMore": false
}
```

### Phase 3: 产物访问 ✅

#### 6. atypica_study_get_report

**描述**: 获取研究报告内容和元数据

**输入**:
```json
{
  "token": "report_xxx"
}
```

**输出**:
```json
{
  "token": "report_xxx",
  "instruction": "生成报告的指令",
  "title": "年轻人咖啡偏好研究报告",
  "description": "基于访谈数据的深度分析",
  "content": "<html>...</html>",  // 报告 HTML
  "coverUrl": "https://cdn.atypica.ai/...",  // 封面图片（CDN signed URL）
  "generatedAt": "2025-01-31T12:00:00Z",
  "createdAt": "2025-01-31T12:00:00Z",
  "updatedAt": "2025-01-31T12:05:00Z"
}
```

#### 7. atypica_study_get_podcast

**描述**: 获取播客内容和元数据

**输入**:
```json
{
  "token": "podcast_xxx"
}
```

**输出**:
```json
{
  "token": "podcast_xxx",
  "instruction": "生成播客的指令",
  "script": "播客脚本内容...",
  "audioUrl": "https://cdn.atypica.ai/...",  // 音频文件（CDN signed URL）
  "coverUrl": "https://cdn.atypica.ai/...",  // 封面图片（CDN signed URL）
  "metadata": {
    "title": "咖啡偏好洞察播客",
    "duration": 180,  // 秒
    "size": 2048000,  // 字节
    "mimeType": "audio/mpeg",
    "showNotes": "本期播客探讨..."
  },
  "generatedAt": "2025-01-31T12:00:00Z",
  "createdAt": "2025-01-31T12:00:00Z",
  "updatedAt": "2025-01-31T12:05:00Z"
}
```

### Phase 4: 人设系统 ✅

#### 8. atypica_persona_search

**描述**: 使用**语义搜索**查找 AI 人设

**重要**: 使用 pgvector 向量相似度搜索，不是简单的文本匹配。能理解语义相似性，例如搜索"科技爱好者"能匹配到"程序员"、"极客"等相关人设。

**输入**:
```json
{
  "query": "年轻的咖啡爱好者",  // 可选: 语义搜索查询
  "tier": 2,                   // 可选: 0-3 筛选人设质量
  "limit": 10                  // 默认 10，最大 50
}
```

**输出**:
```json
{
  "data": [
    {
      "personaId": 456,
      "token": "persona_xxx",
      "name": "小王",
      "source": "95后咖啡爱好者",
      "tier": 2,
      "tags": ["咖啡", "年轻人", "精品咖啡"],
      "createdAt": "2025-01-31T10:00:00Z"
    }
  ]
}
```

**搜索逻辑**:
- 如果提供 `query`: 使用 embedding 向量距离搜索（语义相似度）
- 如果不提供 `query`: 按创建时间倒序返回用户的人设
- 只搜索用户自己导入的人设（`usePrivatePersonas: true`）

#### 9. atypica_persona_get

**描述**: 获取人设详细信息（包含完整 prompt）

**输入**:
```json
{
  "personaId": 456
}
```

**输出**:
```json
{
  "personaId": 456,
  "token": "persona_xxx",
  "name": "小王",
  "source": "95后咖啡爱好者",
  "prompt": "你是一位 25 岁的咖啡爱好者，居住在上海...",  // 完整人设描述
  "tier": 2,
  "tags": ["咖啡", "年轻人", "精品咖啡"],
  "locale": "zh-CN",
  "createdAt": "2025-01-31T10:00:00Z",
  "updatedAt": "2025-01-31T10:05:00Z"
}
```

**权限**: 仅限访问用户自己导入的人设

## 技术实现

### MCP Server 架构

```typescript
// src/app/(open)/mcp/study/mcpServer.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createStudyMcpServer(): McpServer {
  const server = new McpServer({
    name: "atypica-study-mcp",
    version: "1.0.0",
  });

  // Register tools
  server.registerTool(
    "atypica_study_create",
    {
      title: "Create Study Session",
      description: "Create a new study/research session",
      inputSchema: createStudyInputSchema,
    },
    handleCreateStudy,
  );

  // ... register other tools

  return server;
}
```

### HTTP Transport

```typescript
// src/app/(open)/mcp/study/route.ts
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export async function POST(req: NextRequest) {
  // 1. Authenticate via API Key
  const userId = await authenticateAndGetUserId(req);

  // 2. Create transport (stateless)
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: !wantsSSE,
  });

  // 3. Connect to MCP Server
  const server = getStudyMcpServer();
  await server.connect(transport);

  // 4. Handle request with user context
  await runWithMcpRequestContext({ userId }, async () => {
    await transport.handleRequest(incomingMessage, res, body);
  });

  // 5. Return SSE stream or JSON response
  return new Response(getStreamingResponse(), { ... });
}
```

### Authentication

支持两种认证方式：

1. **API Key 认证** (推荐)
   ```
   Authorization: Bearer atypica_xxx
   ```

2. **内部认证** (仅限内部服务)
   ```
   x-internal-secret: <INTERNAL_API_SECRET>
   x-user-id: 123
   ```

## 使用示例

### Claude Code 配置

```json
{
  "mcpServers": {
    "atypica": {
      "command": "node",
      "args": ["/path/to/atypica-mcp-client.js"],
      "env": {
        "ATYPICA_API_KEY": "atypica_xxx",
        "ATYPICA_API_URL": "https://atypica.ai/mcp/study"
      }
    }
  }
}
```

### 基本流程

```typescript
// 1. 创建研究（Plan Mode）
const { userChatToken } = await mcp.callTool("atypica_study_create", {
  content: "我想了解年轻人对咖啡的偏好"
});
// => { userChatToken: "abc123", messageId: "msg_1", status: "created" }

// 2. 发送消息并同步执行 AI（阻塞 10-60 秒）
const result = await mcp.callTool("atypica_study_send_message", {
  userChatToken: "abc123",
  message: {
    role: "user",
    lastPart: { type: "text", text: "开始研究" }
  }
});
// => { messageId: "msg_2", status: "completed" }
// AI 已完成执行，对话已更新

// 3. 查询状态
const status = await mcp.callTool("atypica_study_get_status", {
  userChatToken: "abc123"
});
// => { status: "completed", kind: "insights", artifacts: { reportToken: "..." } }

// 4. 获取完整对话
const messages = await mcp.callTool("atypica_study_get_messages", {
  userChatToken: "abc123"
});
// 包含所有用户消息和 AI 响应

// 5. 获取报告
const report = await mcp.callTool("atypica_study_get_report", {
  token: status.artifacts.reportToken
});
// => { content: "<html>...", coverUrl: "...", title: "...", ... }
```

### 关键特性

#### 同步执行 AI

`send_message` 是**同步操作**：
- ✅ 保存消息到数据库
- ✅ 触发 AI 推理（Plan Mode / Study / Fast Insight / Product R&D）
- ✅ 等待 AI 完成
- ✅ AI 响应自动保存
- ✅ 返回最终状态

**性能参考**:
- Plan Mode（意图澄清）: 5-10 秒
- Fast Insight: 20-40 秒
- Study / Product R&D: 30-120 秒

**建议**: MCP client 异步调用，设置 2-5 分钟超时

#### 语义搜索人设

`persona_search` 使用 embedding 向量相似度：
```typescript
// 语义搜索（不是文本匹配）
const personas = await mcp.callTool("atypica_persona_search", {
  query: "年轻的科技爱好者",  // 能匹配到"程序员"、"极客"等
  tier: 2,
  limit: 10
});
```

## 与现有系统的关系

```
┌─────────────────────────────────────────────┐
│          atypica.ai 现有系统                 │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │   Web UI (Next.js)                     │ │
│  │   /study/[token]                       │ │
│  └────────────────┬───────────────────────┘ │
│                   │                          │
│  ┌────────────────▼───────────────────────┐ │
│  │   Study Agent (baseAgentRequest)       │ │◀─┐
│  │   - Plan Mode Agent                    │ │  │
│  │   - Study Agent (5 types)              │ │  │
│  │   - Fast Insight Agent                 │ │  │
│  │   - Product R&D Agent                  │ │  │
│  └────────────────────────────────────────┘ │  │
│                                              │  │
└──────────────────────────────────────────────┘  │
                                                  │
┌──────────────────────────────────────────────┐  │
│          MCP Study API (新增)                │  │
│                                              │  │
│  ┌────────────────────────────────────────┐ │  │
│  │   MCP Server                           │ │  │
│  │   /mcp/study                           │ │  │
│  │                                        │ │  │
│  │   Tools:                               │ │  │
│  │   - atypica_study_create ──────────────┼─┼──┘
│  │   - atypica_study_send_message         │ │
│  │   - atypica_study_get_status           │ │
│  │   - ...                                │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Authentication: API Key                    │
└──────────────────────────────────────────────┘
```

**核心要点**:
- MCP API **复用**现有的 Study Agent 系统
- MCP Tools 是**原子操作**，组合使用
- 保留 atypica 的核心价值（Plan Mode、Agent 智能等）
- 通过 API Key 鉴权，隔离不同用户的数据

## 实现阶段

### Phase 1: 核心功能 ✅
- [x] `atypica_study_create`
- [x] `atypica_study_send_message`（同步执行 AI）
- [x] `atypica_study_get_status`
- [x] `atypica_study_list`

### Phase 2: 流式和查询 ✅
- [x] `atypica_study_get_messages`
- [x] 错误处理和重试机制

### Phase 3: 产物访问 ✅
- [x] `atypica_study_get_report`（含完整元数据）
- [x] `atypica_study_get_podcast`（含完整元数据）

### Phase 4: 人设系统 ✅
- [x] `atypica_persona_search`（语义搜索）
- [x] `atypica_persona_get`

### Phase 5: 高级功能 🚧
- [ ] 支持文件附件
- [ ] 支持引用历史研究
- [ ] 支持自定义 prompts
- [ ] MCP Notifications（实时进度推送）

### Phase 6: 测试和文档 🚧
- [ ] 集成测试
- [ ] MCP 客户端示例
- [ ] Skill 编写指南

## 安全和权限

### API Key 管理

- 用户在 atypica.ai 账户页面生成 API Key
- API Key 格式: `atypica_<random_string>`
- 支持创建、列出、删除 API Key

### 权限控制

- MCP API 只支持**个人用户** API Key
- 团队 API Key 暂不支持 MCP（返回 403 错误）
- 所有操作自动绑定到 API Key 对应的用户

### 数据隔离

- 每个研究会话属于创建它的用户
- 用户只能访问自己创建的研究和人设
- Token 是全局唯一的，但需要验证所有权

## 错误处理

### JSON-RPC 错误码

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,  // Unauthorized
    "message": "Invalid API key"
  },
  "id": null
}
```

**常见错误码**:
- `-32001`: 认证失败 (Unauthorized)
- `-32602`: 参数错误 (Invalid params)
- `-32603`: 内部错误 (Internal error)
- `-32000`: 业务错误 (如 study not found)

## 性能考虑

### 无状态设计

- 每个请求创建新的 Transport
- MCP Server 实例可复用
- 支持高并发

### 流式响应

- 支持 SSE (Server-Sent Events)
- 实时推送 Agent 进度
- 客户端可设置 `Accept: text/event-stream`

### 缓存策略

- Study 状态查询可缓存
- 报告和播客内容可缓存
- 使用 CDN 加速静态内容

## 监控和日志

### 日志记录

```typescript
logger.info({
  mcp: "atypica-study-mcp",
  tool: "create_study",
  userId: 123,
  studyId: 456,
  msg: "Study created via MCP"
});
```

### 指标追踪

- API 调用次数
- Token 消耗
- 研究完成率
- 错误率

## 未来扩展

### 更多工具类型

- `atypica_scout_create` - Scout 社交媒体观察
- `atypica_interview_create` - 专业访谈
- `atypica_discussion_create` - 群体讨论

### 更多集成

- GitHub Copilot
- VS Code Extension
- Cursor IDE

### 企业功能

- 团队协作
- 白标定制
- 私有部署
