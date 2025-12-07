# DeepResearch MCP 服务器实现

## 概述

本功能实现了基于 Model Context Protocol (MCP) SDK 的流式 MCP 服务器,将 DeepResearch 工具通过 MCP 协议暴露,支持实时流式传输工具执行过程中的文本块(text-delta、reasoning-delta、tool-call 等)。

## 官方文档参考

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - MCP 官方 SDK
- [MCP Specification](https://modelcontextprotocol.io/specification/latest) - MCP 协议规范
- [Vercel AI SDK - streamText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text) - AI SDK 流式文本 API
- [xAI Grok Tool Usage](https://docs.x.ai/docs/guides/tool-use) - xAI 工具使用指南

## 核心文件

### 新增文件

#### 1. `src/app/(deepResearch)/mcp/deepResearch/route.ts`

**功能**: MCP API 路由处理器,处理 POST/GET/DELETE 请求

- **POST**: 处理 JSON-RPC 请求,支持 SSE 流式响应和 JSON 响应两种模式
- **GET**: 建立独立的 SSE 流,用于服务器主动推送通知
- **DELETE**: 会话终止(无状态模式下为 no-op)

**关键特性**:

- 无状态设计:每个请求创建新的 `StreamableHTTPServerTransport`,提高并发性能
- 自动检测客户端是否支持 SSE(通过 `Accept: text/event-stream` 头)
- 使用 `createMcpIncomingMessage` 和 `createMcpServerResponse` 适配 Next.js 和 Node.js HTTP 对象
- 通过 `runWithMcpRequestContext` 设置请求上下文(userId)

#### 2. `src/app/(deepResearch)/mcp/mcpServer.ts`

**功能**: MCP 服务器实例管理

- 创建和配置 DeepResearch MCP 服务器
- 注册 `atypica_deep_research` 工具
- 使用 `createMcpStreamingCallback` 创建流式回调
- 通过 `getMcpRequestContext()` 获取 userId

#### 3. `src/lib/mcp/streaming.ts`

**功能**: 创建流式回调函数,将 AI SDK 的文本流块转换为 MCP ProgressNotification

- 导出 `createMcpStreamingCallback` 函数
- 使用 SDK 提供的 `extra.sendNotification` 和 `extra._meta.progressToken`
- 仅当客户端请求进度通知时(progressToken 存在)才发送
- 将各种类型的 chunk 序列化为 JSON 字符串作为 progress message
- 错误处理:通知发送失败不影响主流程

#### 4. `src/lib/mcp/context.ts`

**功能**: 基于 AsyncLocalStorage 的请求上下文管理

- 仅存储 `userId`(应用特定数据)
- SDK 通过 `extra` 参数提供 transport、requestId、progressToken
- 导出 `getMcpRequestContext()` 和 `runWithMcpRequestContext()` 函数

#### 5. `src/lib/mcp/types.ts`

**功能**: TypeScript 类型定义

- `McpRequestContext`: 包含 `userId` 的请求上下文类型
- `StreamChunkCallback`: 流式块回调函数类型

#### 6. `src/lib/mcp/adapters.ts`

**功能**: Next.js 与 Node.js HTTP 对象的适配器

- `createMcpIncomingMessage`: 将 Next.js Request 转换为 Node.js IncomingMessage
- `createMcpServerResponse`: 创建可流式的 ServerResponse 对象,桥接到 ReadableStream

### 修改文件

#### 1. `src/app/(deepResearch)/deepResearch.ts`

**变更**: 添加流式回调支持

- 新增 `onStreamChunk` 参数(可选)
- 使用 `response.fullStream` 遍历所有事件类型
- 每个 chunk 通过回调发送给 MCP 客户端

## 架构设计

### 流式传输流程

1. 客户端发送 JSON-RPC `tools/call` 请求(包含 `_meta.progressToken` 表示需要进度通知)
2. 路由处理器创建 transport 并连接到 MCP 服务器
3. 工具执行时,`createMcpStreamingCallback` 将每个 chunk 转换为 `notifications/progress`
4. SDK 自动将进度通知发送到正确的 SSE 流(通过 progressToken 关联)
5. 工具执行完成后返回最终结果

### 无状态设计

- 每个请求创建新的 transport,无需会话管理
- MCP 服务器实例为单例,可复用
- 通过 AsyncLocalStorage 传递 userId,不依赖 transport 实例

### SDK 集成

充分利用 MCP SDK 的内置功能:

- `extra.sendNotification`: 发送通知的标准方式
- `extra._meta.progressToken`: 进度令牌,由 SDK 管理
- `StreamableHTTPServerTransport`: 处理 SSE 流和 JSON 响应
- 自动关联进度通知到对应的请求流

## 使用方式

### API 端点

```
POST /mcp/deepResearch?userId=<userId>
GET /mcp/deepResearch?userId=<userId>
DELETE /mcp/deepResearch?userId=<userId>
```

### 请求示例

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "atypica_deep_research",
    "arguments": {
      "query": "研究主题",
      "expert": "auto"
    },
    "_meta": {
      "progressToken": 1
    }
  }
}
```

### 响应模式

- **SSE 模式**: 客户端设置 `Accept: text/event-stream`,实时接收进度通知
- **JSON 模式**: 客户端不设置 SSE 头,等待完整响应后返回 JSON

## 技术要点

1. **ProgressNotification 使用**: 遵循 MCP 协议规范,使用 `notifications/progress` 而非自定义通知
2. **类型安全**: 充分利用 TypeScript 类型系统,确保类型正确
3. **错误处理**: 进度通知失败不影响主流程,仅记录警告日志
4. **并发控制**: 使用 backgroundToken 机制防止并发写入冲突
5. **命名规范**: 所有 MCP 相关函数使用 `Mcp` 前缀(首字母大写,后续小写)
