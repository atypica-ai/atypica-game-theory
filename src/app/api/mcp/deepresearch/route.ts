import "server-only";

import { getDeepResearchServer } from "@/app/(deepresearch)/server";
import { rootLogger } from "@/lib/logging";
import { NextRequest } from "next/server";
import { isJSONRPCRequest, RequestId } from "@modelcontextprotocol/sdk/types.js";
import {
  createIncomingMessage,
  createStreamableServerResponse,
} from "@/lib/mcp/adapters";
import { runWithMCPRequestContext } from "@/lib/mcp/context";
import { createStreamableHTTPTransport } from "@/lib/mcp/transport";

const logger = rootLogger.child({ module: "deepresearch-mcp-api" });

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
 * 3. Tool execution streams chunks via notifications/message
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
    // Determine if client wants streaming (SSE) or JSON response
    const acceptHeader = req.headers.get("accept") || "";
    const wantsSSE = acceptHeader.includes("text/event-stream");
    
    // Create a new transport for each request (stateless design)
    const transport = createStreamableHTTPTransport({
      wantsSSE,
      sessionIdGenerator: undefined, // Stateless mode
    });

    // Clean up transport when request closes
    req.signal.addEventListener("abort", () => {
      transport.close().catch((err) => {
        logger.error({ error: (err as Error).message }, "Error closing transport on abort");
      });
    });

    // Get the reusable server instance
    const server = getDeepResearchServer();

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

    // Set up request context with transport and request ID
    // This allows tool handlers to access the transport for streaming via AsyncLocalStorage
    const context = {
      transport,
      requestId,
    };

    // Create adapter objects for streaming
    const incomingMessage = await createIncomingMessage(req);
    const { res, getStreamingResponse, getHeaders, getStatusCode } = createStreamableServerResponse();

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
          "Connection": "keep-alive",
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
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: (error as Error).message,
        },
        id: null,
      },
      { status: 500 },
    );
  }
}

/**
 * Handle GET requests for standalone SSE stream (server-to-client notifications)
 * This allows the server to push notifications without a request-response cycle
 */
export async function GET(req: NextRequest) {
  try {
    const transport = createStreamableHTTPTransport({
      wantsSSE: true, // Always use SSE for GET
      sessionIdGenerator: undefined,
    });

    req.signal.addEventListener("abort", () => {
      transport.close().catch((err) => {
        logger.error({ error: (err as Error).message }, "Error closing transport on abort");
      });
    });

    const server = getDeepResearchServer();
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
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    logger.error({ error }, "Error setting up GET SSE stream");
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      },
      { status: 500 },
    );
  }
}

/**
 * Handle DELETE requests for session termination
 * In stateless mode, this is a no-op but we implement it for protocol compliance
 */
export async function DELETE(req: NextRequest) {
  return Response.json(
    {
      jsonrpc: "2.0",
      result: { message: "Session terminated (stateless mode)" },
      id: null,
    },
    { status: 200 },
  );
}

