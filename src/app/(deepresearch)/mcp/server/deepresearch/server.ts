import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeDeepResearch } from "./tool";
import {
  DeepResearchInput,
  deepResearchInputSchema,
  deepResearchOutputSchema,
} from "./types";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { RequestId } from "@modelcontextprotocol/sdk/types.js";
import { rootLogger } from "@/lib/logging";

const logger = rootLogger.child({ module: "deepresearch-mcp-server" });

/**
 * Request context for storing transport and request ID per request
 * This allows tool handlers to access the transport to send streaming notifications
 */
interface RequestContext {
  transport: Transport;
  requestId?: RequestId;
}

/**
 * AsyncLocalStorage to store request context per async execution
 * This ensures each request has its own transport reference
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Gets the current request context (transport and request ID)
 * Returns undefined if called outside of a request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Runs a function within a request context
 * This should be called from the route handler before handling the request
 */
export async function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return requestContextStorage.run(context, fn);
}

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
        // Get the request context (transport and request ID) from AsyncLocalStorage
        const context = getRequestContext();
        
        if (!context) {
          logger.warn("No request context available - streaming disabled");
          // Fallback: execute without streaming
          const result = await executeDeepResearch({
            query: args.query,
            abortSignal: extra.signal,
            onStreamChunk: undefined,
          });
          return {
            content: [
              {
                type: "text",
                text: result.result,
              },
            ],
            structuredContent: result,
          };
        }

        const { transport, requestId } = context;
        
        logger.debug(
          { requestId, hasTransport: !!transport },
          "Executing deep research with streaming",
        );

        // Execute with streaming callback that sends MCP notifications
        const result = await executeDeepResearch({
          query: args.query,
          abortSignal: extra.signal,
          onStreamChunk: async (chunk) => {
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
                      toolName: "atypica_deep_research",
                      chunkType: chunk.type,
                      ...(chunk.text && { text: chunk.text }),
                      ...(chunk.source && { source: chunk.source }),
                      ...(chunk.usage && { usage: chunk.usage }),
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
          },
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
