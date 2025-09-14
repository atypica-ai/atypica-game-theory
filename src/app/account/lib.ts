import "server-only";

import { Subscription, UserType } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

type ActiveSubscriptionResponseData = (
  | {
      activeSubscription: Subscription;
      planExpiresAt: Date;
    }
  | {
      activeSubscription: null;
      planExpiresAt: null;
    }
) & {
  stripeSubscriptionId: string | null;
  userType: UserType;
};

export async function fetchActiveSubscription(args: {
  userId: number;
}): Promise<ActiveSubscriptionResponseData>;
export async function fetchActiveSubscription(args: {
  teamId: number;
}): Promise<ActiveSubscriptionResponseData>;

export async function fetchActiveSubscription({
  teamId,
  userId,
}: {
  teamId?: number;
  userId?: number;
}): Promise<ActiveSubscriptionResponseData> {
  let filterUserOrTeam: { userId: number } | { teamId: number };
  let userType: UserType;

  if (teamId) {
    userType = "TeamMember";
    filterUserOrTeam = { teamId };
  } else if (userId) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    userType = user.teamIdAsMember ? "TeamMember" : "Personal";
    filterUserOrTeam = user.teamIdAsMember ? { teamId: user.teamIdAsMember } : { userId };
  } else {
    throw new Error("Either teamId or userId must be provided");
  }

  const now = new Date();
  const activeSubscription = (await prisma.subscription.findFirst({
    where: {
      ...filterUserOrTeam,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: {
      endsAt: "desc",
    },
  })) as Subscription | null;

  let planExpiresAt: Date | null = null;
  let stripeSubscriptionId: string | null = null;

  if (!activeSubscription) {
    return {
      activeSubscription: null,
      planExpiresAt: null,
      stripeSubscriptionId: null,
      userType,
    };
  }

  if (activeSubscription.stripeSubscriptionId) {
    stripeSubscriptionId = activeSubscription.stripeSubscriptionId;
  }

  // 如果 activeSubscription 存在，lastSubscription 一定存在，所以可以 throw
  const lastSubscription = (await prisma.subscription.findFirstOrThrow({
    where: {
      ...filterUserOrTeam,
      // startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: {
      endsAt: "desc",
    },
  })) as Subscription;
  // 不管怎样都计算一下 planExpiresAt，有两种情况，前端需要展示这个字段
  // 1. 非 stripe 订阅，这个字段表示订阅结束日期
  // 2. stripe 订阅，已经自动续费到下一次但取消了，这个字段表示当前订阅一直有效的最后一天
  planExpiresAt = lastSubscription.endsAt;

  return {
    activeSubscription,
    planExpiresAt,
    stripeSubscriptionId,
    userType,
  };
}
