import "server-only";

import { rootLogger } from "@/lib/logging";
import { ApiKeyExtra, TeamExtra } from "@/prisma/client";
import { ApiKeyWhereInput } from "@/prisma/models";
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

export async function deleteApiKey(id: number, params: { userId: number }): Promise<void>;
export async function deleteApiKey(id: number, params: { teamId: number }): Promise<void>;

/**
 * Delete API key by ID with ownership verification
 * @param id - API key ID
 * @param params - userId or teamId to verify ownership
 */
export async function deleteApiKey(
  id: number,
  params: { userId?: number; teamId?: number },
): Promise<void> {
  const { userId, teamId } = params;
  if ((!userId && !teamId) || (userId && teamId)) {
    throw new Error("Exactly one of userId or teamId must be provided");
  }

  let where: ApiKeyWhereInput;
  if (userId) {
    where = { id, userId };
  } else if (teamId) {
    where = { id, teamId };
  } else {
    throw new Error("Exactly one of userId or teamId must be provided");
  }

  try {
    // Delete with ownership verification
    const result = await prisma.apiKey.deleteMany({ where });

    if (result.count === 0) {
      throw new Error(`API key with id ${id} not found or access denied`);
    }

    logger.info({
      msg: "API key deleted",
      apiKeyId: id,
      userId,
      teamId,
    });
  } catch (error) {
    logger.error({
      msg: "Failed to delete API key",
      error: (error as Error).message,
      apiKeyId: id,
      userId,
      teamId,
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
          user: {
            include: {
              teamAsMember: true,
              personalUser: true,
            },
          },
          team: true,
        },
      });

      if (!result) {
        return null;
      }

      // Return user or team based on what's present
      if (result.user) {
        const { id, name, email, teamIdAsMember, teamAsMember, personalUserId, personalUser } =
          result.user;
        if (teamIdAsMember === null) {
          if (email === null || personalUserId !== null) {
            throw new Error(`Invalid personal user: email=${email} user=${personalUserId}`);
          }
          return { type: "user", user: { id, name, email, teamIdAsMember, personalUserId } };
        } else {
          if (
            email !== null ||
            teamAsMember === null ||
            personalUserId === null ||
            personalUser === null ||
            personalUser.email === null
          ) {
            throw new Error(
              `Invalid team member user: email=${email} user=${personalUserId} team=${teamAsMember}`,
            );
          }
          return {
            type: "user",
            user: {
              id,
              name,
              email,
              teamIdAsMember,
              teamAsMember,
              personalUserId,
              personalUser: {
                ...personalUser,
                email: personalUser.email,
              },
            },
          };
        }
      }

      if (result.team) {
        const { id, name, seats, extra } = result.team;
        return { type: "team", team: { id, name, seats, extra: extra as TeamExtra } };
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
