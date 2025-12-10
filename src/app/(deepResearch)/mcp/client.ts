import "server-only";

import { rootLogger } from "@/lib/logging";
import { getRequestOrigin } from "@/lib/request/headers";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";

const logger = rootLogger.child({ module: "deepresearch-mcp-client" });

/**
 * Creates an MCP client for the internal DeepResearch MCP server
 * Uses internal authentication with x-internal-secret header
 */
export async function createDeepResearchMcpClient(userId: number) {
  const origin = await getRequestOrigin();
  const url = `${origin}/mcp/deepResearch`;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!internalSecret) {
    throw new Error("INTERNAL_API_SECRET environment variable is not set");
  }

  const client = await createMCPClient({
    transport: {
      type: "http",
      url,
      headers: {
        "x-internal-secret": internalSecret,
        "x-user-id": userId.toString(),
      },
    },
  });

  return client;
}
