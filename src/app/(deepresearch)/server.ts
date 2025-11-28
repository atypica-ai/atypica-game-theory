import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeDeepResearch } from "@/app/(deepresearch)/deepResearch";
import {
  deepResearchInputSchema,
  deepResearchOutputSchema,
} from "./types";
import {
  getMCPRequestContext,
  runWithMCPRequestContext,
} from "@/lib/mcp/context";
import { createStreamingCallback } from "@/lib/mcp/streaming";
import { rootLogger } from "@/lib/logging";
import { ExpertName } from "./experts/types";

const logger = rootLogger.child({ module: "deepresearch-mcp-server" });

// Note: These are now available from @/lib/mcp/context
// Keeping exports for backward compatibility during migration
export { getMCPRequestContext as getRequestContext, runWithMCPRequestContext as runWithRequestContext };

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
        // Get the request context (transport and request ID) from AsyncLocalStorage
        const context = getMCPRequestContext();
        
        if (!context) {
          logger.warn("No request context available - streaming disabled");
          // Fallback: execute without streaming (but still requires userId)
          // This should not happen in normal operation, but we need userId for UserChat creation
          throw new Error("Missing request context - userId required for deep research");
        }

        const { transport, requestId, userId } = context;

        if (!userId) {
          throw new Error("Missing userId in deep research request context");
        }

        logger.debug(
          { requestId, hasTransport: !!transport, userId },
          "Executing deep research with streaming",
        );

        // Create streaming callback using shared utility
        const onStreamChunk = createStreamingCallback(
          transport,
          "atypica_deep_research",
          requestId,
        );

        // Execute with streaming callback that sends MCP notifications
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
