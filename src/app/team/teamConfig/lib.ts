import "server-only";

import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { InputJsonValue } from "@prisma/client/runtime/client";
import { unstable_cache } from "next/cache";
import { TeamConfigName, TeamConfigValue } from "./types";

const logger = rootLogger.child({ module: "teamConfig" });

/**
 * Get team configuration value by key
 * Returns null if not found
 * Cached for 1 hour, cache key includes teamId and key automatically
 */
export async function getTeamConfig<K extends TeamConfigName>(
  teamId: number,
  key: K,
): Promise<TeamConfigValue[K] | null> {
  const getCached = unstable_cache(
    async (teamId: number, key: K) => {
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

        return config.value as TeamConfigValue[K];
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
export async function getTeamConfigWithDefault<K extends TeamConfigName>(
  teamId: number | null | undefined,
  key: K,
  defaultValue: TeamConfigValue[K],
): Promise<TeamConfigValue[K]> {
  if (!teamId) {
    return defaultValue;
  }

  const config = await getTeamConfig(teamId, key);
  return (config ?? defaultValue) as TeamConfigValue[K];
}

/**
 * Set or update team configuration
 */
export async function setTeamConfig<K extends TeamConfigName>(
  teamId: number,
  key: K,
  value: TeamConfigValue[K],
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
        value: value as unknown as InputJsonValue,
      },
      create: {
        teamId,
        key,
        value: value as unknown as InputJsonValue,
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
