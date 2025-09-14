import "server-only";

import { rootLogger } from "@/lib/logging";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "@/lib/request/headers";
import { Team, User, UserLastLogin } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
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
    new Promise(async (resolve) => {
      try {
        const clientInfo = await authClientInfo();
        await prisma.user.update({
          where: { id: userId },
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
      resolve(null);
    }),
  );
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...user } = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      emailVerified: emailVerified ?? null,
    },
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
    await tx.tokensAccount.create({
      data: {
        userId: user.id,
        permanentBalance: signupAmount,
        monthlyBalance: 0,
      },
    });
  });

  recordLastLogin({ userId: user.id, provider: "email-password" });

  return { ...user, email } as Omit<User, "email"> & { email: string };
}

export async function createTeamMemberUser({
  personalUser,
  teamAsMember,
}: {
  personalUser: Pick<User, "id" | "name">;
  teamAsMember: Pick<Team, "id">;
}) {
  const teamUser = await prisma.user.create({
    data: {
      name: personalUser.name,
      email: null,
      password: "", // 没有密码
      teamIdAsMember: teamAsMember.id,
      personalUserId: personalUser.id,
    },
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
