# MCP Library

用于构建 MCP (Model Context Protocol) 服务器的工具库。

## 作用

这个库提供两个核心功能:

1. **请求上下文管理** - 使用 `AsyncLocalStorage` 在异步调用链中传递业务上下文 (如 userId)
2. **流式通知转换** - 将 AI SDK 的流式输出转换为 MCP ProgressNotification

## 使用方式

### 1. 在 Route Handler 中设置上下文

```typescript
import { runWithMCPRequestContext } from "@/lib/mcp";

export async function POST(req: NextRequest) {
  const userId = Number(req.nextUrl.searchParams.get("userId"));

  // 设置请求上下文
  await runWithMCPRequestContext({ userId }, async () => {
    await transport.handleRequest(incomingMessage, res, body);
  });
}
```

### 2. 在 MCP Tool 中获取上下文

```typescript
import { getMCPRequestContext, createStreamingCallback } from "@/lib/mcp";

server.registerTool("tool_name", config, async (args, extra) => {
  // 获取上下文
  const context = getMCPRequestContext();
  const userId = context?.userId;

  // 创建流式回调
  const onStreamChunk = createStreamingCallback(
    extra.sendNotification,
    extra._meta?.progressToken,
    "tool_name"
  );

  // 执行业务逻辑
  const result = await yourBusinessLogic({
    ...args,
    userId,
    onStreamChunk  // AI SDK 流式输出会自动转换为 MCP 通知
  });

  return { content: [{ type: "text", text: result }] };
});
```

### 3. 在业务代码中使用流式回调

```typescript
import { StreamChunkCallback } from "@/lib/mcp";

async function yourBusinessLogic({
  onStreamChunk,
}: {
  onStreamChunk?: StreamChunkCallback;
}) {
  const stream = streamText({ /* ... */ });

  for await (const chunk of stream.fullStream) {
    // 自动推送给 MCP 客户端
    await onStreamChunk?.(chunk);
  }
}
```

## 模块说明

- **context.ts** - AsyncLocalStorage 上下文管理
- **streaming.ts** - AI SDK chunk → MCP ProgressNotification 转换
- **types.ts** - TypeScript 类型定义

## 示例

完整示例请参考 `src/app/(deepResearch)/mcp/` 目录中的 DeepResearch MCP Server 实现。
