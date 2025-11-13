import "server-only";

import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { unstable_cache } from "next/cache";
import { TeamConfigName } from "./types";

const logger = rootLogger.child({ module: "teamConfig" });

/**
 * Get team configuration value by key
 * Returns null if not found
 * Cached for 1 hour, cache key includes teamId and key automatically
 */
export async function getTeamConfig<T = unknown>(
  teamId: number,
  key: TeamConfigName,
): Promise<T | null> {
  const getCached = unstable_cache(
    async (teamId: number, key: TeamConfigName) => {
      try {
        const config = await prisma.teamConfig.findUnique({
          where: {
            teamId_key: {
              teamId,
              key,
            },
          },
        });

        if (!config) {
          return null;
        }

        return config.value as T;
      } catch (error) {
        logger.error({
          error: (error as Error).message,
          teamId,
          key,
          msg: "Failed to get team config",
        });
        return null;
      }
    },
    ["team-config"], // Base key, parameters will be added automatically
    {
      tags: [`team-config-${teamId}`, `team-config-${teamId}-${key}`],
      revalidate: 3600, // 1 hour cache
    },
  );

  return getCached(teamId, key);
}

/**
 * Get team configuration value with default fallback
 * Returns the default value if team config is not found
 */
export async function getTeamConfigWithDefault<T = unknown>(
  teamId: number | null | undefined,
  key: TeamConfigName,
  defaultValue: T,
): Promise<T> {
  if (!teamId) {
    return defaultValue;
  }

  const config = await getTeamConfig<T>(teamId, key);
  return config ?? defaultValue;
}

/**
 * Set or update team configuration
 */
export async function setTeamConfig<T = unknown>(
  teamId: number,
  key: TeamConfigName,
  value: T,
): Promise<void> {
  try {
    await prisma.teamConfig.upsert({
      where: {
        teamId_key: {
          teamId,
          key,
        },
      },
      update: {
        value: value as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      create: {
        teamId,
        key,
        value: value as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });

    logger.info({ msg: "Team config updated", teamId, key });
  } catch (error) {
    logger.error({
      error: (error as Error).message,
      teamId,
      key,
      msg: "Failed to set team config",
    });
    throw error;
  }
}

/**
 * Delete team configuration
 */
export async function deleteTeamConfig(teamId: number, key: TeamConfigName): Promise<void> {
  try {
    await prisma.teamConfig.delete({
      where: {
        teamId_key: {
          teamId,
          key,
        },
      },
    });

    logger.info({ msg: "Team config deleted", teamId, key });
  } catch (error) {
    logger.error({
      error: (error as Error).message,
      teamId,
      key,
      msg: "Failed to delete team config",
    });
    throw error;
  }
}
