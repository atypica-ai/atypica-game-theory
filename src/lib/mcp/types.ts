import "server-only";

import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { RequestId } from "@modelcontextprotocol/sdk/types.js";
import { TextStreamPart, ToolSet } from "ai";

/**
 * Request context for storing transport and request ID per request
 * This allows tool handlers to access the transport to send streaming notifications
 */
export interface MCPRequestContext {
  transport: Transport;
  requestId?: RequestId;
}

/**
 * Callback type for streaming chunks to the MCP client.
 * We forward the exact chunk emitted by ai-sdk to stay future-proof.
 */
export type StreamChunkCallback = (chunk: TextStreamPart<ToolSet>) => Promise<void>;

