import "server-only";

import { executeDeepResearch } from "@/app/(deepResearch)/deepResearch";
import { ExpertName } from "@/app/(deepResearch)/experts/types";
import {
  DeepResearchInput,
  deepResearchInputSchema,
  deepResearchOutputSchema,
} from "@/app/(deepResearch)/types";
import { rootLogger } from "@/lib/logging";
import { getMCPRequestContext } from "@/lib/mcp/context";
import { createStreamingCallback } from "@/lib/mcp/streaming";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

const logger = rootLogger.child({ module: "deepresearch-mcp-server" });

/**
 * Creates and configures the deepresearch MCP server
 * This server instance is reusable and stateless - create new transport per request
 */
export function createDeepResearchMcpServer(): McpServer {
  const server = new McpServer({
    name: "deepresearch",
    version: "1.0.0",
  });

  const deepResearchToolName = "atypica_deep_research";

  const deepResearchToolConfig = {
    title: "Atypica DeepResearch Tool",
    description:
      "Performs deep research on a query using advanced AI with web search and X (Twitter) search capabilities. Returns comprehensive research results.",
    inputSchema: deepResearchInputSchema,
    outputSchema: deepResearchOutputSchema,
  };

  const deepResearchToolCallback = async (
    args: DeepResearchInput,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<CallToolResult> => {
    try {
      // Get userId from request context (still needed for UserChat creation)
      // The SDK provides transport, requestId, and progressToken through extra parameter
      const context = getMCPRequestContext();

      if (!context?.userId) {
        throw new Error("Missing userId in deep research request context");
      }

      const userId = context.userId;
      const progressToken = extra._meta?.progressToken;

      logger.debug(
        {
          requestId: extra.requestId,
          hasProgressToken: !!progressToken,
          userId,
        },
        "Executing deep research with streaming",
      );

      // Create streaming callback using SDK's sendNotification and progressToken
      // This uses the SDK's built-in progress notification mechanism
      const onStreamChunk = createStreamingCallback(
        extra.sendNotification,
        progressToken,
        deepResearchToolName,
      );

      // Execute with streaming callback that sends MCP progress notifications
      // UserChat creation and message persistence are handled inside executeDeepResearch
      const result = await executeDeepResearch({
        query: args.query,
        userId,
        expert: args.expert ?? ExpertName.Auto,
        abortSignal: extra.signal,
        onStreamChunk,
      });

      // Return final complete result
      return {
        content: [
          {
            type: "text",
            text: result.result,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage }, "Deep research tool execution failed");
      return {
        content: [
          {
            type: "text",
            text: `Error performing deep research: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  };

  // server.registerTool;
  // Register the Atypica DeepResearch Tool with streaming support
  server.registerTool(deepResearchToolName, deepResearchToolConfig, deepResearchToolCallback);

  return server;
}

// Export a singleton server instance (reusable across requests)
let serverInstance: McpServer | null = null;

export function getDeepResearchMcpServer(): McpServer {
  if (!serverInstance) {
    serverInstance = createDeepResearchMcpServer();
  }
  return serverInstance;
}
