import "server-only";

import { rootLogger } from "@/lib/logging";
import { ProgressNotification, ProgressToken } from "@modelcontextprotocol/sdk/types.js";
import { StreamChunkCallback } from "./types";

const logger = rootLogger.child({ module: "mcp-streaming" });

/**
 * Creates a streaming callback that sends MCP progress notifications for tool execution
 *
 * @param sendNotification - The MCP sendNotification function from RequestHandlerExtra
 * @param progressToken - The progress token from _meta.progressToken (if client requested progress)
 * @param toolName - Name of the tool being executed (for logging)
 * @returns A callback function that can be passed to streaming tool execution
 */
export function createStreamingCallback(
  sendNotification: (notification: ProgressNotification) => Promise<void>,
  progressToken: ProgressToken | undefined,
  toolName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
): StreamChunkCallback {
  return async (chunk) => {
    // Only send progress notifications if client requested them (progressToken exists)
    if (!progressToken) {
      return;
    }

    try {
      // Extract text content from chunk for progress message
      let progressMessage: string | undefined;

      if (chunk.type != "error") {
        progressMessage = JSON.stringify(chunk);
      } else {
        // chunk = {
        //   "type": "error",
        //   "error": {
        //       "name": "AI_TypeValidationError",
        //       "cause":[..],
        //       "value":{..}
        //   }
        // }
        progressMessage = JSON.stringify((chunk.error as Record<string, unknown>).value);
      }

      // Only send notification if we have a meaningful message
      if (progressMessage) {
        await sendNotification({
          method: "notifications/progress",
          params: {
            progressToken,
            progress: 0, // Progress is incremental, client tracks state
            message: progressMessage,
          },
        });
      }
    } catch (notificationError) {
      logger.debug(
        { error: (notificationError as Error).message },
        "Failed to send streaming progress notification",
      );
      // Don't throw - continue streaming even if one notification fails
    }
  };
}
