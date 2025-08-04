"use server";

import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { Team, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export async function fetchTeams(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
): Promise<
  ServerActionResult<
    (Pick<Team, "id" | "name" | "createdAt"> & {
      ownerUser: Pick<User, "id" | "email">;
      tokens: { permanentBalance: number; monthlyBalance: number } | null;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);
  const skip = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (searchQuery) {
    where.name = { contains: searchQuery, mode: "insensitive" };
  }

  const [teams, totalCount] = await Promise.all([
    prisma.team.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        createdAt: true,
        ownerUser: {
          select: {
            id: true,
            email: true,
          },
        },
        tokens: {
          select: {
            permanentBalance: true,
            monthlyBalance: true,
          },
        },
      },
    }),
    prisma.team.count({ where }),
  ]);

  return {
    success: true,
    data: teams.map((team) => ({
      ...team,
      ownerUser: team.ownerUser,
      tokens: team.tokens,
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

export async function addTokensToTeam(
  teamId: number,
  tokens: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  if (tokens <= 0) {
    return {
      success: false,
      message: "Tokens must be a positive number",
    };
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { tokens: true },
  });

  if (!team) {
    return {
      success: false,
      message: "Team not found",
    };
  }

  await prisma.$transaction(async (tx) => {
    // ⚠️ 团队积分发放，余额记录在 team 上，日志记录在 user 上
    await tx.teamTokens.update({
      where: { teamId: team.id },
      data: {
        permanentBalance: { increment: tokens },
      },
    });
    await tx.userTokensLog.create({
      data: {
        userId: team.ownerUserId,
        value: tokens,
        verb: "gift",
      },
    });
  });

  revalidatePath("/admin/teams");

  return {
    success: true,
    data: undefined,
  };
}
