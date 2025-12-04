import "server-only";

import { rootLogger } from "@/lib/logging";
import { runWithMCPRequestContext } from "@/lib/mcp/context";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isJSONRPCRequest, RequestId } from "@modelcontextprotocol/sdk/types.js";
import { IncomingMessage, ServerResponse } from "http";
import { NextRequest } from "next/server";
import { Readable } from "stream";
import { getDeepResearchMcpServer } from "../mcpServer";

const logger = rootLogger.child({ module: "deepresearch-mcp-api" });

function parseUserId(req: NextRequest): number {
  const userIdParam = req.nextUrl.searchParams.get("userId");
  if (!userIdParam) {
    throw new Error("Missing userId in request URL");
  }
  const userId = Number(userIdParam);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid userId in request URL");
  }
  return userId;
}

/**
 * Converts Next.js Request to Node.js IncomingMessage-like object
 * This is needed because StreamableHTTPServerTransport expects Node.js HTTP objects
 */
async function createIncomingMessage(req: NextRequest): Promise<IncomingMessage> {
  const incomingMessage = new Readable({
    read() {},
  }) as unknown as IncomingMessage;

  // Copy headers
  const headers: Record<string, string | string[]> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  incomingMessage.headers = headers;
  incomingMessage.url = req.url;
  incomingMessage.method = req.method;

  return incomingMessage;
}

/**
 * Creates a ServerResponse-like object that can stream SSE or return JSON
 * This bridges Next.js Response with Node.js ServerResponse for StreamableHTTPServerTransport
 */
function createStreamableServerResponse(): {
  res: ServerResponse;
  getStreamingResponse: () => ReadableStream;
  getHeaders: () => Record<string, string>;
  getStatusCode: () => number;
} {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  let headersSent = false;

  // Create a ReadableStream that will be populated by ServerResponse writes
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      controller = null;
    },
  });

  const res = {
    statusCode,
    headersSent: false,

    setHeader(name: string, value: string) {
      if (!headersSent) {
        headers[name.toLowerCase()] = value;
      }
    },

    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },

    writeHead(code: number, headersArg?: Record<string, string>) {
      statusCode = code;
      if (headersArg) {
        Object.entries(headersArg).forEach(([key, value]) => {
          headers[key.toLowerCase()] = value;
        });
      }
      headersSent = true;
      return res;
    },

    flushHeaders() {
      headersSent = true;
      return res;
    },

    write(chunk: Uint8Array | string): boolean {
      if (!controller) return false;

      try {
        const data = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
        controller.enqueue(data);
        return true;
      } catch (error) {
        logger.error({ error }, "Error writing chunk to stream");
        return false;
      }
    },

    end(chunk?: Uint8Array | string) {
      if (chunk) {
        res.write(chunk);
      }
      if (controller) {
        controller.close();
        controller = null;
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    on(event: string, handler: () => void) {
      // Minimal event emitter implementation
      return res;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    once(event: string, handler: () => void) {
      return res;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    emit(event: string) {
      return false;
    },
  } as unknown as ServerResponse;

  return {
    res,
    getStreamingResponse: () => stream,
    getHeaders: () => headers,
    getStatusCode: () => statusCode,
  };
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
  try {
    const userId = parseUserId(req);
    console.log("userId");
    console.log(userId);
    // Determine if client wants streaming (SSE) or JSON response
    const acceptHeader = req.headers.get("accept") || "";
    const wantsSSE = acceptHeader.includes("text/event-stream");

    // Create a new transport for each request (stateless design)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode - no session management
      enableJsonResponse: !wantsSSE, // Use JSON response if client doesn't want SSE
    });

    // Clean up transport when request closes
    req.signal.addEventListener("abort", () => {
      transport.close().catch((err) => {
        logger.error({ error: (err as Error).message }, "Error closing transport on abort");
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
      logger.debug(
        { batchSize: body.length, foundRequestId: !!requestId },
        "Processing batch request",
      );
    } else if (isJSONRPCRequest(body)) {
      // Single request - extract ID if it's a tools/call
      if (body.method === "tools/call") {
        requestId = body.id;
      }
      logger.debug(
        { method: body.method, requestId, isToolCall: body.method === "tools/call" },
        "Processing single request",
      );
    }

    // Set up request context with transport, request ID, and userId
    // This allows tool handlers to access the transport for streaming via AsyncLocalStorage
    const context = {
      transport,
      requestId,
      userId,
    };

    // Create adapter objects for streaming
    const incomingMessage = await createIncomingMessage(req);
    const { res, getStreamingResponse, getHeaders, getStatusCode } =
      createStreamableServerResponse();

    // Handle the MCP request within the request context
    // This ensures tool handlers can access the transport via AsyncLocalStorage
    const handlePromise = runWithMCPRequestContext(context, async () => {
      await transport.handleRequest(incomingMessage, res, body);
    });

    // If SSE streaming is enabled, return the stream immediately
    if (wantsSSE) {
      // Return streaming response
      // The stream will be populated as the tool executes
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
        headers: getHeaders(),
      });
    }
  } catch (error) {
    logger.error(
      {
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
      "Error handling MCP request",
    );

    // Return JSON-RPC error response
    const statusCode = error instanceof Error && error.message.includes("userId") ? 400 : 500;
    const message =
      error instanceof Error && error.message.includes("userId")
        ? error.message
        : "Internal server error";
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: statusCode === 400 ? -32602 : -32603,
          message,
          data: (error as Error).message,
        },
        id: null,
      },
      { status: statusCode },
    );
  }
}

/**
 * Handle GET requests for standalone SSE stream (server-to-client notifications)
 * This allows the server to push notifications without a request-response cycle
 */
export async function GET(req: NextRequest) {
  try {
    // GET 的时候不需要 userId，只是请求 tool 的信息
    // const userId = parseUserId(req);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: false, // Always use SSE for GET
    });

    req.signal.addEventListener("abort", () => {
      transport.close().catch((err) => {
        logger.error({ error: (err as Error).message }, "Error closing transport on abort");
      });
    });

    const server = getDeepResearchMcpServer();
    await server.connect(transport);

    const incomingMessage = await createIncomingMessage(req);
    const { res, getStreamingResponse } = createStreamableServerResponse();

    // Handle GET request for SSE stream
    transport.handleRequest(incomingMessage, res).catch((err) => {
      logger.error({ error: err }, "Error handling GET SSE stream");
    });

    return new Response(getStreamingResponse(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error({ error }, "Error setting up GET SSE stream");
    const statusCode = error instanceof Error && error.message.includes("userId") ? 400 : 500;
    const message =
      error instanceof Error && error.message.includes("userId")
        ? error.message
        : "Internal server error";
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: statusCode === 400 ? -32602 : -32603,
          message,
        },
        id: null,
      },
      { status: statusCode },
    );
  }
}

/**
 * Handle DELETE requests for session termination
 * In stateless mode, this is a no-op but we implement it for protocol compliance
 */
export async function DELETE(req: NextRequest) {
  try {
    parseUserId(req);
    return Response.json(
      {
        jsonrpc: "2.0",
        result: { message: "Session terminated (stateless mode)" },
        id: null,
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32602,
          message: (error as Error).message,
        },
        id: null,
      },
      { status: 400 },
    );
  }
}
