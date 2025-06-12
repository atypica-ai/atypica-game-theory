import { resetMonthlyTokens } from "@/app/payment/lib";
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
async function fetchLastUserSubscription() {
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

  // TODO: 现在比较粗糙的在每次打开 account 页面的时候 reset 一下
  // 需要改成定时调用
  // 同时注意下 reset 操作和研究过程中的 consume 操作的写冲突可能性
  await resetMonthlyTokens({ userId: session.user.id });

  const userTokens = await fetchUserTokens();
  const subscription = await fetchLastUserSubscription();

  return <AccountPageClient userTokens={userTokens} subscription={subscription} />;
}
