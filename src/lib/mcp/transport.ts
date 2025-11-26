import "server-only";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

/**
 * Configuration options for creating a StreamableHTTPServerTransport
 */
export interface CreateTransportOptions {
  /**
   * Whether the client wants SSE streaming (text/event-stream)
   * If false, will use JSON response mode
   */
  wantsSSE?: boolean;
  /**
   * Optional session ID generator for stateful mode
   * If undefined, uses stateless mode (recommended for high concurrency)
   */
  sessionIdGenerator?: () => string;
}

/**
 * Creates a new StreamableHTTPServerTransport for handling MCP requests
 * 
 * @param options - Configuration options
 * @returns A configured StreamableHTTPServerTransport instance
 */
export function createStreamableHTTPTransport(
  options: CreateTransportOptions = {},
): StreamableHTTPServerTransport {
  const { wantsSSE = false, sessionIdGenerator } = options;

  return new StreamableHTTPServerTransport({
    sessionIdGenerator, // Stateless mode if undefined
    enableJsonResponse: !wantsSSE, // Use JSON response if client doesn't want SSE
  });
}

