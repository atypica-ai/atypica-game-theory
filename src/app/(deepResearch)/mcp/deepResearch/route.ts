import "server-only";

import { rootLogger } from "@/lib/logging";
import {
  createMcpIncomingMessage,
  createMcpServerResponse,
  runWithMcpRequestContext,
} from "@/lib/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isJSONRPCRequest, RequestId } from "@modelcontextprotocol/sdk/types.js";
import { NextRequest } from "next/server";
import { getDeepResearchMcpServer } from "../mcpServer";

const logger = rootLogger.child({ api: "deep-research-mcp" });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, Mcp-Protocol-Version, x-user-id, x-internal-secret",
  "Access-Control-Max-Age": "86400",
};

type AuthResult = { success: true; userId: number } | { success: false; errorResponse: Response };

/**
 * Authenticate and extract userId from request
 *
 * Currently supports internal authentication via x-internal-secret + x-user-id headers.
 * Future: Will support user API key authentication via Authorization header.
 *
 * @returns AuthResult with userId if success, or ready-to-return error Response if failed
 */
async function authenticateAndGetUserId(req: NextRequest): Promise<AuthResult> {
  // Method 1: Internal authentication (current implementation)
  const internalSecret = req.headers.get("x-internal-secret");
  const userIdHeader = req.headers.get("x-user-id");

  if (internalSecret && userIdHeader) {
    // Validate internal secret
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      logger.warn({ msg: "Invalid x-internal-secret" });
      return {
        success: false,
        errorResponse: Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32001, message: "Unauthorized: invalid x-internal-secret" },
            id: null,
          },
          { status: 401, headers: CORS_HEADERS },
        ),
      };
    }

    // Parse and validate user ID
    const userId = Number(userIdHeader);
    if (!Number.isInteger(userId) || userId <= 0) {
      logger.warn({ msg: "Invalid x-user-id header", userIdHeader });
      return {
        success: false,
        errorResponse: Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32602, message: "Invalid x-user-id header" },
            id: null,
          },
          { status: 400, headers: CORS_HEADERS },
        ),
      };
    }

    return { success: true, userId };
  }

  // Method 2: User API key authentication (future implementation)
  // const authorization = req.headers.get("authorization");
  // if (authorization?.startsWith("Bearer ")) {
  //   const apiKey = authorization.slice(7);
  //   const result = await validateApiKeyAndGetUserId(apiKey);
  //   if (result.success) {
  //     return { success: true, userId: result.userId };
  //   }
  //   return {
  //     success: false,
  //     errorResponse: Response.json(
  //       { jsonrpc: "2.0", error: { code: -32001, message: "Invalid API key" }, id: null },
  //       { status: 401, headers: CORS_HEADERS }
  //     ),
  //   };
  // }

  // No valid authentication method found
  logger.warn({ msg: "Missing authentication headers" });
  return {
    success: false,
    errorResponse: Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "Unauthorized: missing authentication headers (x-internal-secret + x-user-id required)",
        },
        id: null,
      },
      { status: 401, headers: CORS_HEADERS },
    ),
  };
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * MCP Server API Route Handler with Streaming Support
 *
 * Architecture:
 * - Stateless design: Creates a new transport per request for high concurrency
 * - The MCP server instance is reused across requests
 * - Supports SSE streaming for real-time tool output (text deltas, sources, etc.)
 * - Uses StreamableHTTPServerTransport for MCP protocol compliance
 *
 * Streaming Flow:
 * 1. Client sends JSON-RPC request via POST
 * 2. Transport opens SSE stream (Content-Type: text/event-stream)
 * 3. Tool execution streams chunks via notifications/tools/stream
 * 4. Final result sent as JSON-RPC response
 * 5. SSE stream closes
 *
 * Supports:
 * - POST: JSON-RPC messages with SSE streaming response
 * - GET: Standalone SSE stream (for server-initiated notifications)
 * - DELETE: Session termination (no-op in stateless mode)
 */
export async function POST(req: NextRequest) {
  // Authenticate first
  const authResult = await authenticateAndGetUserId(req);
  if (!authResult.success) {
    return authResult.errorResponse;
  }
  const { userId } = authResult;

  try {
    // Determine if client wants streaming (SSE) or JSON response
    const acceptHeader = req.headers.get("accept") || "";
    let wantsSSE = acceptHeader.includes("text/event-stream");
    /**
     * @todo 这个做法不好，但是现在有些客户端无法读取，可能是当前版本的 MCP 没兼容旧的格式
     * 那些客户端也没法强制修改 accept header, 所以只能加一个 search 参数，在安装的时候指定禁用 sse
     */
    if (req.nextUrl.searchParams.get("sse") === "0") {
      wantsSSE = false;
    }

    // Create a new transport for each request (stateless design)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode - no session management
      enableJsonResponse: !wantsSSE, // Use JSON response if client doesn't want SSE
    });

    // Clean up transport when request closes
    req.signal.addEventListener("abort", () => {
      transport.close().catch((err) => {
        logger.error({ msg: "Error closing transport on abort", error: (err as Error).message });
      });
    });

    // Get the reusable server instance
    const server = getDeepResearchMcpServer();

    // Connect server to transport
    await server.connect(transport);

    // Parse request body to extract request ID
    const body = await req.json().catch(() => ({}));

    // Extract request ID from JSON-RPC request(s)
    // We need this to associate streaming notifications with the correct request
    let requestId: RequestId | undefined;
    if (Array.isArray(body)) {
      // Batch request - find the first tools/call request
      const toolCallRequest = body.find(
        (msg) => isJSONRPCRequest(msg) && msg.method === "tools/call",
      );
      requestId = toolCallRequest?.id;
      logger.debug({
        msg: "Processing batch request",
        batchSize: body.length,
        foundRequestId: !!requestId,
      });
    } else if (isJSONRPCRequest(body)) {
      // Single request - extract ID if it's a tools/call
      if (body.method === "tools/call") {
        requestId = body.id;
      }
      logger.debug({
        msg: "Processing single request",
        method: body.method,
        requestId,
        isToolCall: body.method === "tools/call",
      });
    }

    // Create adapter objects for streaming
    const incomingMessage = await createMcpIncomingMessage(req);
    const { res, getStreamingResponse, getHeaders, getStatusCode } = createMcpServerResponse();

    // Handle the MCP request within the request context
    // This ensures tool handlers can access the transport via AsyncLocalStorage
    const handlePromise = runWithMcpRequestContext({ userId }, async () => {
      await transport.handleRequest(incomingMessage, res, body);
    });

    // If SSE streaming is enabled, return the stream immediately
    if (wantsSSE) {
      // Return streaming response
      // The stream will be populated as the tool executes
      return new Response(getStreamingResponse(), {
        status: getStatusCode(),
        headers: {
          ...CORS_HEADERS,
          ...getHeaders(),
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } else {
      // Wait for complete response for JSON mode
      await handlePromise;

      // Collect all chunks for JSON response
      const chunks: Uint8Array[] = [];
      const reader = getStreamingResponse().getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      // Combine chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      return new Response(combined, {
        status: getStatusCode(),
        headers: {
          ...CORS_HEADERS,
          ...getHeaders(),
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error({
      msg: "Error handling MCP request",
      error: errorMessage,
      stack: (error as Error).stack,
    });
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32603, message: errorMessage }, id: null },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/**
 * Handle GET requests for standalone SSE stream (server-to-client notifications)
 * This allows the server to push notifications without a request-response cycle
 */
export async function GET(req: NextRequest) {
  // Authenticate first
  const authResult = await authenticateAndGetUserId(req);
  if (!authResult.success) {
    return authResult.errorResponse;
  }

  try {
    // GET doesn't need userId, just validates authentication
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: false, // Always use SSE for GET
    });

    req.signal.addEventListener("abort", () => {
      transport.close().catch((err) => {
        logger.error({ msg: "Error closing transport on abort", error: (err as Error).message });
      });
    });

    const server = getDeepResearchMcpServer();
    await server.connect(transport);

    const incomingMessage = await createMcpIncomingMessage(req);
    const { res, getStreamingResponse } = createMcpServerResponse();

    // Handle GET request for SSE stream
    transport.handleRequest(incomingMessage, res).catch((err) => {
      logger.error({ msg: "Error handling GET SSE stream", error: err });
    });

    return new Response(getStreamingResponse(), {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error({ msg: "Error setting up GET SSE stream", error: errorMessage });
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32603, message: errorMessage }, id: null },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/**
 * Handle DELETE requests for session termination
 * In stateless mode, this is a no-op but we implement it for protocol compliance
 */
export async function DELETE(req: NextRequest) {
  // Authenticate first
  const authResult = await authenticateAndGetUserId(req);
  if (!authResult.success) {
    return authResult.errorResponse;
  }
  try {
    return Response.json(
      { jsonrpc: "2.0", result: { message: "Session terminated (stateless mode)" }, id: null },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32602, message: (error as Error).message }, id: null },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}
