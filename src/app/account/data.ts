import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

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
  const subscription = await prisma.userSubscription.findFirst({
    where: {
      userId,
      endsAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      endsAt: "desc",
    },
  });
  return subscription;
}

export async function fetchPaymentRecords(limit = 10, offset = 0) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return [];
  }

  const userId = session.user.id;
  const payments = await prisma.paymentRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      paymentLines: {
        include: {
          product: true,
        },
      },
    },
  });

  return payments;
}
