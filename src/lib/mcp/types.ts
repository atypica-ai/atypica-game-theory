import "server-only";

import { TextStreamPart, ToolSet } from "ai";

/**
 * Request context for storing user-specific data per request.
 * The SDK provides transport, requestId, and progressToken through the extra parameter
 * in tool handlers, so we only need to store userId here.
 */
export interface McpRequestContext {
  userId: number;
}

/**
 * Callback type for streaming chunks to the MCP client.
 * We forward the exact chunk emitted by ai-sdk to stay future-proof.
 */
export type StreamChunkCallback = (chunk: TextStreamPart<ToolSet>) => Promise<void>;
