import "server-only";

import { UserSubscriptionExtra, UserSubscription as UserSubscriptionPrisma } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

type UserSubscription = Omit<UserSubscriptionPrisma, "extra"> & {
  extra: UserSubscriptionExtra;
};

export async function fetchActiveSubscription({ userId }: { userId: number }): Promise<
  (
    | {
        activeSubscription: UserSubscription;
        planExpiresAt: Date;
      }
    | {
        activeSubscription: null;
        planExpiresAt: null;
      }
  ) & {
    stripeSubscriptionId: string | null;
  }
> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const filterUserOrTeam = user.teamIdAsMember
    ? {
        user: {
          teamIdAsMember: {
            equals: user.teamIdAsMember,
          },
        },
      }
    : { userId };

  const now = new Date();
  const activeSubscription = (await prisma.userSubscription.findFirst({
    where: {
      ...filterUserOrTeam,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: {
      endsAt: "desc",
    },
  })) as UserSubscription | null;

  let planExpiresAt: Date | null = null;
  let stripeSubscriptionId: string | null = null;

  if (!activeSubscription) {
    return {
      activeSubscription: null,
      planExpiresAt: null,
      stripeSubscriptionId: null,
    };
  }

  const invoice = activeSubscription.extra?.invoice;
  if (invoice?.parent?.subscription_details) {
    const subscription_details = invoice.parent.subscription_details;
    if (typeof subscription_details.subscription === "string") {
      stripeSubscriptionId = subscription_details.subscription;
    } else {
      stripeSubscriptionId = subscription_details.subscription.id;
    }
  }

  // 如果 activeSubscription 存在，lastSubscription 一定存在，所以可以 throw
  const lastSubscription = (await prisma.userSubscription.findFirstOrThrow({
    where: {
      ...filterUserOrTeam,
      // startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: {
      endsAt: "desc",
    },
  })) as UserSubscription;
  // 不管怎样都计算一下 planExpiresAt，有两种情况，前端需要展示这个字段
  // 1. 非 stripe 订阅，这个字段表示订阅结束日期
  // 2. stripe 订阅，已经自动续费到下一次但取消了，这个字段表示当前订阅一直有效的最后一天
  planExpiresAt = lastSubscription.endsAt;

  return {
    activeSubscription,
    planExpiresAt,
    stripeSubscriptionId,
  };
}
