import { authOptions } from "@/lib/auth";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { PlanExtraData } from "../payment/data";

export async function fetchUserTokens() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  const userId = session.user.id;
  const userTokens = await prisma.userTokens.findUnique({
    where: { userId },
  });

  return userTokens;
}

// 返回最后一个 subscription
export async function fetchUserSubscription() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  const userId = session.user.id;
  const now = new Date();
  const subscription = await prisma.userSubscription.findFirst({
    where: {
      userId,
      // startsAt: { lt: now },
      endsAt: { gt: now },
    },
    orderBy: {
      endsAt: "desc",
    },
  });
  return subscription
    ? {
        ...subscription,
        extra: subscription.extra as unknown as PlanExtraData | undefined,
      }
    : null;
}
