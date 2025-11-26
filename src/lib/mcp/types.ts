import "server-only";

import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { RequestId } from "@modelcontextprotocol/sdk/types.js";

/**
 * Request context for storing transport and request ID per request
 * This allows tool handlers to access the transport to send streaming notifications
 */
export interface MCPRequestContext {
  transport: Transport;
  requestId?: RequestId;
}

/**
 * Callback type for streaming chunks to the MCP client
 */
export type StreamChunkCallback = (chunk: {
  type: "text-delta" | "reasoning-delta" | "source" | "finish";
  text?: string;
  source?: { id: string; url: string; title?: string };
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}) => Promise<void>;

