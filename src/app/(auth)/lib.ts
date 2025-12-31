import "server-only";

import { manuallyAddTeamSubscription } from "@/app/payment/manualSubscription";
import { createTeam } from "@/app/team/lib";
import { trackEventServerSide, trackUserServerSide } from "@/lib/analytics/server";
import { getToltFromCookieStore } from "@/lib/analytics/tolt";
import { trackToltSignup } from "@/lib/analytics/tolt/lib";
import { getRefererFromCookieStore, getUtmFromCookieStore } from "@/lib/analytics/utm";
import { rootLogger } from "@/lib/logging";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "@/lib/request/headers";
import { Team, User, UserLastLogin, UserProfileExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { hash } from "bcryptjs";
import { after } from "next/server";

export const authLogger = rootLogger.child({ api: "next-auth" });

export const authClientInfo = async (): Promise<
  Pick<UserLastLogin, "timestamp" | "clientIp" | "userAgent" | "geo">
> => {
  const timestamp = Date.now();
  const [clientIp, userAgent, geo] = await Promise.all([
    getRequestClientIp(),
    getRequestUserAgent(),
    getRequestGeo(),
  ]);
  return {
    timestamp,
    clientIp,
    ...(userAgent ? { userAgent } : {}),
    ...(geo ? { geo } : {}),
  };
};

async function _recordLastLogin({
  userId,
  provider,
}: {
  userId: number;
  provider?: "email-password" | "impersonation" | "team-switch" | "google" | "aws-marketplace"; // 注册完会立即调用一次，此时没有 provider
}): Promise<UserLastLogin | void> {
  try {
    const clientInfo = await authClientInfo();
    const lastLogin = {
      ...clientInfo,
      provider,
    } satisfies UserLastLogin;
    await prisma.userProfile.update({
      where: { userId },
      data: { lastLogin },
    });
    return lastLogin;
  } catch (error) {
    // 不抛出异常
    authLogger.error(`Error updating user last login: ${(error as Error).message}`);
  }
}

/**
 * 保存用户的 acquisition 信息（UTM、Referer 和 Tolt）到 UserProfile
 * 如果有 Tolt referral，在保存后触发 Tolt API 追踪
 */
export async function _recordAcquisition({ userId }: { userId: number }) {
  try {
    const userProfile = await prisma.userProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true },
    });
    // 获取 acquisition 数据
    const [utmParams, refererParams, toltParams] = await Promise.all([
      getUtmFromCookieStore(),
      getRefererFromCookieStore(),
      getToltFromCookieStore(),
    ]);
    // 如果有 acquisition 数据，更新到数据库
    if (utmParams || refererParams || toltParams) {
      await mergeExtra({
        tableName: "UserProfile",
        extra: {
          acquisition: {
            ...(utmParams ? { utm: utmParams } : {}),
            ...(refererParams ? { referer: refererParams } : {}),
          } satisfies UserProfileExtra["acquisition"],
          ...(toltParams
            ? {
                tolt: toltParams satisfies UserProfileExtra["tolt"],
              }
            : {}),
        },
        id: userProfile.id,
      });
    }
    // 如果有 Tolt referral，调用 Tolt API 追踪注册
    if (toltParams) {
      await trackToltSignup({ userId });
    }
  } catch (error) {
    // 不抛出异常
    authLogger.error(`Error recording acquisition: ${(error as Error).message}`);
  }
}

export function recordAndTrackLastLogin({
  userId,
  provider,
}: {
  userId: number;
  provider: "email-password" | "impersonation" | "team-switch" | "google" | "aws-marketplace";
}) {
  // 后台运行，不要 await
  after(async () => {
    const lastLogin = await _recordLastLogin({ userId, provider }).catch(() => {});
    if (!lastLogin) return; // 如果没有 lastLogin，肯定是哪里出了问题，不上报事件
    trackEventServerSide({
      userId,
      event: "Signed In",
      properties: { ...lastLogin },
    });
  });
}

export async function createPersonalUser({
  email,
  password,
  emailVerified,
  grantSignupTokens = true,
}: {
  email: string;
  password?: string;
  emailVerified?: Date;
  grantSignupTokens?: boolean;
}) {
  email = email.toLowerCase();
  const name = email.split("@")[0];
  const hashedPassword = password ? await hash(password, 10) : "";

  const user = await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...user } = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: emailVerified ?? null,
      },
    });

    await tx.userProfile.create({
      data: { userId: user.id },
    });

    await tx.tokensAccount.create({
      data: {
        userId: user.id,
        permanentBalance: 0,
        monthlyBalance: 0,
      },
    });

    return user;
  });

  // 根据参数决定是否注册赠送 tokens
  if (grantSignupTokens) {
    const signupAmount = 1_000_000;
    await prisma.$transaction(async (tx) => {
      await tx.tokensLog.create({
        data: {
          userId: user.id,
          verb: "signup",
          value: signupAmount,
        },
      });
      await tx.tokensAccount.update({
        where: { userId: user.id },
        data: {
          permanentBalance: { increment: signupAmount },
        },
      });
    });
  }

  // waitUntil 和 after 有所不同，waitUntil 接受一个 Promise，after 接受一个 Promise 或者有一个返回 Promise 的方法（会先调用这个方法）
  after(async () => {
    await Promise.all([
      _recordLastLogin({ userId: user.id }),
      _recordAcquisition({ userId: user.id }), // 保存 UTM、Referer 和 Tolt，如有 Tolt 会自动调用 API 追踪
    ]).catch(() => {});
    trackUserServerSide({
      userId: user.id,
      traitTypes: ["profile", "clientInfo"],
    });
    trackEventServerSide({
      userId: user.id,
      event: "Signed Up",
      properties: { email },
    });
  });

  return { ...user, email } as Omit<User, "email"> & { email: string };
}

export async function createTeamMemberUser({
  personalUser,
  teamAsMember,
}: {
  personalUser: Pick<User, "id" | "name">;
  teamAsMember: Pick<Team, "id">;
}) {
  const teamUser = await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...teamUser } = await tx.user.create({
      data: {
        name: personalUser.name,
        email: null,
        password: "", // 没有密码
        teamIdAsMember: teamAsMember.id,
        personalUserId: personalUser.id,
      },
    });

    // ⚠️ team user 还是创建 userProfile 好，单独记录登录信息等
    await tx.userProfile.create({
      data: { userId: teamUser.id },
    });

    return teamUser;
  });

  // ⚠️ team user 没有 tokensAccount，而是关联 team 的 tokensAccount
  // await prisma.tokensAccount.create({
  //   data: {
  //     userId: teamUser.id,
  //     permanentBalance: 0,
  //     monthlyBalance: 0,
  //   },
  // });

  recordAndTrackLastLogin({ userId: teamUser.id, provider: "team-switch" });

  return teamUser as Omit<User, "teamIdAsMember" | "personalUserId"> & {
    teamIdAsMember: number;
    personalUserId: number;
  };
}

/**
 * 清理认证回调 URL，确保只返回路径部分，防止开放重定向攻击
 * @param url - 原始回调 URL
 * @returns 清理后的相对路径（以 / 开头）
 * @example
 * cleanAuthCallbackUrl("https://evil.com/path") // => "/path"
 * cleanAuthCallbackUrl("/account") // => "/account"
 * cleanAuthCallbackUrl("account") // => "/account"
 * cleanAuthCallbackUrl("") // => "/"
 */
export function cleanAuthCallbackUrl(url: string): string {
  // 空字符串或 falsy 值，返回默认路径
  if (!url || !url.trim()) return "/";
  url = url.trim();
  // 如果包含协议（http:// 或 https:// 或 //），解析并只取路径
  if (url.includes("://") || url.startsWith("//")) {
    try {
      // 对于 // 开头的协议相对 URL，补充协议
      const urlToParse = url.startsWith("//") ? `https:${url}` : url;
      const parsed = new URL(urlToParse);
      // 只返回路径部分（pathname + search + hash）
      const cleanPath = parsed.pathname + parsed.search + parsed.hash;
      return cleanPath || "/";
    } catch {
      // 解析失败，返回默认路径
      return "/";
    }
  }
  // 已经是相对路径，确保以 / 开头
  return url.startsWith("/") ? url : `/${url}`;
}

/**
 * 迁移阶段，在更新 lastLogin, onboarding, extra 的时候，需要先调用 upsertUserProfile
 * 一段时间已有，当所有用户都在创建的时候有了 profile，这部分可以删除
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DEPRECATED_upsertUserProfile({ userId }: { userId: number }) {
  throw new Error("Deprecated");
  // const profile = await prisma.$transaction(async (tx) => {
  //   let profile = await tx.userProfile.findUnique({
  //     where: { userId },
  //   });
  //   if (profile) {
  //     return profile;
  //   }
  //   const {
  //     lastLogin,
  //     extra: { onboarding, ...extra },
  //   } = await tx.user
  //     .findUniqueOrThrow({
  //       where: { id: userId },
  //       select: { id: true, lastLogin: true, extra: true },
  //     })
  //     .then(({ extra, ...user }) => ({ ...user, extra: extra as DeprecatedUserExtra }));
  //   profile = await tx.userProfile.create({
  //     data: {
  //       userId,
  //       lastLogin: lastLogin ?? {},
  //       onboarding: onboarding ?? {},
  //       extra: extra ?? {},
  //     },
  //   });
  //   // 清空 user 上的 lastLogin, onboarding, extra
  //   await tx.user.update({
  //     where: { id: userId },
  //     data: { lastLogin: {}, extra: {} },
  //   });
  //   return profile;
  // });
  // return profile;
}

/**
 * 为 AWS Marketplace 用户创建账户和 Team
 *
 * @param customerIdentifier - AWS 生成的客户唯一标识符
 * @param productCode - AWS Marketplace 产品代码
 *
 * @returns { personalUser, team, teamUser } - Personal User、Team 和 Team Member User
 *
 * 特点：
 * - 邮箱格式：${customerIdentifier}@aws.atypica.ai
 * - 密码为空（无法普通登录，只能从AWS Portal进入）
 * - 自动创建 Team（seats: 3，最多3个成员）
 * - 使用 createTeam 函数复用现有逻辑
 * - 处理并发注册（通过唯一约束冲突检测）
 */
export async function createAWSMarketplaceUserWithTeam({
  customerIdentifier,
  productCode,
}: {
  customerIdentifier: string;
  productCode: string;
}): Promise<{
  personalUser: Omit<User, "password">;
  team: Team;
  teamUser: User;
}> {
  const email = `${customerIdentifier}@aws.atypica.ai`;
  const name = customerIdentifier;
  const logger = authLogger.child({ module: "aws-marketplace-user-creation" });

  try {
    // 1. 创建 Personal User（不创建 tokensAccount，AWS 用户使用 team 的 tokens）
    const personalUser = await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...user } = await tx.user.create({
        data: {
          name,
          email,
          password: "", // 密码为空，无法普通登录
          emailVerified: new Date(), // 跳过邮箱验证
        },
      });

      // 创建 UserProfile
      await tx.userProfile.create({
        data: { userId: user.id },
      });

      // AWS 用户不需要 personal tokensAccount，他们使用 team 的 tokens

      return user;
    });

    // 2. 使用 createTeam 创建 Team 和 Team Member User
    const { team, teamUser } = await createTeam({
      name: "", // AWS teams 初始没有名称
      ownerUser: personalUser,
    });

    // 3. 更新 Team seats 为 3（AWS Team Plan）
    await prisma.team.update({
      where: { id: team.id },
      data: { seats: 3 },
    });

    // 4. 创建 AWSMarketplaceCustomer 记录
    await prisma.aWSMarketplaceCustomer.create({
      data: {
        userId: personalUser.id,
        customerIdentifier,
        productCode,
        status: "active",
        dimension: "team_plan",
        quantity: 3,
        subscribedAt: new Date(),
      },
    });

    // 5. 记录登录和获取信息（使用 teamUser.id）
    _recordLastLogin({ userId: teamUser.id, provider: "aws-marketplace" });
    _recordAcquisition({ userId: personalUser.id });

    // 6. 创建团队订阅记录（1个月，team plan，3 seats）
    await manuallyAddTeamSubscription({
      teamId: team.id,
      seats: 3,
      plan: "team",
      startsAt: new Date(),
      months: 1,
    });

    // 7. 从 AWS Entitlement API 同步订阅过期时间
    const { checkCustomerSubscription } = await import("@/lib/aws-marketplace/entitlement");
    const awsSubscription = await checkCustomerSubscription(customerIdentifier);

    if (awsSubscription.active) {
      const expiresAt = (awsSubscription as { active: true; expiresAt?: Date }).expiresAt;
      if (expiresAt) {
        const subscription = await prisma.subscription.findFirst({
          where: { teamId: team.id },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { endsAt: expiresAt },
          });
          logger.info({
            msg: "Synced subscription expiration from AWS",
            userId: personalUser.id,
            teamId: team.id,
            expiresAt,
          });
        }
      }
    }

    logger.info({
      msg: "AWS Marketplace user and team created",
      userId: personalUser.id,
      customerIdentifier,
      teamId: team.id,
      teamUserId: teamUser.id,
    });

    return { personalUser, team, teamUser };
  } catch (error) {
    // 处理唯一约束冲突（并发注册）
    if ((error as { code?: string }).code === "P2002") {
      logger.warn({
        msg: "Concurrent AWS registration detected, fetching existing user",
        customerIdentifier,
      });

      const existing = await prisma.aWSMarketplaceCustomer.findUnique({
        where: { customerIdentifier },
        include: {
          user: true,
        },
      });

      if (existing) {
        const team = await prisma.team.findFirst({
          where: { ownerUserId: existing.user.id },
        });

        // 查找 Team Member User
        const teamUser = await prisma.user.findFirst({
          where: {
            personalUserId: existing.user.id,
            teamIdAsMember: team?.id,
          },
        });

        if (team && teamUser) {
          logger.info({
            msg: "Returning existing AWS user from concurrent registration",
            userId: existing.user.id,
            customerIdentifier,
            teamUserId: teamUser.id,
          });

          // 检查是否已有订阅记录，没有则创建
          const existingSubscription = await prisma.subscription.findFirst({
            where: { teamId: team.id },
          });

          if (!existingSubscription) {
            await manuallyAddTeamSubscription({
              teamId: team.id,
              seats: 3,
              plan: "team",
              startsAt: new Date(),
              months: 1,
            });

            // 从 AWS Entitlement API 同步订阅过期时间
            const { checkCustomerSubscription } = await import("@/lib/aws-marketplace/entitlement");
            const awsSubscription = await checkCustomerSubscription(customerIdentifier);

            if (awsSubscription.active) {
              const expiresAt = (awsSubscription as { active: true; expiresAt?: Date }).expiresAt;
              if (expiresAt) {
                const newSubscription = await prisma.subscription.findFirst({
                  where: { teamId: team.id },
                });

                if (newSubscription) {
                  await prisma.subscription.update({
                    where: { id: newSubscription.id },
                    data: { endsAt: expiresAt },
                  });
                  logger.info({
                    msg: "Synced subscription expiration from AWS for concurrent registration",
                    userId: existing.user.id,
                    teamId: team.id,
                    expiresAt,
                  });
                }
              }
            }

            logger.info({
              msg: "Created subscription for existing AWS user",
              userId: existing.user.id,
              teamId: team.id,
            });
          }

          // 记录登录（使用 teamUser.id）
          _recordLastLogin({ userId: teamUser.id, provider: "aws-marketplace" });

          return { personalUser: existing.user, team, teamUser };
        }
      }
    }
    throw error;
  }
}
