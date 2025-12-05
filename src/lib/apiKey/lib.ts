import "server-only";

import { rootLogger } from "@/lib/logging";
import { ApiKeyExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { randomBytes } from "crypto";
import { unstable_cache } from "next/cache";
import type { ApiKeyData, ApiKeyOwner } from "./types";

const logger = rootLogger.child({ module: "apiKey" });

export async function listApiKeys(params: { userId: number }): Promise<ApiKeyData[]>;
export async function listApiKeys(params: { teamId: number }): Promise<ApiKeyData[]>;

/**
 * List all API keys for user or team
 * @param userId - Personal user ID (mutually exclusive with teamId)
 * @param teamId - Team ID (mutually exclusive with userId)
 */
export async function listApiKeys(params: {
  userId?: number;
  teamId?: number;
}): Promise<ApiKeyData[]> {
  const { userId, teamId } = params;
  if ((!userId && !teamId) || (userId && teamId)) {
    throw new Error("Exactly one of userId or teamId must be provided");
  }

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: userId ? { userId } : { teamId },
      orderBy: { createdAt: "desc" },
    });

    return apiKeys.map((apiKey) => {
      const extra = (apiKey.extra as ApiKeyExtra) || {};
      return {
        id: apiKey.id,
        key: apiKey.key,
        createdAt: apiKey.createdAt,
        createdByEmail: extra.createdByEmail || "",
      };
    });
  } catch (error) {
    logger.error({
      msg: "Failed to list API keys",
      error: (error as Error).message,
      userId,
      teamId,
    });
    return [];
  }
}

export async function generateApiKey(params: {
  userId: number;
  createdByEmail: string;
}): Promise<ApiKeyData>;

export async function generateApiKey(params: {
  teamId: number;
  createdByEmail: string;
}): Promise<ApiKeyData>;

/**
 * Generate new API key for user or team
 * @param userId - Personal user ID (mutually exclusive with teamId)
 * @param teamId - Team ID (mutually exclusive with userId)
 * @param createdByEmail - Email of the creator
 */
export async function generateApiKey(params: {
  userId?: number;
  teamId?: number;
  createdByEmail: string;
}): Promise<ApiKeyData> {
  const { userId, teamId, createdByEmail } = params;
  if ((!userId && !teamId) || (userId && teamId)) {
    throw new Error("Exactly one of userId or teamId must be provided");
  }

  try {
    // Generate secure random API key
    const apiKey = `atypica_${randomBytes(32).toString("hex")}`;

    const extra: ApiKeyExtra = {
      createdByEmail,
    };

    const created = await prisma.apiKey.create({
      data: {
        key: apiKey,
        userId,
        teamId,
        extra,
      },
    });

    logger.info({
      msg: "API key generated",
      userId,
      teamId,
      createdByEmail,
      apiKeyId: created.id,
    });

    return {
      id: created.id,
      key: created.key,
      createdAt: created.createdAt,
      createdByEmail,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to generate API key",
      error: (error as Error).message,
      userId,
      teamId,
    });
    throw error;
  }
}

/**
 * Delete API key by ID
 * @param id - API key ID
 */
export async function deleteApiKey(id: number): Promise<void> {
  try {
    const apiKey = await prisma.apiKey.findUnique({ where: { id } });

    if (!apiKey) {
      throw new Error(`API key with id ${id} not found`);
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    logger.info({
      msg: "API key deleted",
      apiKeyId: id,
      userId: apiKey.userId,
      teamId: apiKey.teamId,
    });
  } catch (error) {
    logger.error({
      msg: "Failed to delete API key",
      error: (error as Error).message,
      apiKeyId: id,
    });
    throw error;
  }
}

/**
 * Find API key owner (user or team) by key
 * Uses cache for better performance
 * @param key - API key
 */
const findOwnerByApiKeyCached = unstable_cache(
  async (apiKey: string): Promise<ApiKeyOwner | null> => {
    try {
      const result = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: {
          user: true,
          team: true,
        },
      });

      if (!result) {
        return null;
      }

      // Return user or team based on what's present
      if (result.user) {
        const { id, name, email, teamIdAsMember, personalUserId } = result.user;
        if (!email || personalUserId !== null || teamIdAsMember !== null) {
          throw new Error("Invalid user");
        }
        return { type: "user", user: { id, name, email } };
      }

      if (result.team) {
        const { id, name } = result.team;
        return { type: "team", team: { id, name } };
      }

      return null;
    } catch (error) {
      logger.error({
        msg: "Failed to find owner by API key",
        error: (error as Error).message,
      });
      return null;
    }
  },
  ["api-key-auth"],
  {
    tags: ["api-key-auth"],
    revalidate: 600, // 10 minutes cache
  },
);

/**
 * Find API key owner by key (exported function)
 */
export async function findOwnerByApiKey(apiKey: string): Promise<ApiKeyOwner | null> {
  return findOwnerByApiKeyCached(apiKey);
}
