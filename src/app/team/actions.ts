"use server";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Team, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getTranslations } from "next-intl/server";
import { createTeam, generateUserSwitchToken } from "./lib";

// 创建团队
export async function createTeamAction({ name: teamName }: { name: string }): Promise<
  ServerActionResult<{
    team: Team;
    teamUser: Omit<User, "teamIdAsMember" | "personalUserId"> & {
      teamIdAsMember: number;
      personalUserId: number;
    };
  }>
> {
  return withAuth(async (user, userType) => {
    const t = await getTranslations("Team.Actions");
    try {
      if (userType !== "Personal") {
        return {
          success: false,
          message: t("createTeam.forbidden"),
          code: "forbidden",
        };
      }

      const teams = await prisma.team.findMany({
        where: { ownerUserId: user.id },
        select: { name: true },
      });

      if (teams.find((team) => team.name === teamName)) {
        return {
          success: false,
          message: t("createTeam.nameExists"),
        };
      }

      if (teams.length > 1) {
        return {
          success: false,
          message: t("createTeam.maxTeams"),
        };
      }

      const {
        team,
        teamUser, // owner 在 team 中对应的 team user，返回给前端用于创建完以后切换身份
      } = await createTeam({
        name: teamName,
        ownerUser: user,
      });

      return {
        success: true,
        data: { team, teamUser },
      };
    } catch (error) {
      rootLogger.error(`Failed to create team: ${(error as Error).message}`);
      return {
        success: false,
        message: t("createTeam.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// 获取用户可以切换的身份列表
export async function getUserSwitchableIdentitiesAction(): Promise<
  ServerActionResult<{
    personalUser: Pick<User, "id" | "name"> | null;
    teamUsers: Array<Pick<User, "id" | "name"> & { teamAsMember: Pick<Team, "id" | "name"> }>;
  }>
> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async (user) => {
    try {
      const fullUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          teamIdAsMember: true,
          personalUserId: true,
        },
      });

      let personalUser: Pick<User, "id" | "name"> | null = null;
      let teamUsers: Array<
        Pick<User, "id" | "name"> & { teamAsMember: Pick<Team, "id" | "name"> }
      > = [];

      if (!fullUser.teamIdAsMember) {
        // 个人用户，返回个人用户和其团队用户
        personalUser = fullUser;
        teamUsers = (
          await prisma.user.findMany({
            where: {
              personalUserId: fullUser.id,
              teamIdAsMember: { not: null },
            },
            select: {
              id: true,
              name: true,
              teamAsMember: { select: { id: true, name: true } },
            },
          })
        ).map(({ teamAsMember, ...rest }) => ({ teamAsMember: teamAsMember!, ...rest }));
      } else {
        // 团队用户，返回对应的个人用户和其他团队用户
        if (!fullUser.personalUserId) {
          // 用户从团队中被移除
          personalUser = null;
          teamUsers = [];
        } else {
          personalUser = await prisma.user.findUnique({
            where: {
              id: fullUser.personalUserId,
            },
            select: { id: true, name: true },
          });
          teamUsers = (
            await prisma.user.findMany({
              where: {
                personalUserId: fullUser.personalUserId,
                teamIdAsMember: { not: null },
              },
              select: {
                id: true,
                name: true,
                teamAsMember: { select: { id: true, name: true } },
              },
            })
          ).map(({ teamAsMember, ...rest }) => ({ teamAsMember: teamAsMember!, ...rest }));
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
  const t = await getTranslations("Team.Actions");
  return withAuth(async (user) => {
    try {
      const currentUserId = user.id;

      // 获取当前用户和目标用户
      const [currentUser, targetUser] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: currentUserId } }),
        prisma.user.findUniqueOrThrow({ where: { id: targetUserId } }),
      ]);

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
    teamRole: "owner" | "member" | "removed" | null;
    canSwitchIdentity: boolean;
  }>
> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async (user) => {
    try {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });

      let teamRole: "owner" | "member" | "removed" | null = null;
      let canSwitchIdentity = false;

      // 检查是否为个人用户
      if (!currentUser.teamIdAsMember) {
        // 检查是否有活跃的团队用户可以切换
        const teamUsersCount = await prisma.user.count({
          where: {
            personalUserId: user.id,
            teamIdAsMember: { not: null },
          },
        });
        canSwitchIdentity = teamUsersCount > 0;
        teamRole = null;
      } else {
        if (!currentUser.personalUserId) {
          // 用户被移除团队，无效，无法切换回个人用户
          teamRole = "removed";
          canSwitchIdentity = false;
        } else {
          // 有效的团队用户，总是可以切换回个人用户或其他团队
          canSwitchIdentity = true;
          // 检查所在团队的 owner 是否是当前团队用户，team owner 等于当前 team user 关联的 personal user
          const teamAsMember = await prisma.team.findUnique({
            where: { id: currentUser.teamIdAsMember },
          });
          teamRole = teamAsMember?.ownerUserId === currentUser.personalUserId ? "owner" : "member";
        }
      }

      return {
        success: true,
        data: {
          teamRole,
          canSwitchIdentity,
        },
      };
    } catch (error) {
      rootLogger.error(`Failed to get team status: ${(error as Error).message}`);
      return {
        success: false,
        message: t("getTeamStatus.failed"),
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

  if (!currentUser.teamIdAsMember && !currentUser.personalUserId) {
    // 当前是个人用户，目标是其团队用户
    return targetUser.personalUserId === currentUser.id;
  } else if (currentUser.teamIdAsMember && currentUser.personalUserId) {
    // 当前是团队用户，目标是对应的个人用户或者同一个人的其他团队用户
    return (
      targetUser.id === currentUser.personalUserId ||
      targetUser.personalUserId === currentUser.personalUserId
    );
  } else {
    // 用户的 teamIdAsMember 和 personalUserId 必须同时存在或者同时不存在
    // 否则可能是当前 team user 被从团队中移除，或者数据有问题
    // 只能 logout 以后再继续了
  }

  return false;
}
