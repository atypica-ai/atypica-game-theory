import { authOptions } from "@/lib/auth";
import { UserSubscriptionExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AccountPageClient } from "./AccountPageClient";

async function fetchUserTokens() {
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
export async function fetchLastUserSubscription() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  const userId = session.user.id;
  const now = new Date();
  const subscription = await prisma.userSubscription.findFirst({
    where: {
      userId,
      // startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: {
      endsAt: "desc",
    },
  });
  return subscription
    ? {
        ...subscription,
        extra: subscription.extra as UserSubscriptionExtra,
      }
    : null;
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/account");
  }

  const userTokens = await fetchUserTokens();
  const subscription = await fetchLastUserSubscription();

  return <AccountPageClient userTokens={userTokens} subscription={subscription} />;
}
