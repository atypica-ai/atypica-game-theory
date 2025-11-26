import "server-only";

/**
 * Shared MCP (Model Context Protocol) infrastructure utilities
 * 
 * This module provides reusable components for building MCP servers:
 * - Request context management (AsyncLocalStorage)
 * - Next.js Request/Response adapters
 * - Streaming notification helpers
 * - Transport setup utilities
 * 
 * Usage:
 * ```typescript
 * import { 
 *   createStreamableHTTPTransport,
 *   runWithMCPRequestContext,
 *   createStreamingCallback 
 * } from "@/lib/mcp";
 * ```
 */

export * from "./types";
export * from "./context";
export * from "./adapters";
export * from "./streaming";
export * from "./transport";

