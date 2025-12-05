import { findOwnerByApiKey } from "@/lib/apiKey/lib";
import type { ApiKeyOwner } from "@/lib/apiKey/types";
import { rootLogger } from "@/lib/logging";
import { headers } from "next/headers";

/**
 * API Key authentication middleware
 * Validates the API key from Authorization header and returns owner context
 */
export async function withApiKey<T>(handler: (owner: ApiKeyOwner) => Promise<T>): Promise<T> {
  const headersList = await headers();
  const authorization = headersList.get("authorization");

  if (!authorization) {
    rootLogger.warn({ msg: "API Key missing", path: headersList.get("x-pathname") });
    throw new Error("Unauthorized: API Key is required");
  }

  // Extract Bearer token
  const [type, token] = authorization.split(" ");
  if (type !== "Bearer" || !token) {
    rootLogger.warn({ msg: "Invalid authorization header format", authorization });
    throw new Error("Unauthorized: Invalid authorization format");
  }

  // Validate API key format
  if (!token.startsWith("atypica_")) {
    rootLogger.warn({ msg: "Invalid API key format", token: token.substring(0, 20) });
    throw new Error("Unauthorized: Invalid API key");
  }

  // Find owner (user or team) with this API key using cached query
  const owner = await findOwnerByApiKey(token);

  if (!owner) {
    rootLogger.warn({ msg: "API key not found", token: token.substring(0, 20) });
    throw new Error("Unauthorized: Invalid API key");
  }

  // Log API usage
  if (owner.type === "user") {
    rootLogger.info({
      msg: "API key authenticated (user)",
      userId: owner.user.id,
      userEmail: owner.user.email,
      path: headersList.get("x-pathname"),
    });
  } else {
    rootLogger.info({
      msg: "API key authenticated (team)",
      teamId: owner.team.id,
      teamName: owner.team.name,
      path: headersList.get("x-pathname"),
    });
  }

  // Execute handler with owner context
  return handler(owner);
}
