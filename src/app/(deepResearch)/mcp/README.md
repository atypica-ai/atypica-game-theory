# 如何搭建一个 MCP HTTP 服务器

这个目录展示了如何在 Next.js 中将一个功能暴露为 MCP (Model Context Protocol) 服务器。

## 端点

DeepResearch MCP 服务器暴露在：

```
POST   /mcp/deepResearch?userId=<userId>
GET    /mcp/deepResearch?userId=<userId>
DELETE /mcp/deepResearch?userId=<userId>
```

## 快速起步

搭建一个 MCP 服务器只需要 2 个文件：

### 1. 定义 MCP Server (`mcpServer.ts`)

创建服务器实例并注册工具：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpStreamingCallback, getMcpRequestContext } from "@/lib/mcp";

function createMyMcpServer(): McpServer {
  const server = new McpServer({
    name: "my-server",
    version: "1.0.0",
  });

  server.registerTool(
    "my_tool",
    {
      description: "What this tool does",
      inputSchema: zodSchema,
    },
    async (args, extra) => {
      // 获取上下文
      const context = getMcpRequestContext();

      // 创建流式回调（可选）
      const onStreamChunk = createMcpStreamingCallback(
        extra.sendNotification,
        extra._meta?.progressToken,
        "my_tool"
      );

      // 执行业务逻辑
      const result = await myBusinessLogic({
        ...args,
        userId: context?.userId,
        onStreamChunk,
      });

      return {
        content: [{ type: "text", text: result }],
      };
    }
  );

  return server;
}

// 导出单例
let instance: McpServer | null = null;
export function getMyMcpServer() {
  if (!instance) instance = createMyMcpServer();
  return instance;
}
```

### 2. 创建 HTTP Route (`route.ts`)

使用 `@/lib/mcp` 工具快速搭建：

```typescript
import {
  runWithMcpRequestContext,
  createMcpIncomingMessage,
  createMcpServerResponse
} from "@/lib/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { NextRequest } from "next/server";
import { getMyMcpServer } from "../mcpServer";

export async function POST(req: NextRequest) {
  // 1. 解析参数
  const userId = Number(req.nextUrl.searchParams.get("userId"));
  const wantsSSE = req.headers.get("accept")?.includes("text/event-stream");

  // 2. 创建传输层（无状态）
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: !wantsSSE,
  });

  // 3. 连接服务器
  const server = getMyMcpServer();
  await server.connect(transport);

  // 4. 创建适配器
  const incomingMessage = await createMcpIncomingMessage(req);
  const { res, getStreamingResponse } = createMcpServerResponse();

  // 5. 在上下文中处理请求
  const body = await req.json();
  await runWithMcpRequestContext({ userId }, async () => {
    await transport.handleRequest(incomingMessage, res, body);
  });

  // 6. 返回响应
  return new Response(getStreamingResponse(), {
    headers: {
      "Content-Type": wantsSSE ? "text/event-stream" : "application/json",
    },
  });
}
```

## 关键概念

- **无状态设计**: 每个请求创建新的 transport，支持高并发
- **单例服务器**: McpServer 实例可复用
- **上下文传递**: 用 AsyncLocalStorage 传递 userId
- **流式通知**: 实时推送 AI 执行进度给客户端
- **HTTP 适配**: 桥接 Next.js 和 MCP SDK

## 本项目实现

- `mcpServer.ts` - 注册 `atypica_deep_research` 工具
- `deepResearch/route.ts` - 处理 POST/GET/DELETE 请求
- `../deepResearch.ts` - 业务逻辑，支持流式回调

完整的工具库文档见 `src/lib/mcp/README.md`。
