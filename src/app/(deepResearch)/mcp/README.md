# DeepResearch MCP Server

这是一个将 DeepResearch 功能暴露为 MCP (Model Context Protocol) 服务器的实现。

## HTTP 端点

```
POST   /mcp/deepresearch?userId=<userId>
GET    /mcp/deepresearch?userId=<userId>
DELETE /mcp/deepresearch?userId=<userId>
```

## 如何暴露一个 MCP 服务器

### 核心步骤

暴露一个 MCP 服务器只需要 2 个文件:

#### 1. MCP Server 定义 (`mcpServer.ts`)

定义你的工具和处理逻辑:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function createMyMcpServer(): McpServer {
  const server = new McpServer({
    name: "your-server-name",
    version: "1.0.0",
  });

  // 注册工具
  server.registerTool(
    "tool_name",                    // 工具名称
    {
      title: "Tool Title",
      description: "What this tool does",
      inputSchema: zodSchema,       // 输入参数 schema
      outputSchema: zodSchema,      // 输出格式 schema (可选)
    },
    async (args, extra) => {        // 工具执行函数
      // 1. 获取请求上下文 (userId 等)
      const context = getMCPRequestContext();

      // 2. 创建流式回调 (如果需要实时推送进度)
      const onStreamChunk = createStreamingCallback(
        extra.sendNotification,
        extra._meta?.progressToken,
        "tool_name"
      );

      // 3. 执行你的业务逻辑
      const result = await yourBusinessLogic({
        ...args,
        userId: context.userId,
        onStreamChunk,  // 传入回调,实现流式输出
      });

      // 4. 返回结果
      return {
        content: [{ type: "text", text: result }],
        structuredContent: result,  // 结构化数据 (可选)
      };
    }
  );

  return server;
}

// 导出单例
let serverInstance: McpServer | null = null;
export function getMyMcpServer(): McpServer {
  if (!serverInstance) {
    serverInstance = createMyMcpServer();
  }
  return serverInstance;
}
```

#### 2. HTTP Route Handler (`route.ts`)

使用 `@/lib/mcp` 提供的工具快速搭建 HTTP 接口:

```typescript
import { runWithMCPRequestContext } from "@/lib/mcp/context";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { NextRequest } from "next/server";
import { getMyMcpServer } from "../mcpServer";

export async function POST(req: NextRequest) {
  // 1. 解析 userId
  const userId = Number(req.nextUrl.searchParams.get("userId"));

  // 2. 检测客户端是否要求 SSE 流式响应
  const wantsSSE = req.headers.get("accept")?.includes("text/event-stream");

  // 3. 创建传输层 (每个请求一个新的 transport,无状态)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,     // 无状态模式
    enableJsonResponse: !wantsSSE,     // JSON 或 SSE 模式
  });

  // 4. 连接到 MCP Server
  const server = getMyMcpServer();
  await server.connect(transport);

  // 5. 创建 Next.js 适配器 (桥接 Next.js 和 Node.js HTTP 对象)
  const incomingMessage = await createIncomingMessage(req);
  const { res, getStreamingResponse } = createStreamableServerResponse();

  // 6. 在请求上下文中处理请求
  const body = await req.json();
  await runWithMCPRequestContext({ userId }, async () => {
    await transport.handleRequest(incomingMessage, res, body);
  });

  // 7. 返回响应
  return new Response(getStreamingResponse(), {
    headers: {
      "Content-Type": wantsSSE ? "text/event-stream" : "application/json",
      "Cache-Control": "no-cache",
    },
  });
}
```

### 关键概念

1. **无状态设计**: 每个请求创建新的 `transport`,不需要会话管理,支持高并发
2. **MCP Server 单例**: Server 实例可以复用,只需要创建一次
3. **AsyncLocalStorage**: 使用 `runWithMCPRequestContext` 传递 userId,工具内部通过 `getMCPRequestContext()` 获取
4. **流式通知**: 使用 `createStreamingCallback` 将实时数据推送给客户端
5. **Next.js 适配**: 使用 `@/lib/mcp/adapters` 桥接 Next.js 和 Node.js HTTP 对象

### DeepResearch 实现

本项目的实现:
- **MCP Server**: `mcpServer.ts` - 注册 `atypica_deep_research` 工具
- **Route Handler**: `deepresearch/route.ts` - 处理 POST/GET/DELETE 请求
- **工具执行**: 调用 `executeDeepResearch()` 并通过回调实时推送进度

客户端可以使用任何 MCP 客户端连接到这个服务器,调用深度研究工具。
