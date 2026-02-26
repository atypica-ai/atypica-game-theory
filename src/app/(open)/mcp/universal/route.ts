import "server-only";

import { rootLogger } from "@/lib/logging";
import { runWithMcpRequestContext } from "@/lib/mcp";
import { authenticateMcpRequest, createMcpOptionsHandler, getMcpCorsHeaders } from "@/lib/mcp/auth";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
import { getUniversalMcpServer } from "./mcpServer";

const logger = rootLogger.child({ api: "universal-mcp" });
const CORS_HEADERS = getMcpCorsHeaders();

/**
 * Handle OPTIONS requests for CORS preflight
 */
export const OPTIONS = createMcpOptionsHandler();

/**
 * MCP Server API Route Handler with Streaming Support
 */
export async function POST(req: NextRequest) {
  logger.info({ msg: "Received MCP POST request", url: req.url });

  const authResult = await authenticateMcpRequest(req, "universal-mcp");
  if (!authResult.success) {
    logger.warn({ msg: "Authentication failed" });
    return authResult.errorResponse;
  }
  const { userId } = authResult;
  logger.info({ msg: "Authentication successful", userId });

  try {
    const acceptHeader = req.headers.get("accept") || "";
    let wantsSSE = acceptHeader.includes("text/event-stream");

    if (req.nextUrl.searchParams.get("sse") === "0") {
      wantsSSE = false;
    }

    logger.debug({ msg: "Transport mode determined", wantsSSE });

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: !wantsSSE,
    });

    req.signal.addEventListener("abort", () => {
      transport.close().catch((err) => {
        logger.error({ msg: "Error closing transport on abort", error: (err as Error).message });
      });
    });

    const server = getUniversalMcpServer();
    await server.connect(transport);
    logger.debug({ msg: "Server connected to transport" });

    const body = await req.json().catch(() => ({}));
    logger.debug({
      msg: "Request body parsed",
      hasBody: Object.keys(body).length > 0,
      method: body.method,
    });

    const response = await runWithMcpRequestContext({ userId }, async () => {
      return await transport.handleRequest(req, { parsedBody: body });
    });

    logger.info({
      msg: "Returning response",
      status: response.status,
      contentType: response.headers.get("content-type"),
    });

    const headers = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers,
    });
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
 * Handle GET requests for standalone SSE stream
 */
export async function GET(req: NextRequest) {
  const authResult = await authenticateMcpRequest(req, "universal-mcp");
  if (!authResult.success) {
    return authResult.errorResponse;
  }
  const { userId } = authResult;

  try {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: false,
    });

    req.signal.addEventListener("abort", () => {
      transport.close().catch((err) => {
        logger.error({ msg: "Error closing transport on abort", error: (err as Error).message });
      });
    });

    const server = getUniversalMcpServer();
    await server.connect(transport);

    const response = await runWithMcpRequestContext({ userId }, async () => {
      return await transport.handleRequest(req);
    });

    const headers = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers,
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
 */
export async function DELETE(req: NextRequest) {
  const authResult = await authenticateMcpRequest(req, "universal-mcp");
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
