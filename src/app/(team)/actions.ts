"use server";
import { createTeamMemberUser } from "@/app/(auth)/lib";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Team, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateUserSwitchToken } from "./userSwitchToken";

// 创建团队
export async function createTeamAction(data: { name: string }): Promise<ServerActionResult<Team>> {
  return withAuth(async (user) => {
    try {
      // 检查用户是否为个人用户（有email且没有teamId）
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser) {
        return {
          success: false,
          message: "用户不存在",
          code: "not_found",
        };
      }

      if (!fullUser.email || fullUser.teamIdAsMember) {
        return {
          success: false,
          message: "只有个人用户可以创建团队",
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
          message: "团队名称已存在",
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

      return {
        success: true,
        data: team,
      };
    } catch (error) {
      rootLogger.error(`创建团队失败: ${(error as Error).message}`);
      return {
        success: false,
        message: "创建团队失败",
        code: "internal_server_error",
      };
    }
  });
}

// 获取用户的团队列表
export async function getUserTeamsAction(): Promise<ServerActionResult<Team[]>> {
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
          message: "用户不存在",
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
        message: "获取团队列表失败",
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
          message: "团队不存在",
          code: "not_found",
        };
      }

      if (team.ownerUserId !== user.id) {
        return {
          success: false,
          message: "只有团队拥有者可以添加成员",
          code: "forbidden",
        };
      }

      // 检查是否还有座位
      if (team.members.length >= team.seats) {
        return {
          success: false,
          message: "团队座位已满",
        };
      }

      // 查找要添加的用户（必须是已注册的个人用户）
      const targetUser = await prisma.user.findUnique({
        where: { email: data.memberEmail },
      });

      if (!targetUser) {
        return {
          success: false,
          message: "该邮箱用户不存在，请确保用户已注册",
          code: "not_found",
        };
      }

      if (!targetUser.email || targetUser.teamIdAsMember) {
        return {
          success: false,
          message: "只能添加个人用户为团队成员",
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
          message: "用户已经是团队成员",
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
        message: "添加团队成员失败",
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
  return withAuth(async (user) => {
    try {
      // 检查团队是否存在且用户是否为团队拥有者
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        return {
          success: false,
          message: "团队不存在",
          code: "not_found",
        };
      }

      if (team.ownerUserId !== user.id) {
        return {
          success: false,
          message: "只有团队拥有者可以查看成员列表",
          code: "forbidden",
        };
      }

      // 获取团队成员
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
        message: "获取团队成员失败",
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
  return withAuth(async (user) => {
    try {
      // 检查团队是否存在且用户是否为团队拥有者
      const team = await prisma.team.findUnique({
        where: { id: data.teamId },
      });

      if (!team) {
        return {
          success: false,
          message: "团队不存在",
          code: "not_found",
        };
      }

      if (team.ownerUserId !== user.id) {
        return {
          success: false,
          message: "只有团队拥有者可以移除成员",
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
          message: "成员不存在或不属于该团队",
          code: "not_found",
        };
      }

      // 删除团队用户
      await prisma.user.delete({
        where: { id: data.memberId },
      });

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      rootLogger.error(`移除团队成员失败: ${(error as Error).message}`);
      return {
        success: false,
        message: "移除团队成员失败",
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
  return withAuth(async (user) => {
    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser) {
        return {
          success: false,
          message: "用户不存在",
          code: "not_found",
        };
      }

      let personalUser: User | null = null;
      let teamUsers: Array<User & { team: Team }> = [];

      // 如果是个人用户，返回个人用户和其团队用户
      if (fullUser.email && !fullUser.teamIdAsMember && !fullUser.personalUserId) {
        personalUser = fullUser;

        // 获取团队用户
        const teamUsersData = await prisma.user.findMany({
          where: {
            personalUserId: fullUser.id,
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
          // 获取所有团队用户
          const teamUsersData = await prisma.user.findMany({
            where: {
              personalUserId: personalUser.id,
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
        message: "获取可切换身份失败",
        code: "internal_server_error",
      };
    }
  });
}

// 生成安全的用户切换token
export async function generateUserSwitchTokenAction(
  targetUserId: number,
): Promise<ServerActionResult<string>> {
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
          message: "用户不存在",
          code: "not_found",
        };
      }

      // 验证切换权限
      const hasPermission = verifyUserSwitchPermission(currentUser, targetUser);
      if (!hasPermission) {
        return {
          success: false,
          message: "无权限切换到该身份",
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
        message: "生成切换token失败",
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
