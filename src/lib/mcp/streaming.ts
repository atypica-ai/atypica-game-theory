import "server-only";

import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { RequestId } from "@modelcontextprotocol/sdk/types.js";
import { rootLogger } from "@/lib/logging";
import { StreamChunkCallback } from "./types";

const logger = rootLogger.child({ module: "mcp-streaming" });

/**
 * Creates a streaming callback that sends MCP notifications for tool execution
 * 
 * @param transport - The MCP transport to send notifications through
 * @param toolName - Name of the tool being executed
 * @param requestId - Optional request ID to associate notifications with the tool call
 * @returns A callback function that can be passed to streaming tool execution
 */
export function createStreamingCallback(
  transport: Transport,
  toolName: string,
  requestId?: RequestId,
): StreamChunkCallback {
  return async (chunk) => {
    try {
      // Send streaming chunk as MCP notification
      // Use relatedRequestId to associate with the tool call request
      await transport.send(
        {
          jsonrpc: "2.0",
          method: "notifications/message",
          params: {
            level: "info",
            data: {
              toolName,
              chunk,
            },
          },
        },
        {
          // Associate this notification with the tool call request
          // This ensures it's sent on the correct SSE stream
          relatedRequestId: requestId,
        },
      );
    } catch (notificationError) {
      logger.warn(
        { error: (notificationError as Error).message },
        "Failed to send streaming notification",
      );
      // Don't throw - continue streaming even if one notification fails
    }
  };
}

