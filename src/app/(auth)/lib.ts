import "server-only";

import { getRequestClientIp, getRequestUserAgent } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";
import { hash } from "bcryptjs";

export const authClientInfo = async () => {
  const lastLogin = {
    timestamp: Date.now(),
    clientIp: await getRequestClientIp(),
    userAgent: await getRequestUserAgent(),
  };

  return lastLogin;
};

export async function createUser({
  email,
  password,
  emailVerified,
}: {
  email: string;
  password?: string;
  emailVerified?: Date;
}) {
  email = email.toLowerCase();

  const hashedPassword = password ? await hash(password, 10) : "";
  const lastLogin = await authClientInfo();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...user } = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      lastLogin,
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
      },
    });
  });

  return user;
}
