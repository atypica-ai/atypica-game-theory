import "server-only";

import { findOwnerByApiKey } from "@/lib/apiKey/lib";
import { rootLogger } from "@/lib/logging";
import { NextRequest } from "next/server";

export type McpAuthResult =
  | { success: true; userId: number }
  | { success: false; errorResponse: Response };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, Mcp-Protocol-Version, x-user-id, x-internal-secret",
  "Access-Control-Max-Age": "86400",
};

/**
 * Authenticate MCP request and extract userId
 *
 * Supports two authentication methods:
 * 1. Internal authentication via x-internal-secret + x-user-id headers
 * 2. User API key authentication via Authorization: Bearer <api_key> header
 *
 * Note: We don't use withPersonalApiKey middleware here because:
 * - MCP needs to support two different authentication methods
 * - We need to return JSON-RPC formatted error responses
 * - Internal authentication bypasses API key validation entirely
 *
 * @param req - NextRequest object
 * @param mcpServerName - Name of MCP server for logging (e.g., "deep-research-mcp", "study-mcp")
 * @returns AuthResult with userId if success, or ready-to-return error Response if failed
 */
export async function authenticateMcpRequest(
  req: NextRequest,
  mcpServerName: string,
): Promise<McpAuthResult> {
  const logger = rootLogger.child({ api: mcpServerName });

  // Method 1: Internal authentication
  const internalSecret = req.headers.get("x-internal-secret");
  const userIdHeader = req.headers.get("x-user-id");

  if (internalSecret && userIdHeader) {
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      logger.warn({ msg: "Invalid x-internal-secret" });
      return {
        success: false,
        errorResponse: Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32001, message: "Unauthorized: invalid x-internal-secret" },
            id: null,
          },
          { status: 401, headers: CORS_HEADERS },
        ),
      };
    }

    const userId = Number(userIdHeader);
    if (!Number.isInteger(userId) || userId <= 0) {
      logger.warn({ msg: "Invalid x-user-id header", userIdHeader });
      return {
        success: false,
        errorResponse: Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32602, message: "Invalid x-user-id header" },
            id: null,
          },
          { status: 400, headers: CORS_HEADERS },
        ),
      };
    }

    return { success: true, userId };
  }

  // Method 2: User API key authentication
  const authorization = req.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const apiKey = authorization.slice(7);

    if (!apiKey.startsWith("atypica_")) {
      logger.warn({ msg: "Invalid API key format", apiKey: apiKey.substring(0, 20) });
      return {
        success: false,
        errorResponse: Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32001, message: "Unauthorized: Invalid API key format" },
            id: null,
          },
          { status: 401, headers: CORS_HEADERS },
        ),
      };
    }

    const owner = await findOwnerByApiKey(apiKey);

    if (!owner) {
      logger.warn({ msg: "API key not found", apiKey: apiKey.substring(0, 20) });
      return {
        success: false,
        errorResponse: Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32001, message: "Unauthorized: Invalid API key" },
            id: null,
          },
          { status: 401, headers: CORS_HEADERS },
        ),
      };
    }

    if (owner.type !== "user") {
      logger.warn({ msg: "Team API key used for MCP", teamId: owner.team.id });
      return {
        success: false,
        errorResponse: Response.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: "Unauthorized: MCP API only supports personal user API keys",
            },
            id: null,
          },
          { status: 403, headers: CORS_HEADERS },
        ),
      };
    }

    logger.info({
      msg: "MCP API authenticated via API key",
      userId: owner.user.id,
      userEmail: owner.user.email,
    });

    return { success: true, userId: owner.user.id };
  }

  // No valid authentication method found
  logger.warn({ msg: "Missing authentication headers" });
  return {
    success: false,
    errorResponse: Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "Unauthorized: missing authentication. Use either x-internal-secret + x-user-id headers or Authorization: Bearer <api_key>",
        },
        id: null,
      },
      { status: 401, headers: CORS_HEADERS },
    ),
  };
}

/**
 * CORS headers for MCP endpoints
 */
export function getMcpCorsHeaders() {
  return CORS_HEADERS;
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export function createMcpOptionsHandler() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async function OPTIONS(_req: NextRequest) {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  };
}
