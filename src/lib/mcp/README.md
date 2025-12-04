# MCP Toolkit

在 Next.js 中构建 MCP (Model Context Protocol) HTTP 服务器的工具库。

## 核心功能

这个库解决了在 Next.js 环境中实现 MCP 服务器的三个关键问题：

1. **HTTP 适配** - MCP SDK 需要 Node.js HTTP 对象，但 Next.js 使用自己的 Request/Response
2. **上下文传递** - 如何在异步调用链中传递业务数据（如 userId）
3. **流式通知** - 如何将 AI SDK 的流式输出转换为 MCP ProgressNotification

## API 参考

### HTTP 适配器 (`adapters.ts`)

```typescript
import { createMcpIncomingMessage, createMcpServerResponse } from "@/lib/mcp";

// 将 Next.js Request 转换为 Node.js IncomingMessage
const incomingMessage = await createMcpIncomingMessage(req);

// 创建可流式的 ServerResponse，桥接到 ReadableStream
const { res, getStreamingResponse, getHeaders, getStatusCode } = createMcpServerResponse();
```

### 上下文管理 (`context.ts`)

```typescript
import { runWithMcpRequestContext, getMcpRequestContext } from "@/lib/mcp";

// 在 route handler 中设置上下文
await runWithMcpRequestContext({ userId: 123 }, async () => {
  await transport.handleRequest(incomingMessage, res, body);
});

// 在 MCP tool 内部获取上下文
const context = getMcpRequestContext();
const userId = context?.userId;
```

### 流式通知 (`streaming.ts`)

```typescript
import { createMcpStreamingCallback } from "@/lib/mcp";

// 在 MCP tool 中创建回调
const onStreamChunk = createMcpStreamingCallback(
  extra.sendNotification,      // MCP SDK 提供
  extra._meta?.progressToken,  // 客户端请求的进度令牌
  "tool_name"                  // 工具名称(用于日志)
);

// 传给业务逻辑，AI SDK 的 chunk 会自动转为 MCP 通知
await yourBusinessLogic({ onStreamChunk });
```

### 类型定义 (`types.ts`)

```typescript
import type { McpRequestContext, StreamChunkCallback } from "@/lib/mcp";

interface McpRequestContext {
  userId: number;
}

type StreamChunkCallback = (chunk: TextStreamPart<ToolSet>) => Promise<void>;
```

## 快速开始

参考 `src/app/(deepResearch)/mcp/README.md` 了解如何搭建一个完整的 MCP 服务器。

## 设计原则

- **命名规范**: 所有导出使用 `Mcp` 前缀（首字母大写，后续小写）
- **类型安全**: 充分利用 TypeScript 类型系统
- **最小依赖**: 仅依赖 MCP SDK 和 AI SDK 的类型
