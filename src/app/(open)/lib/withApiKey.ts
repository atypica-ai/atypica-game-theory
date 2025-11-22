import { TeamConfigName } from "@/app/team/teamConfig/types";
import { rootLogger } from "@/lib/logging";
import { Team } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";

export interface ApiKeyContext {
  team: Team;
}

/**
 * Find team by API key using raw SQL for better performance
 * Uses PostgreSQL jsonb operator to search within JSON field
 * Cached for 10 minutes with revalidation tag
 */
const findTeamByApiKey = unstable_cache(
  async (apiKey: string): Promise<Team | null> => {
    try {
      // Use raw SQL to efficiently search for API key in JSON field
      // The #>> operator extracts JSON field as text for comparison
      const result = await prisma.$queryRaw<Array<{ teamId: number }>>`
        SELECT "teamId"
        FROM "TeamConfig"
        WHERE "key" = ${TeamConfigName.apiKey}
        AND "value"#>>'{key}' = ${apiKey}
        LIMIT 1
      `;

      if (!result || result.length === 0) {
        return null;
      }

      // Fetch full team data
      const team = await prisma.team.findUnique({
        where: { id: result[0].teamId },
      });

      return team;
    } catch (error) {
      rootLogger.error({
        msg: "Failed to find team by API key",
        error: (error as Error).message,
      });
      return null;
    }
  },
  ["team-api-key-auth"],
  {
    tags: ["team-api-key-auth"],
    revalidate: 600, // 10 minutes cache
  },
);

/**
 * API Key authentication middleware
 * Validates the API key from Authorization header and returns team context
 */
export async function withApiKey<T>(handler: (context: ApiKeyContext) => Promise<T>): Promise<T> {
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

  // Find team with this API key using cached query
  const team = await findTeamByApiKey(token);

  if (!team) {
    rootLogger.warn({ msg: "API key not found", token: token.substring(0, 20) });
    throw new Error("Unauthorized: Invalid API key");
  }

  // Log API usage
  rootLogger.info({
    msg: "API key authenticated",
    teamId: team.id,
    teamName: team.name,
    path: headersList.get("x-pathname"),
  });

  // Execute handler with team context
  return handler({ team });
}
