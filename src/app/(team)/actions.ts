"use server";
import { createTeamMemberUser } from "@/app/(auth)/lib";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Team, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { generateUserSwitchToken } from "./userSwitchToken";

// 创建团队
export async function createTeamAction(data: { name: string }): Promise<ServerActionResult<Team>> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });

  return withAuth(async (user) => {
    try {
      // 检查用户是否为个人用户（有email且没有teamId）
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser) {
        return {
          success: false,
          message: t("userNotFound"),
          code: "not_found",
        };
      }

      if (!fullUser.email || fullUser.teamIdAsMember) {
        return {
          success: false,
          message: t("createTeam.forbidden"),
          code: "forbidden",
        };
      }

      // 检查团队名称是否已存在
      const existingTeam = await prisma.team.findFirst({
        where: {
          name: data.name,
          ownerUserId: user.id,
        },
      });

      if (existingTeam) {
        return {
          success: false,
          message: t("createTeam.nameExists"),
        };
      }

      // 创建团队
      const team = await prisma.team.create({
        data: {
          name: data.name,
          seats: 5, // 默认5个座位
          ownerUserId: user.id,
        },
      });

      // 创建团队拥有者的团队用户身份
      await createTeamMemberUser({
        personalUser: fullUser,
        teamAsMember: team,
      });

      return {
        success: true,
        data: team,
      };
    } catch (error) {
      rootLogger.error(`创建团队失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("createTeam.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 获取用户的团队列表
export async function getUserTeamsAction(): Promise<ServerActionResult<Team[]>> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });
  return withAuth(async (user) => {
    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          teamsAsOwner: true,
        },
      });

      if (!fullUser) {
        return {
          success: false,
          message: t("userNotFound"),
          code: "not_found",
        };
      }

      return {
        success: true,
        data: fullUser.teamsAsOwner,
      };
    } catch (error) {
      rootLogger.error(`获取团队列表失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("getUserTeams.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 添加团队成员
export async function addTeamMemberAction(data: {
  teamId: number;
  memberEmail: string;
}): Promise<ServerActionResult<User>> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });
  return withAuth(async (user) => {
    try {
      // 检查团队是否存在且用户是否为团队拥有者
      const team = await prisma.team.findUnique({
        where: { id: data.teamId },
        include: {
          members: true,
        },
      });

      if (!team) {
        return {
          success: false,
          message: t("addMember.teamNotFound"),
          code: "not_found",
        };
      }

      if (team.ownerUserId !== user.id) {
        return {
          success: false,
          message: t("addMember.forbidden"),
          code: "forbidden",
        };
      }

      // 检查活跃成员数量（只统计有 personalUserId 的成员）
      const activeMembersCount = await prisma.user.count({
        where: {
          teamIdAsMember: data.teamId,
          personalUserId: { not: null },
        },
      });

      if (activeMembersCount >= team.seats) {
        return {
          success: false,
          message: t("addMember.seatsFull"),
        };
      }

      // 查找要添加的用户（必须是已注册的个人用户）
      const targetUser = await prisma.user.findUnique({
        where: { email: data.memberEmail },
      });

      if (!targetUser) {
        return {
          success: false,
          message: t("addMember.userNotExist"),
          code: "not_found",
        };
      }

      if (!targetUser.email || targetUser.teamIdAsMember) {
        return {
          success: false,
          message: t("addMember.notIndividualUser"),
        };
      }

      // 检查用户是否已经在团队中
      const existingMember = await prisma.user.findFirst({
        where: {
          personalUserId: targetUser.id,
          teamIdAsMember: data.teamId,
        },
      });

      if (existingMember) {
        return {
          success: false,
          message: t("addMember.alreadyMember"),
        };
      }

      // 创建团队用户（复制个人用户信息）
      const teamUser = await createTeamMemberUser({
        personalUser: targetUser,
        teamAsMember: team,
      });

      return {
        success: true,
        data: teamUser,
      };
    } catch (error) {
      rootLogger.error(`添加团队成员失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("addMember.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 获取团队成员列表
export async function getTeamMembersAction(teamId: number): Promise<
  ServerActionResult<
    Array<
      User & {
        personalUser: User | null;
      }
    >
  >
> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });
  return withAuth(async (user) => {
    try {
      // 检查团队是否存在且用户是否为团队拥有者
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        return {
          success: false,
          message: t("getMembers.teamNotFound"),
          code: "not_found",
        };
      }

      if (team.ownerUserId !== user.id) {
        return {
          success: false,
          message: t("getMembers.forbidden"),
          code: "forbidden",
        };
      }

      // 获取团队成员（包括被删除的成员）
      const members = await prisma.user.findMany({
        where: {
          teamIdAsMember: teamId,
        },
      });

      // 手动获取对应的个人用户
      const membersWithPersonalUser = await Promise.all(
        members.map(async (member) => {
          const personalUser = member.personalUserId
            ? await prisma.user.findUnique({
                where: { id: member.personalUserId },
              })
            : null;

          return {
            ...member,
            personalUser,
          };
        }),
      );

      return {
        success: true,
        data: membersWithPersonalUser,
      };
    } catch (error) {
      rootLogger.error(`获取团队成员失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("getMembers.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 移除团队成员
export async function removeTeamMemberAction(data: {
  teamId: number;
  memberId: number;
}): Promise<ServerActionResult<null>> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });
  return withAuth(async (user) => {
    try {
      // 检查团队是否存在且用户是否为团队拥有者
      const team = await prisma.team.findUnique({
        where: { id: data.teamId },
      });

      if (!team) {
        return {
          success: false,
          message: t("removeMember.teamNotFound"),
          code: "not_found",
        };
      }

      if (team.ownerUserId !== user.id) {
        return {
          success: false,
          message: t("removeMember.forbidden"),
          code: "forbidden",
        };
      }

      // 检查要移除的成员是否存在
      const member = await prisma.user.findUnique({
        where: { id: data.memberId },
      });

      if (!member || member.teamIdAsMember !== data.teamId) {
        return {
          success: false,
          message: t("removeMember.memberNotFound"),
          code: "not_found",
        };
      }

      // 检查是否为团队拥有者，拥有者不能被删除
      if (member.personalUserId === team.ownerUserId) {
        return {
          success: false,
          message: t("removeMember.ownerCannotBeRemoved"),
        };
      }

      // 获取 personalUser 信息用于显示
      const personalUser = member.personalUserId
        ? await prisma.user.findUnique({
            where: { id: member.personalUserId },
          })
        : null;

      // 断开关联而不是删除用户，保留历史数据
      await prisma.user.update({
        where: { id: data.memberId },
        data: {
          personalUserId: null,
          name: `[Deleted] ${personalUser?.email || "Unknown User"}`,
        },
      });

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      rootLogger.error(`移除团队成员失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("removeMember.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 获取用户可以切换的身份列表
export async function getUserSwitchableIdentitiesAction(): Promise<
  ServerActionResult<{
    personalUser: User | null;
    teamUsers: Array<User & { team: Team }>;
  }>
> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });
  return withAuth(async (user) => {
    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser) {
        return {
          success: false,
          message: t("userNotFound"),
          code: "not_found",
        };
      }

      let personalUser: User | null = null;
      let teamUsers: Array<User & { team: Team }> = [];

      // 如果是个人用户，返回个人用户和其团队用户
      if (fullUser.email && !fullUser.teamIdAsMember && !fullUser.personalUserId) {
        personalUser = fullUser;

        // 获取活跃的团队用户（只包含有 personalUserId 的）
        const teamUsersData = await prisma.user.findMany({
          where: {
            personalUserId: fullUser.id,
            teamIdAsMember: { not: null },
          },
          include: {
            teamAsMember: true,
          },
        });

        teamUsers = teamUsersData.map((tu) => ({
          ...tu,
          team: tu.teamAsMember!,
        }));
      }
      // 如果是团队用户，返回对应的个人用户和其他团队用户
      else if (fullUser.personalUserId) {
        personalUser = await prisma.user.findUnique({
          where: { id: fullUser.personalUserId },
        });

        if (personalUser) {
          // 获取所有活跃的团队用户
          const teamUsersData = await prisma.user.findMany({
            where: {
              personalUserId: personalUser.id,
              teamIdAsMember: { not: null },
            },
            include: {
              teamAsMember: true,
            },
          });

          teamUsers = teamUsersData.map((tu) => ({
            ...tu,
            team: tu.teamAsMember!,
          }));
        }
      }

      return {
        success: true,
        data: {
          personalUser,
          teamUsers,
        },
      };
    } catch (error) {
      rootLogger.error(`获取可切换身份失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("getSwitchableIdentities.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 生成安全的用户切换token
export async function generateUserSwitchTokenAction(
  targetUserId: number,
): Promise<ServerActionResult<string>> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });
  return withAuth(async (user) => {
    try {
      const currentUserId = user.id;

      // 获取当前用户和目标用户
      const [currentUser, targetUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: currentUserId } }),
        prisma.user.findUnique({ where: { id: targetUserId } }),
      ]);

      if (!currentUser || !targetUser) {
        return {
          success: false,
          message: t("userNotFound"),
          code: "not_found",
        };
      }

      // 验证切换权限
      const hasPermission = verifyUserSwitchPermission(currentUser, targetUser);
      if (!hasPermission) {
        return {
          success: false,
          message: t("generateSwitchToken.permissionDenied"),
          code: "forbidden",
        };
      }

      // 生成加密token（使用与impersonation-login相同的算法）
      const switchToken = generateUserSwitchToken(currentUserId, targetUserId);

      return {
        success: true,
        data: switchToken,
      };
    } catch (error) {
      rootLogger.error(`生成切换token失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("generateSwitchToken.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 检查用户是否有团队（用于 UserMenu 条件显示）
export async function getUserTeamStatusAction(): Promise<
  ServerActionResult<{
    hasOwnedTeams: boolean;
    canSwitchIdentity: boolean;
  }>
> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });
  return withAuth(async (user) => {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!currentUser) {
        return {
          success: false,
          message: t("userNotFound"),
          code: "not_found",
        };
      }

      let hasOwnedTeams = false;
      let canSwitchIdentity = false;

      // 检查是否为个人用户
      if (currentUser.email && !currentUser.teamIdAsMember && !currentUser.personalUserId) {
        // 个人用户，检查是否拥有团队
        const ownedTeamsCount = await prisma.team.count({
          where: { ownerUserId: user.id },
        });
        hasOwnedTeams = ownedTeamsCount > 0;

        // 检查是否有活跃的团队用户可以切换
        const teamUsersCount = await prisma.user.count({
          where: {
            personalUserId: user.id,
            teamIdAsMember: { not: null },
          },
        });
        canSwitchIdentity = teamUsersCount > 0;
      } else if (currentUser.personalUserId && currentUser.teamIdAsMember) {
        // 活跃的团队用户，总是可以切换回个人用户或其他团队
        canSwitchIdentity = true;

        // 检查对应的个人用户是否拥有团队
        const ownedTeamsCount = await prisma.team.count({
          where: { ownerUserId: currentUser.personalUserId },
        });
        hasOwnedTeams = ownedTeamsCount > 0;
      }

      return {
        success: true,
        data: {
          hasOwnedTeams,
          canSwitchIdentity,
        },
      };
    } catch (error) {
      rootLogger.error(`获取用户团队状态失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("getTeamStatus.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 获取单个团队信息
export async function getTeamAction(teamId: number): Promise<ServerActionResult<Team>> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Team.Actions" });
  return withAuth(async (user) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        return {
          success: false,
          message: t("getTeam.teamNotFound"),
          code: "not_found",
        };
      }

      if (team.ownerUserId !== user.id) {
        return {
          success: false,
          message: t("getTeam.forbidden"),
          code: "forbidden",
        };
      }

      return {
        success: true,
        data: team,
      };
    } catch (error) {
      rootLogger.error(`获取团队信息失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("getTeam.failed"),
        code: "internal_server_error",
      };
    }
  });
}

function verifyUserSwitchPermission(currentUser: User, targetUser: User): boolean {
  // 如果目标就是当前用户，允许
  if (currentUser.id === targetUser.id) {
    return true;
  }

  // 情况1：当前是个人用户，目标是其团队用户
  if (currentUser.email && !currentUser.teamIdAsMember && !currentUser.personalUserId) {
    return targetUser.personalUserId === currentUser.id;
  }

  // 情况2：当前是团队用户，目标是对应的个人用户
  if (currentUser.personalUserId && currentUser.teamIdAsMember) {
    return targetUser.id === currentUser.personalUserId;
  }

  // 情况3：当前是团队用户，目标是同一个人的其他团队用户
  if (currentUser.personalUserId && targetUser.personalUserId) {
    return currentUser.personalUserId === targetUser.personalUserId;
  }

  return false;
}
