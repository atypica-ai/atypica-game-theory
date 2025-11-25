import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeDeepResearch } from "./tool";
import {
  DeepResearchInput,
  deepResearchInputSchema,
  deepResearchOutputSchema,
} from "./types";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

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
    async (args: DeepResearchInput, extra) => {
      try {
        // Get the transport from the server to send streaming notifications
        const transport = (server as any)._transport as Transport | undefined;
        
        // Execute with streaming callback that sends MCP notifications
        const result = await executeDeepResearch({
          query: args.query,
          abortSignal: extra.signal,
          onStreamChunk: transport
            ? async (chunk) => {
                // Send streaming chunk as MCP notification
                // Using custom notification method for streaming
                await transport.send({
                  jsonrpc: "2.0",
                  method: "notifications/tools/stream",
                  params: {
                    toolName: "atypica_deep_research",
                    chunkType: chunk.type,
                    ...(chunk.text && { text: chunk.text }),
                    ...(chunk.source && { source: chunk.source }),
                    ...(chunk.usage && { usage: chunk.usage }),
                  },
                });
              }
            : undefined,
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
