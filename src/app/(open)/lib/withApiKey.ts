import { findOwnerByApiKey } from "@/lib/apiKey/lib";
import type { ApiKeyOwner } from "@/lib/apiKey/types";
import { rootLogger } from "@/lib/logging";
import { headers } from "next/headers";

/**
 * Extract and validate API key from Authorization header
 */
async function extractApiKey(): Promise<string> {
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

  return token;
}

/**
 * Personal User API Key authentication middleware
 * Supports both personal users and team member users
 * Returns the user object directly
 */
export async function withPersonalApiKey<T>(
  handler: (user: Extract<ApiKeyOwner, { type: "user" }>["user"]) => Promise<T>,
): Promise<T> {
  const token = await extractApiKey();

  // Find owner with this API key using cached query
  const owner = await findOwnerByApiKey(token);

  if (!owner) {
    rootLogger.warn({ msg: "API key not found", token: token.substring(0, 20) });
    throw new Error("Unauthorized: Invalid API key");
  }

  // Only user API keys are allowed (personal users and team members)
  if (owner.type !== "user") {
    rootLogger.warn({ msg: "Team API key used for personal API endpoint", teamId: owner.team.id });
    throw new Error("Unauthorized: This endpoint requires a personal user API key");
  }

  // Log API usage
  const headersList = await headers();
  const userEmail =
    owner.user.email || (owner.user.personalUser ? owner.user.personalUser.email : null);

  rootLogger.info({
    msg: "Personal API key authenticated",
    userId: owner.user.id,
    userEmail,
    isTeamMember: !!owner.user.teamIdAsMember,
    path: headersList.get("x-pathname"),
  });

  // Execute handler with user context
  return handler(owner.user);
}

/**
 * Team API Key authentication middleware
 * Only accepts team API keys, rejects user API keys
 * Returns the team object directly
 */
export async function withTeamApiKey<T>(
  handler: (team: Extract<ApiKeyOwner, { type: "team" }>["team"]) => Promise<T>,
): Promise<T> {
  const token = await extractApiKey();

  // Find owner with this API key using cached query
  const owner = await findOwnerByApiKey(token);

  if (!owner) {
    rootLogger.warn({ msg: "API key not found", token: token.substring(0, 20) });
    throw new Error("Unauthorized: Invalid API key");
  }

  // Only team API keys are allowed
  if (owner.type !== "team") {
    rootLogger.warn({ msg: "Personal API key used for team endpoint", userId: owner.user.id });
    throw new Error("Unauthorized: This endpoint requires a team API key");
  }

  // Log API usage
  const headersList = await headers();
  rootLogger.info({
    msg: "Team API key authenticated",
    teamId: owner.team.id,
    teamName: owner.team.name,
    path: headersList.get("x-pathname"),
  });

  // Execute handler with team context
  return handler(owner.team);
}
