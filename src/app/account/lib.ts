import "server-only";

import { UserSubscriptionExtra, UserSubscription as UserSubscriptionPrisma } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

type UserSubscription = Omit<UserSubscriptionPrisma, "extra"> & {
  extra: UserSubscriptionExtra;
};

export async function fetchActiveUserSubscription({ userId }: { userId: number }): Promise<{
  activeSubscription: UserSubscription | null;
  planExpiresAt: Date | null;
  stripeSubscriptionId: string | null;
}> {
  const now = new Date();
  const activeSubscription = (await prisma.userSubscription.findFirst({
    where: {
      userId,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: {
      endsAt: "desc",
    },
  })) as UserSubscription | null;

  let planExpiresAt: Date | null = null;
  let stripeSubscriptionId: string | null = null;

  const invoice = activeSubscription?.extra?.invoice;
  if (invoice?.parent?.subscription_details) {
    const subscription_details = invoice.parent.subscription_details;
    if (typeof subscription_details.subscription === "string") {
      stripeSubscriptionId = subscription_details.subscription;
    } else {
      stripeSubscriptionId = subscription_details.subscription.id;
    }
  }

  if (!stripeSubscriptionId) {
    const lastSubscription = (await prisma.userSubscription.findFirst({
      where: {
        userId,
        // startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: {
        endsAt: "desc",
      },
    })) as UserSubscription | null;
    planExpiresAt = lastSubscription?.endsAt || null;
  }

  return {
    activeSubscription,
    planExpiresAt,
    stripeSubscriptionId,
  };
}
