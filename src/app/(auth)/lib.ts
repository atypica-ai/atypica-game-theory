import "server-only";

import { trackUserServerSide } from "@/lib/analytics/server";
import { getRefererFromCookieStore, getUtmFromCookieStore } from "@/lib/analytics/utm";
import { rootLogger } from "@/lib/logging";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "@/lib/request/headers";
import { DeprecatedUserExtra, Team, User, UserLastLogin } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { waitUntil } from "@vercel/functions";
import { hash } from "bcryptjs";

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

export function recordLastLogin({
  userId,
  provider,
}: {
  userId: number;
  provider: "email-password" | "impersonation" | "team-switch" | "google";
}) {
  // 后台运行，不要 await
  waitUntil(
    (async () => {
      try {
        await upsertUserProfile({ userId });
        const clientInfo = await authClientInfo();
        await prisma.userProfile.update({
          where: { userId },
          data: {
            lastLogin: {
              ...clientInfo,
              provider,
            },
          },
        });
      } catch (error) {
        authLogger.error(`Error updating user last login: ${(error as Error).message}`);
      }
    })(),
  );
}

/**
 * 保存用户的 acquisition 信息（UTM 和 Referer）到 UserProfile
 */
export function recordAcquisition({ userId }: { userId: number }) {
  // 后台运行，不要 await
  waitUntil(
    (async () => {
      try {
        const userProfile = await upsertUserProfile({ userId });
        // 获取 acquisition 数据
        const [utmParams, refererParams] = await Promise.all([
          getUtmFromCookieStore(),
          getRefererFromCookieStore(),
        ]);
        // 如果有 acquisition 数据，更新到数据库
        if (utmParams || refererParams) {
          // const extra = {
          //   ...(userProfile.extra as UserProfileExtra),
          //   acquisition: {
          //     ...(utmParams ? { utm: utmParams } : {}),
          //     ...(refererParams ? { referer: refererParams } : {}),
          //   },
          // };
          // await prisma.userProfile.update({
          //   where: { userId },
          //   data: { extra },
          // });
          await mergeExtra({
            tableName: "UserProfile",
            extra: {
              acquisition: {
                ...(utmParams ? { utm: utmParams } : {}),
                ...(refererParams ? { referer: refererParams } : {}),
              },
            },
            id: userProfile.id,
          });
        }
      } catch (error) {
        authLogger.error(`Error recording acquisition: ${(error as Error).message}`);
      }
      trackUserServerSide({
        userId: userId,
        traitTypes: ["profile", "clientInfo"],
      });
    })(),
  );
}

/**
 * 迁移阶段，在更新 lastLogin, onboarding, extra 的时候，需要先调用 upsertUserProfile
 * 一段时间已有，当所有用户都在创建的时候有了 profile，这部分可以删除
 */
export async function upsertUserProfile({ userId }: { userId: number }) {
  const profile = await prisma.$transaction(async (tx) => {
    let profile = await tx.userProfile.findUnique({
      where: { userId },
    });
    if (profile) {
      return profile;
    }
    const {
      lastLogin,
      extra: { onboarding, ...extra },
    } = await tx.user
      .findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, lastLogin: true, extra: true },
      })
      .then(({ extra, ...user }) => ({ ...user, extra: extra as DeprecatedUserExtra }));
    profile = await tx.userProfile.create({
      data: {
        userId,
        lastLogin: lastLogin ?? {},
        onboarding: onboarding ?? {},
        extra: extra ?? {},
      },
    });
    // 清空 user 上的 lastLogin, onboarding, extra
    await tx.user.update({
      where: { id: userId },
      data: { lastLogin: {}, extra: {} },
    });
    return profile;
  });
  return profile;
}

export async function createPersonalUser({
  email,
  password,
  emailVerified,
}: {
  email: string;
  password?: string;
  emailVerified?: Date;
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

  // 注册赠送 1_000_000 tokens
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

  recordLastLogin({ userId: user.id, provider: "email-password" });
  recordAcquisition({ userId: user.id });
  // ⚠️ 因为要等到 acquisition 信息完整以后才能 track, trackUserServerSide 在 recordAcquisition 里进行
  // trackUserServerSide({});

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

  recordLastLogin({ userId: teamUser.id, provider: "team-switch" });

  return teamUser as Omit<User, "teamIdAsMember" | "personalUserId"> & {
    teamIdAsMember: number;
    personalUserId: number;
  };
}
