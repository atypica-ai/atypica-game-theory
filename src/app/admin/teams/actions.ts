"use server";

import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { Team, User } from "@/prisma/client";
import { TeamWhereInput } from "@/prisma/models";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { revalidatePath } from "next/cache";

export async function fetchTeams(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
): Promise<
  ServerActionResult<
    (Pick<Team, "id" | "name" | "createdAt" | "seats" | "extra"> & {
      ownerUser: Pick<User, "id" | "email">;
      tokensAccount: { permanentBalance: number; monthlyBalance: number } | null;
      _count: { members: number; subscriptions: number; paymentRecords: number };
      totalPaymentAmount: number;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);
  const skip = (page - 1) * pageSize;

  const where: TeamWhereInput = {};

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
        seats: true,
        extra: true,
        ownerUser: {
          select: {
            id: true,
            email: true,
          },
        },
        tokensAccount: {
          select: {
            permanentBalance: true,
            monthlyBalance: true,
          },
        },
        members: {
          where: {
            personalUserId: { not: null },
          },
          select: { id: true },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    }),
    prisma.team.count({ where }),
  ]);

  // Get payment records count and total amount for each team (through team members)
  const teamsWithPaymentCount = await Promise.all(
    teams.map(async (team) => {
      const paymentRecords = await prisma.paymentRecord.findMany({
        where: {
          status: "succeeded",
          user: {
            teamIdAsMember: team.id,
          },
        },
        select: {
          id: true,
          amount: true,
        },
      });
      const totalPaymentAmount = paymentRecords.reduce((sum, pr) => sum + pr.amount, 0);
      const { members, ...teamWithoutMembers } = team;
      return {
        ...teamWithoutMembers,
        _count: {
          ...team._count,
          members: members.length, // Count of active members (personalUserId not null)
          paymentRecords: paymentRecords.length,
        },
        totalPaymentAmount,
      };
    }),
  );

  return {
    success: true,
    data: teamsWithPaymentCount,
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
    include: { tokensAccount: true },
  });

  if (!team) {
    return {
      success: false,
      message: "Team not found",
    };
  }

  await prisma.$transaction(async (tx) => {
    // ⚠️ 团队积分发放，余额记录在 team 上，日志记录在 user 上
    await tx.tokensAccount.update({
      where: { teamId: team.id },
      data: {
        permanentBalance: { increment: tokens },
      },
    });
    await tx.tokensLog.create({
      data: {
        // userId: team.ownerUserId, // 给团队直接发送的 tokens，不记录在单个用户上。
        teamId: team.id,
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

export async function updateTeamSeats(
  teamId: number,
  seats: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  if (seats < 1) {
    return {
      success: false,
      message: "Seats must be a positive number",
    };
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return {
      success: false,
      message: "Team not found",
    };
  }

  // Count only active members (not deleted)
  const activeMembersCount = await prisma.user.count({
    where: {
      teamIdAsMember: teamId,
      personalUserId: { not: null },
    },
  });

  if (seats < activeMembersCount) {
    return {
      success: false,
      message: `New seats count cannot be less than the current number of active members (${activeMembersCount}).`,
    };
  }

  await prisma.team.update({
    where: { id: teamId },
    data: {
      seats,
    },
  });

  revalidatePath("/admin/teams");

  return {
    success: true,
    data: undefined,
  };
}

export async function updateTeamUnlimitedSeats(
  teamId: number,
  unlimitedSeats: boolean,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return {
      success: false,
      message: "Team not found",
    };
  }

  await mergeExtra({
    tableName: "Team",
    id: teamId,
    extra: { unlimitedSeats },
  });

  revalidatePath("/admin/teams");

  return {
    success: true,
    data: undefined,
  };
}

export async function deleteTeam(teamId: number): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      _count: {
        select: {
          subscriptions: true,
          personas: true,
          personaPanels: true,
        },
      },
    },
  });

  if (!team) {
    return {
      success: false,
      message: "Team not found",
    };
  }

  // Check if team has any subscriptions
  if (team._count.subscriptions > 0) {
    return {
      success: false,
      message: "Cannot delete team with existing subscriptions",
    };
  }

  // Check if team has any personas or panels (onDelete: Restrict)
  if (team._count.personas > 0 || team._count.personaPanels > 0) {
    return {
      success: false,
      message: "Cannot delete team with existing personas or panels",
    };
  }

  // Check if team has any payment records (through team members)
  const paymentRecordsCount = await prisma.paymentRecord.count({
    where: {
      user: {
        teamIdAsMember: teamId,
      },
    },
  });

  if (paymentRecordsCount > 0) {
    return {
      success: false,
      message: "Cannot delete team with existing payment records",
    };
  }

  // Check if team has any tokens logs
  const tokensLogsCount = await prisma.tokensLog.count({
    where: {
      teamId: teamId,
    },
  });

  if (tokensLogsCount > 0) {
    return {
      success: false,
      message: "Cannot delete team with existing tokens logs",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Delete team member users' profiles
      await tx.userProfile.deleteMany({
        where: {
          user: {
            teamIdAsMember: teamId,
          },
        },
      });

      // Delete team member users
      await tx.user.deleteMany({
        where: {
          teamIdAsMember: teamId,
        },
      });

      // Delete tokens account
      await tx.tokensAccount.deleteMany({
        where: {
          teamId: teamId,
        },
      });

      // Delete team
      await tx.team.delete({
        where: { id: teamId },
      });
    });

    revalidatePath("/admin/teams");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    rootLogger.error({
      msg: "Failed to delete team",
      error: (error as Error).message,
      teamId,
    });
    return {
      success: false,
      message: "Failed to delete team",
    };
  }
}
