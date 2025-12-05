# 如何搭建一个 MCP HTTP 服务器

这个目录展示了如何在 Next.js 中将一个功能暴露为 MCP (Model Context Protocol) 服务器。

## 端点

DeepResearch MCP 服务器暴露在：

```
POST   /mcp/deepResearch
GET    /mcp/deepResearch
DELETE /mcp/deepResearch
```

### 认证方式

**当前支持的认证方式（内部使用）：**

通过 header 进行认证：
```bash
x-internal-secret: <your-internal-secret>
x-user-id: <user-id>
```

**即将支持的认证方式（用户 API Key）：**

```bash
Authorization: Bearer atypica_<your-api-key>
```

API Key 将关联到团队（Team），自动获取对应的用户上下文。

### 可选参数

- `?sse=0` - 禁用 SSE 流式传输，返回 JSON 格式响应（用于不支持 SSE 的客户端）

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
  // 1. 认证并获取 userId
  const authResult = await authenticateAndGetUserId(req);
  if (!authResult.success) {
    return authResult.errorResponse;
  }
  const { userId } = authResult;

  // 2. 检查客户端是否需要 SSE
  const acceptHeader = req.headers.get("accept") || "";
  let wantsSSE = acceptHeader.includes("text/event-stream");
  // 支持通过 ?sse=0 参数禁用 SSE
  if (req.nextUrl.searchParams.get("sse") === "0") {
    wantsSSE = false;
  }

  // 3. 创建传输层（无状态）
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: !wantsSSE,
  });

  // 4. 连接服务器
  const server = getMyMcpServer();
  await server.connect(transport);

  // 5. 创建适配器
  const body = await req.json().catch(() => ({}));
  const incomingMessage = await createMcpIncomingMessage(req);
  const { res, getStreamingResponse, getHeaders, getStatusCode } = createMcpServerResponse();

  // 6. 在上下文中处理请求
  const handlePromise = runWithMcpRequestContext({ userId }, async () => {
    await transport.handleRequest(incomingMessage, res, body);
  });

  // 7. 返回响应
  if (wantsSSE) {
    // SSE 流式响应
    return new Response(getStreamingResponse(), {
      status: getStatusCode(),
      headers: {
        ...getHeaders(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } else {
    // JSON 响应：等待完成后返回
    await handlePromise;
    const chunks: Uint8Array[] = [];
    const reader = getStreamingResponse().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return new Response(combined, {
      status: getStatusCode(),
      headers: getHeaders(),
    });
  }
}
```

## 关键概念

- **无状态设计**: 每个请求创建新的 transport，支持高并发
- **单例服务器**: McpServer 实例可复用
- **认证机制**: 通过 header 进行认证，支持内部和 API Key 两种方式
- **上下文传递**: 用 AsyncLocalStorage 传递 userId
- **流式通知**: 实时推送 AI 执行进度给客户端（SSE）
- **灵活响应**: 支持 SSE 和 JSON 两种响应格式
- **HTTP 适配**: 桥接 Next.js 和 MCP SDK
- **CORS 支持**: 跨域请求支持，方便客户端集成

## 认证实现细节

### 当前实现：内部认证

```typescript
async function authenticateAndGetUserId(req: NextRequest): Promise<AuthResult> {
  const internalSecret = req.headers.get("x-internal-secret");
  const userIdHeader = req.headers.get("x-user-id");

  if (internalSecret && userIdHeader) {
    // 验证内部密钥
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      return {
        success: false,
        errorResponse: Response.json(
          { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null },
          { status: 401 }
        ),
      };
    }

    const userId = Number(userIdHeader);
    if (!Number.isInteger(userId) || userId <= 0) {
      return {
        success: false,
        errorResponse: Response.json(
          { jsonrpc: "2.0", error: { code: -32602, message: "Invalid user ID" }, id: null },
          { status: 400 }
        ),
      };
    }

    return { success: true, userId };
  }

  // 未来：API Key 认证
  // const authorization = req.headers.get("authorization");
  // if (authorization?.startsWith("Bearer ")) {
  //   const apiKey = authorization.slice(7);
  //   // 验证 API key 并获取关联的 team/user
  // }

  return {
    success: false,
    errorResponse: Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null },
      { status: 401 }
    ),
  };
}
```

### 即将实现：API Key 认证

使用 `@/lib/apiKey` 工具进行 API Key 认证：

```typescript
import { withApiKey } from "@/app/(open)/lib/withApiKey";

// 在 route handler 中使用
const result = await withApiKey(async ({ team }) => {
  // 此处可以访问 team 对象
  const userId = team.ownerId; // 或其他逻辑获取 userId
  return { userId };
});
```

API Key 格式：`atypica_<random-string>`，关联到团队（Team），通过团队获取用户上下文。

## 本项目实现

- `mcpServer.ts` - 注册 `atypica_deep_research` 工具
- `deepResearch/route.ts` - 处理 POST/GET/DELETE 请求，包含认证逻辑
- `../deepResearch.ts` - 业务逻辑，支持流式回调

完整的工具库文档见 `src/lib/mcp/README.md`。
