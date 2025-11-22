"use server";

import type { MCPMetadata } from "@/ai/tools/mcp/client";
import { getAllMcpMetadataForTeam, reloadTeamMcpClients } from "@/ai/tools/mcp/client";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { deleteTeamConfig, setTeamConfig } from "@/app/team/teamConfig/lib";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Fetch all team configs for a specific team
 */
export async function fetchTeamConfigs(teamId: number): Promise<
  ServerActionResult<
    Array<{
      key: string;
      value: unknown;
      createdAt: Date;
      updatedAt: Date;
    }>
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  try {
    const configs = await prisma.teamConfig.findMany({
      where: { teamId },
      orderBy: { key: "asc" },
      select: {
        key: true,
        value: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: configs,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to fetch team configs: ${(error as Error).message}`,
    };
  }
}

/**
 * Fetch all teams with their configs
 */
export async function fetchTeamsWithConfigs(): Promise<
  ServerActionResult<
    Array<{
      id: number;
      name: string;
      configs: Array<{
        key: string;
        value: unknown;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }>
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        teamConfigs: {
          select: {
            key: true,
            value: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { key: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });

    return {
      success: true,
      data: teams.map((team) => ({
        id: team.id,
        name: team.name,
        configs: team.teamConfigs,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to fetch teams: ${(error as Error).message}`,
    };
  }
}

/**
 * Set or update a team configuration
 */
export async function upsertTeamConfig(
  teamId: number,
  key: TeamConfigName,
  value: unknown,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  // Validate key is from enum
  if (!Object.values(TeamConfigName).includes(key)) {
    return {
      success: false,
      message: `Invalid config key. Allowed keys: ${Object.values(TeamConfigName).join(", ")}`,
    };
  }

  // Validate value is valid JSON
  try {
    JSON.parse(JSON.stringify(value));
  } catch (error) {
    return {
      success: false,
      message: `Invalid JSON value: ${(error as Error).message}`,
    };
  }

  try {
    // TODO: 需要校验类型，这里是唯一一个地方允许 any 的，因为是 admin 后台
    await setTeamConfig(teamId, key, value as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    revalidatePath("/admin/teams/configs");

    // Revalidate cache for this team config
    revalidateTag(`team-config-${teamId}`);
    revalidateTag(`team-config-${teamId}-${key}`);

    // Reload MCP clients if this is an MCP config change
    if (key === TeamConfigName.mcp) {
      try {
        await reloadTeamMcpClients(teamId);
      } catch (reloadError) {
        // Log error but don't fail the operation
        console.error(
          `Failed to reload MCP clients for team ${teamId}:`,
          (reloadError as Error).message,
        );
      }
    }

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to set team config: ${(error as Error).message}`,
    };
  }
}

/**
 * Delete a team configuration
 */
export async function removeTeamConfig(
  teamId: number,
  key: TeamConfigName,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  // Validate key is from enum
  if (!Object.values(TeamConfigName).includes(key)) {
    return {
      success: false,
      message: `Invalid config key. Allowed keys: ${Object.values(TeamConfigName).join(", ")}`,
    };
  }

  try {
    await deleteTeamConfig(teamId, key);
    revalidatePath("/admin/teams/configs");

    // Revalidate cache for this team config
    revalidateTag(`team-config-${teamId}`);
    revalidateTag(`team-config-${teamId}-${key}`);

    // Reload MCP clients if this is an MCP config deletion
    if (key === TeamConfigName.mcp) {
      try {
        await reloadTeamMcpClients(teamId);
      } catch (reloadError) {
        // Log error but don't fail the operation
        console.error(
          `Failed to reload MCP clients for team ${teamId}:`,
          (reloadError as Error).message,
        );
      }
    }

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete team config: ${(error as Error).message}`,
    };
  }
}

/**
 * Test loading MCP metadata for a team
 */
export async function testTeamMcpMetadata(
  teamId: number,
): Promise<ServerActionResult<MCPMetadata[]>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  try {
    const metadata = await getAllMcpMetadataForTeam(teamId);
    return {
      success: true,
      data: metadata,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to load MCP metadata: ${(error as Error).message}`,
    };
  }
}
