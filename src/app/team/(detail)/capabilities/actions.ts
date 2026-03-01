"use server";

import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Memory } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { verifyTeamOwnership } from "../actions";

export async function getTeamMemoryVersionsAction(): Promise<
  ServerActionResult<Memory[]>
> {
  return withAuth(async (user, userType, team) => {
    try {
      if (userType !== "TeamMember" || !team) {
        return {
          success: false,
          message: "User is not a member of any team",
          code: "forbidden",
        };
      }

      const ownershipCheck = await verifyTeamOwnership(team.id, user.id);
      if (!ownershipCheck.success) {
        return {
          success: false,
          message: ownershipCheck.message,
          code: "forbidden",
        };
      }

      const versions = await prisma.memory.findMany({
        where: { teamId: team.id },
        orderBy: { version: "desc" },
      });

      return {
        success: true,
        data: versions,
      };
    } catch (error) {
      rootLogger.error(`Failed to get team memory: ${(error as Error).message}`);
      return {
        success: false,
        message: "Failed to get team memory",
        code: "internal_server_error",
      };
    }
  });
}

export async function saveTeamMemoryAction(data: {
  content: string;
}): Promise<ServerActionResult<Memory>> {
  return withAuth(async (user, userType, team) => {
    try {
      if (userType !== "TeamMember" || !team) {
        return {
          success: false,
          message: "User is not a member of any team",
          code: "forbidden",
        };
      }

      const ownershipCheck = await verifyTeamOwnership(team.id, user.id);
      if (!ownershipCheck.success) {
        return {
          success: false,
          message: ownershipCheck.message,
          code: "forbidden",
        };
      }

      const latestMemory = await prisma.memory.findFirst({
        where: { teamId: team.id },
        orderBy: { version: "desc" },
      });

      const nextVersion = (latestMemory?.version ?? 0) + 1;

      const newMemory = await prisma.memory.create({
        data: {
          teamId: team.id,
          version: nextVersion,
          core: data.content,
          working: latestMemory ? latestMemory.working : [],
          changeNotes: "Edited from team capabilities",
        },
      });

      return {
        success: true,
        data: newMemory,
      };
    } catch (error) {
      rootLogger.error(`Failed to save team memory: ${(error as Error).message}`);
      return {
        success: false,
        message: "Failed to save team memory",
        code: "internal_server_error",
      };
    }
  });
}
