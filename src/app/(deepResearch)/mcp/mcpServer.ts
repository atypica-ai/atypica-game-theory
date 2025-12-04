import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { executeDeepResearch } from "@/app/(deepResearch)/deepResearch";
import { ExpertName } from "@/app/(deepResearch)/experts/types";
import {
  DeepResearchInput,
  deepResearchInputSchema,
  deepResearchOutputSchema,
} from "@/app/(deepResearch)/types";
import { rootLogger } from "@/lib/logging";
import { createMcpStreamingCallback, getMcpRequestContext } from "@/lib/mcp";
import { detectInputLanguage } from "@/lib/textUtils";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { getLocale } from "next-intl/server";

/**
 * Creates and configures the deepresearch MCP server
 * This server instance is reusable and stateless - create new transport per request
 */
export function createDeepResearchMcpServer(): McpServer {
  const server = new McpServer({
    name: "atypica-deep-research-mcp",
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
      const context = getMcpRequestContext();

      if (!context?.userId) {
        throw new Error("Missing userId in deep research request context");
      }

      const userId = context.userId;
      const progressToken = extra._meta?.progressToken;

      const locale = await detectInputLanguage({
        text: args.query,
        fallbackLocale: await getLocale(),
      });
      const logger = rootLogger.child({
        mcp: "atypica-deep-research-mcp",
        tool: deepResearchToolName,
        query: args.query.substring(0, 20),
        userId,
      });
      const abortSignal = extra.signal;
      /**
       * 在 deepResearch 内部因为不同专家 token 计算方式不同，应该各自自己计算，不需要返回 usage 来统一计算
       * 但是，计算的 token 要根据不同的 context 记录到不同的对象上
       * 如果是外部直接调用，应该单独记录在用户上，如果是 study agent 调用，则记录在 study chat 上
       * 这也是 StatReporter 对象设计的初衷：使用 atypica token 统一计价，各自计算，调用者决定 token 消耗的归属
       */
      const statReport: StatReporter = async (dimension, value, extra) => {
        logger.info({
          msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
          extra,
        });
      };

      logger.debug(
        { requestId: extra.requestId, hasProgressToken: !!progressToken, userId },
        "Executing deep research with streaming",
      );

      // Create streaming callback using SDK's sendNotification and progressToken
      // This uses the SDK's built-in progress notification mechanism
      const onStreamChunk = createMcpStreamingCallback(
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
        locale,
        logger,
        statReport,
        abortSignal,
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
      rootLogger.error({ error: errorMessage }, "Deep research tool execution failed");
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
