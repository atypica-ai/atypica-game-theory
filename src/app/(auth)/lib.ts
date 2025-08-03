import "server-only";

import { rootLogger } from "@/lib/logging";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "@/lib/request/headers";
import { Team, User, UserLastLogin } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { hash } from "bcryptjs";

export const authLogger = rootLogger.child({ api: "next-auth" });

export const authClientInfo = async (): Promise<UserLastLogin> => {
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

export function recordLastLogin(userId: number) {
  // 后台运行，不要 await
  waitUntil(
    new Promise(async (resolve) => {
      try {
        const lastLogin = await authClientInfo();
        await prisma.user.update({
          where: { id: userId },
          data: { lastLogin },
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
    await tx.userTokensLog.create({
      data: {
        userId: user.id,
        verb: "signup",
        value: signupAmount,
      },
    });
    await tx.userTokens.create({
      data: {
        userId: user.id,
        permanentBalance: signupAmount,
        monthlyBalance: 0,
      },
    });
  });

  recordLastLogin(user.id);

  return { ...user, email } as Omit<User, "email"> & { email: string };
}

export async function createTeamMemberUser({
  personalUser,
  teamAsMember,
}: {
  personalUser: User;
  teamAsMember: Team;
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

  await prisma.userTokens.create({
    data: {
      userId: teamUser.id,
      permanentBalance: 0,
      monthlyBalance: 0,
    },
  });

  recordLastLogin(teamUser.id);

  return teamUser;
}
