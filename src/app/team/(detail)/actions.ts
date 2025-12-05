"use server";
import { createTeamMemberUser } from "@/app/(auth)/lib";
import { fetchActiveSubscription } from "@/app/account/lib";
import { deleteApiKey, generateApiKey, listApiKeys } from "@/lib/apiKey/lib";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Subscription, Team, TeamExtra, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { randomBytes } from "crypto";
import { promises as dns } from "dns";
import { getTranslations } from "next-intl/server";
import { deleteTeamConfig, getTeamConfig, setTeamConfig } from "../teamConfig/lib";
import { TeamConfigName, TeamConfigValue } from "../teamConfig/types";

/**
 * 验证团队所有权的工具函数
 * @param teamId - 团队
 * @param userId - Team Owner 的团队用户身份
 */
async function verifyTeamOwnership(
  teamId: number,
  userId: number,
): Promise<
  | { success: false; message: string }
  | {
      success: true;
      team: Pick<Team, "id" | "name" | "ownerUserId" | "seats"> & { extra: TeamExtra };
      user: Pick<User, "id" | "name" | "personalUserId" | "teamIdAsMember"> & {
        personalUser: { id: number; email: string };
      };
    }
> {
  const [team, user] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        ownerUserId: true,
        seats: true,
        extra: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        personalUserId: true,
        personalUser: { select: { id: true, email: true } },
        teamIdAsMember: true,
      },
    }),
  ]);
  if (!team) {
    return { success: false, message: "Team not found" };
  }
  if (!user) {
    return { success: false, message: "User not found" };
  }
  if (team.ownerUserId !== user.personalUserId) {
    return { success: false, message: "User is not the owner of this team" };
  }
  if (!user.personalUser || !user.personalUser.email) {
    return {
      success: false,
      message: "User is linked to a personal user or personal user email is missing",
    };
  }
  return {
    success: true,
    team: {
      ...team,
      extra: team.extra as TeamExtra,
    },
    user: {
      ...user,
      personalUser: {
        ...user.personalUser,
        email: user.personalUser.email,
      },
    },
  };
}

// 添加团队成员
export async function addTeamMemberAction(data: {
  teamId: number;
  memberEmail: string;
}): Promise<ServerActionResult<User>> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async ({ id: userId }) => {
    try {
      // 检查团队是否存在且用户是否为团队拥有者
      const ownershipCheck = await verifyTeamOwnership(data.teamId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      const team = ownershipCheck.team;

      // Check if team has unlimited seats flag
      const teamExtra = team.extra as TeamExtra | null;
      const hasUnlimitedSeats = teamExtra?.unlimitedSeats === true;

      // 检查活跃成员数量（只统计有 personalUserId 的成员）
      const activeMembersCount = await prisma.user.count({
        where: {
          teamIdAsMember: data.teamId,
          personalUserId: { not: null },
        },
      });

      // Only check seat limit if team doesn't have unlimited seats
      if (!hasUnlimitedSeats && activeMembersCount >= team.seats) {
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
      const existingMember = await prisma.user.findUnique({
        where: {
          teamIdAsMember_personalUserId: {
            personalUserId: targetUser.id,
            teamIdAsMember: data.teamId,
          },
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
export async function getTeamMembersAction(): Promise<
  ServerActionResult<
    Array<
      User & {
        personalUser: User | null;
      }
    >
  >
> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async (user, userType, team) => {
    try {
      // 所有团队成员都可以查看成员列表，不需要是 owner
      if (userType !== "TeamMember" || !team) {
        return {
          success: false,
          message: "User is not a member of any team",
        };
      }

      // 原来的 owner 权限检查（已废弃）
      // const ownershipCheck = await verifyTeamOwnership(teamId, userId);
      // if (!ownershipCheck.success) {
      //   return ownershipCheck;
      // }
      // const team = ownershipCheck.team;

      // 获取团队成员（包括被删除的成员）
      const members = await prisma.user.findMany({
        where: {
          teamIdAsMember: team.id,
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
  const t = await getTranslations("Team.Actions");
  return withAuth(async ({ id: userId }) => {
    try {
      // 检查团队是否存在且用户是否为团队拥有者
      const ownershipCheck = await verifyTeamOwnership(data.teamId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      const team = ownershipCheck.team;

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

// 获取团队订阅信息
export async function getTeamSubscriptionAction(): Promise<
  ServerActionResult<Subscription | null>
> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async (user, userType, team) => {
    try {
      // 所有团队成员都可以查看订阅信息，不需要是 owner
      // 检查用户是否是该团队的成员
      if (userType !== "TeamMember" || !team) {
        return {
          success: false,
          message: "User is not a member of any team",
        };
      }

      // 原来的 owner 权限检查（已废弃）
      // const ownershipCheck = await verifyTeamOwnership(teamId, userId);
      // if (!ownershipCheck.success) {
      //   return ownershipCheck;
      // }

      const { activeSubscription } = await fetchActiveSubscription({
        // userId, // 这里用 userId 和 teamId 都可以，但是 teamId 快一点
        teamId: team.id,
      });

      return {
        success: true,
        data: activeSubscription,
      };
    } catch (error) {
      rootLogger.error(`获取团队订阅失败: ${(error as Error).message}`);
      return {
        success: false,
        message: t("getTeam.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// ===== API Key Management =====

// List team API keys
export async function listTeamApiKeysAction(): Promise<
  ServerActionResult<Array<{ id: number; key: string; createdAt: Date; createdByEmail: string }>>
> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async (user, userType, team) => {
    try {
      // 所有团队成员都可以查看 API keys（会返回 masked 版本给非 owner）
      if (userType !== "TeamMember" || !team) {
        return {
          success: false,
          message: "User is not a member of this team",
        };
      }

      // 检查是否是 owner
      const ownershipCheck = await verifyTeamOwnership(team.id, user.id);

      // Use new apiKey lib
      const apiKeys = await listApiKeys({ teamId: team.id });

      // 非 owner 返回 masked 的 API keys
      if (!ownershipCheck.success) {
        const maskedKeys = apiKeys.map((key) => ({
          id: key.id,
          key: "atypica_" + "•".repeat(64), // 返回 masked 的 key
          createdAt: key.createdAt,
          createdByEmail: "", // 非 owner 不需要知道是谁创建的
        }));

        return {
          success: true,
          data: maskedKeys,
        };
      }

      return {
        success: true,
        data: apiKeys,
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to list team API keys", error });
      return {
        success: false,
        message: t("listApiKeys.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// Generate API Key for team
export async function generateTeamApiKeyAction(
  teamId: number,
): Promise<
  ServerActionResult<{ id: number; key: string; createdAt: Date; createdByEmail: string }>
> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async ({ id: userId }) => {
    try {
      // Check team ownership
      const ownershipCheck = await verifyTeamOwnership(teamId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      const { user } = ownershipCheck;

      // Use new apiKey lib
      const apiKeyData = await generateApiKey({
        teamId,
        createdByEmail: user.personalUser.email,
      });

      return {
        success: true,
        data: apiKeyData,
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to generate API key", error });
      return {
        success: false,
        message: t("generateApiKey.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// Delete team API key with ownership verification
export async function deleteTeamApiKeyAction(
  teamId: number,
  apiKeyId: number,
): Promise<ServerActionResult<null>> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async ({ id: userId }) => {
    try {
      // Check team ownership
      const ownershipCheck = await verifyTeamOwnership(teamId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      // Delete with teamId verification - ensures only this team's keys can be deleted
      await deleteApiKey(apiKeyId, { teamId });

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to delete API key", error });
      return {
        success: false,
        message: t("deleteApiKey.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// Email Domain Whitelist Management

// Get domain whitelist
export async function getDomainWhitelistAction(): Promise<
  ServerActionResult<TeamConfigValue[TeamConfigName.emailDomainWhitelist]>
> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async (user, userType, team) => {
    try {
      // 所有团队成员都可以查看域名白名单，不需要是 owner
      // 检查用户是否是该团队的成员
      if (userType !== "TeamMember" || !team) {
        return {
          success: false,
          message: "User is not a member of this team",
        };
      }

      // 原来的 owner 权限检查（已废弃）
      // const ownershipCheck = await verifyTeamOwnership(teamId, userId);
      // if (!ownershipCheck.success) {
      //   return ownershipCheck;
      // }

      const config = await getTeamConfig(team.id, TeamConfigName.emailDomainWhitelist);

      return {
        success: true,
        data: config ?? { domains: [] },
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to get domain whitelist", error });
      return {
        success: false,
        message: t("getDomainWhitelist.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// Add domain to whitelist
export async function addDomainAction(
  teamId: number,
  domain: string,
): Promise<
  ServerActionResult<TeamConfigValue[TeamConfigName.emailDomainWhitelist]["domains"][number]>
> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async ({ id: userId }) => {
    try {
      // Check team ownership
      const ownershipCheck = await verifyTeamOwnership(teamId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      // Validate domain format
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
      if (!domainRegex.test(domain)) {
        return {
          success: false,
          message: t("addDomain.invalidFormat"),
          code: "internal_server_error",
        };
      }

      // Generate verification token
      const verificationToken = randomBytes(16).toString("hex");

      // Get existing config
      const existingConfig = await getTeamConfig(teamId, TeamConfigName.emailDomainWhitelist);
      const existingDomains = existingConfig?.domains || [];

      // Check if domain already exists
      if (existingDomains.some((d) => d.domain === domain)) {
        return {
          success: false,
          message: t("addDomain.alreadyExists"),
          code: "internal_server_error",
        };
      }

      const newDomain = {
        domain,
        verificationToken,
        status: "pending" as const,
        addedBy: userId,
        addedAt: new Date().toISOString(),
      };

      // Update config
      await setTeamConfig(teamId, TeamConfigName.emailDomainWhitelist, {
        domains: [...existingDomains, newDomain],
      });

      return {
        success: true,
        data: newDomain,
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to add domain", error });
      return {
        success: false,
        message: t("addDomain.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// Verify domain DNS TXT record
export async function verifyDomainAction(
  teamId: number,
  domain: string,
): Promise<ServerActionResult<{ verifiedAt: string }>> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async ({ id: userId }) => {
    try {
      // Check team ownership
      const ownershipCheck = await verifyTeamOwnership(teamId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      // Get config
      const whitelist = await getTeamConfig(teamId, TeamConfigName.emailDomainWhitelist);

      if (!whitelist) {
        return {
          success: false,
          message: t("verifyDomain.notFound"),
          code: "internal_server_error",
        };
      }

      const domainEntry = whitelist.domains.find((d) => d.domain === domain);
      if (!domainEntry) {
        return {
          success: false,
          message: t("verifyDomain.notFound"),
          code: "internal_server_error",
        };
      }

      // Query DNS TXT records
      try {
        const txtRecords = await dns.resolveTxt(domain);
        const expectedRecord = `atypica-verification=${domainEntry.verificationToken}`;

        // Check if the expected record exists
        const isVerified = txtRecords.some((record) => record.join("") === expectedRecord);

        if (!isVerified) {
          return {
            success: false,
            message: t("verifyDomain.recordNotFound"),
            code: "internal_server_error",
          };
        }

        // Update domain status to verified
        const verifiedAt = new Date().toISOString();
        const updatedDomains = whitelist.domains.map((d) =>
          d.domain === domain ? { ...d, status: "verified" as const, verifiedAt } : d,
        );

        await setTeamConfig(teamId, TeamConfigName.emailDomainWhitelist, {
          domains: updatedDomains,
        });

        return {
          success: true,
          data: { verifiedAt },
        };
      } catch (dnsError) {
        rootLogger.error({ msg: "DNS query failed", error: dnsError });
        return {
          success: false,
          message: t("verifyDomain.dnsQueryFailed"),
          code: "internal_server_error",
        };
      }
    } catch (error) {
      rootLogger.error({ msg: "Failed to verify domain", error });
      return {
        success: false,
        message: t("verifyDomain.failed"),
        code: "internal_server_error",
      };
    }
  });
}

// Remove domain from whitelist
export async function removeDomainAction(
  teamId: number,
  domain: string,
): Promise<ServerActionResult<null>> {
  const t = await getTranslations("Team.Actions");
  return withAuth(async ({ id: userId }) => {
    try {
      // Check team ownership
      const ownershipCheck = await verifyTeamOwnership(teamId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      // Get config
      const whitelist = await getTeamConfig(teamId, TeamConfigName.emailDomainWhitelist);

      if (!whitelist) {
        return {
          success: false,
          message: t("removeDomain.notFound"),
          code: "internal_server_error",
        };
      }

      // Filter out the domain
      const updatedDomains = whitelist.domains.filter((d) => d.domain !== domain);

      if (updatedDomains.length === whitelist.domains.length) {
        return {
          success: false,
          message: t("removeDomain.notFound"),
          code: "internal_server_error",
        };
      }

      // Update or delete config
      if (updatedDomains.length === 0) {
        await deleteTeamConfig(teamId, TeamConfigName.emailDomainWhitelist);
      } else {
        await setTeamConfig(teamId, TeamConfigName.emailDomainWhitelist, {
          domains: updatedDomains,
        });
      }

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to remove domain", error });
      return {
        success: false,
        message: t("removeDomain.failed"),
        code: "internal_server_error",
      };
    }
  });
}
