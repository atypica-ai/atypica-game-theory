import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeDeepResearch } from "@/app/(deepresearch)/deepResearch";
import {
  deepResearchInputSchema,
  deepResearchOutputSchema,
} from "./types";
import { createStreamingCallback } from "@/lib/mcp/streaming";
import { rootLogger } from "@/lib/logging";
import { ExpertName } from "./experts/types";
import { getMCPRequestContext } from "@/lib/mcp/context";

const logger = rootLogger.child({ module: "deepresearch-mcp-server" });

/**
 * Creates and configures the deepresearch MCP server
 * This server instance is reusable and stateless - create new transport per request
 */
export function createDeepResearchServer(): McpServer {
  const server = new McpServer({
    name: "deepresearch",
    version: "1.0.0",
  });

  // Register the Atypica DeepResearch Tool with streaming support
  server.registerTool<typeof deepResearchInputSchema, typeof deepResearchOutputSchema>(
    "atypica_deep_research",
    {
      title: "Atypica DeepResearch Tool",
      description:
        "Performs deep research on a query using advanced AI with web search and X (Twitter) search capabilities. Returns comprehensive research results.",
      inputSchema: deepResearchInputSchema,
      outputSchema: deepResearchOutputSchema,
    },
    async (args, extra) => {
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
            userId 
          },
          "Executing deep research with streaming",
        );

        // Create streaming callback using SDK's sendNotification and progressToken
        // This uses the SDK's built-in progress notification mechanism
        const onStreamChunk = createStreamingCallback(
          extra.sendNotification,
          progressToken,
          "atypica_deep_research",
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
    },
  );

  return server;
}

// Export a singleton server instance (reusable across requests)
let serverInstance: McpServer | null = null;

export function getDeepResearchServer(): McpServer {
  if (!serverInstance) {
    serverInstance = createDeepResearchServer();
  }
  return serverInstance;
}
