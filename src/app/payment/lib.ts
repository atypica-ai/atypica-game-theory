import "server-only";

import { fetchActiveUserSubscription } from "@/app/account/lib";
import { ProductName } from "@/app/payment/data";
import { rootLogger } from "@/lib/logging";
import { PaymentRecord, SubscriptionPlan, UserTokensLogVerb } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";

const globalForStripe = global as unknown as {
  stripe: Stripe | undefined;
};
export const stripeClient = () => {
  if (!globalForStripe.stripe) {
    globalForStripe.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return globalForStripe.stripe;
};

async function recharge1MTokens({
  userId,
  paymentRecordId,
}: {
  userId: number;
  paymentRecordId: number;
}) {
  const rechargeAmount = 1_000_000;
  const giftAmount = 1_000_000;
  await prisma.$transaction(async (tx) => {
    await tx.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.recharge,
        resourceType: "PaymentRecord",
        resourceId: paymentRecordId,
        value: rechargeAmount,
      },
    });
    await tx.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.gift,
        resourceType: "PaymentRecord",
        resourceId: paymentRecordId,
        value: giftAmount,
      },
    });
    await tx.userTokens.update({
      where: { userId },
      data: {
        permanentBalance: {
          increment: rechargeAmount + giftAmount,
        },
      },
    });
  });
}

/**
 * 定期调用，找到当前生效的套餐，如果生效时间 > userTokens 上的重置余额时间，就重置余额并更新重置时间
 */
export async function resetMonthlyTokens({ userId }: { userId: number }) {
  const now = new Date();

  let userTokens = await prisma.userTokens.upsert({
    where: { userId },
    create: { userId }, // 默认 permanentBalance 和 monthlyBalance 都是 0
    update: {},
  });

  if (userTokens.monthlyResetAt && userTokens.monthlyResetAt > now) {
    // 当前的 monthlyBalance 还在生效中，结束
    return;
  }

  // 此时满足 userTokens.monthlyResetAt === null || userTokens.monthlyResetAt && userTokens.monthlyResetAt <= now
  // 重置 monthlyBalance 和 monthlyResetAt

  await prisma.$transaction(async (tx) => {
    // 如果余额大于 0，创建一个 userTokensLog 记录，扣除剩余余额
    const rest = userTokens.monthlyBalance;
    if (rest > 0) {
      await tx.userTokensLog.create({
        data: {
          userId: userId,
          verb: UserTokensLogVerb.subscription,
          value: -rest,
        },
      });
    }
    // 如果 monthlyBalance < 0，保留
    userTokens = await tx.userTokens.update({
      where: { userId },
      data: {
        monthlyBalance: { decrement: rest },
        monthlyResetAt: null,
      },
    });
  });

  // now 在 [startsAt, endsAt) 的区间内，理应只有一个，所以 orderBy 和 findFirst 都其实没意义
  const { activeSubscription } = await fetchActiveUserSubscription({ userId });
  if (!activeSubscription) {
    // 当前没有生效中的订阅
    return;
  }
  if (activeSubscription.createdAt < new Date(1749865000000)) {
    // TODO: 这个在一个月以后（2025-07-15）去掉，即 2025-06-14 09:30 之前的 subscription 都已经过期了
    // 在 2025-06-14 09:30 之前的 tokens 都被加到了 permanentBalance 里，在此时间之后的才加入到 monthlyBalance
    return;
  }

  let rechargeAmount;
  let giftAmount;
  if (activeSubscription.plan === SubscriptionPlan.pro) {
    rechargeAmount = 2_000_000;
    giftAmount = 1_000_000;
  } else if (activeSubscription.plan === SubscriptionPlan.max) {
    rechargeAmount = 5_000_000;
    giftAmount = 3_000_000;
  } else {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.subscription,
        resourceType: "UserSubscription",
        resourceId: activeSubscription.id,
        value: rechargeAmount,
      },
    });
    await tx.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.gift,
        resourceType: "UserSubscription",
        resourceId: activeSubscription.id,
        value: giftAmount,
      },
    });
    // 注意！这里也是 balance.increment，如果之前研究过程中把 monthlyBalance 扣减到负数了，这里余额不满
    await tx.userTokens.update({
      where: { userId },
      data: {
        monthlyBalance: {
          increment: rechargeAmount + giftAmount,
        },
        monthlyResetAt: activeSubscription.endsAt,
      },
    });
  });
}

async function calculatePlanStartEnd({
  userId,
  invoice,
}: {
  userId: number;
  invoice?: Stripe.Invoice;
}): Promise<{
  planStartsAt: Date;
  planEndsAt: Date;
}> {
  let planStartsAt = new Date();
  const existingSubscription = await prisma.userSubscription.findFirst({
    where: { userId },
    orderBy: { endsAt: "desc" },
  });
  if (existingSubscription?.endsAt && existingSubscription.endsAt > planStartsAt) {
    planStartsAt = existingSubscription.endsAt;
  }

  let planEndsAt = new Date(planStartsAt.getTime() + 31 * 86400 * 1000); // 有效期 31 天。

  if (invoice?.parent?.subscription_details) {
    let stripeSubscriptionId: string | null = null;
    const subscription_details = invoice.parent.subscription_details;
    if (typeof subscription_details.subscription === "string") {
      stripeSubscriptionId = subscription_details.subscription;
    } else {
      stripeSubscriptionId = subscription_details.subscription.id;
    }
    try {
      const stripe = stripeClient();
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const stripeSubscriptionItem = stripeSubscription.items.data[0];
      if (!stripeSubscriptionItem) {
        throw new Error(
          `Subscription item not found on stripe subscription ${stripeSubscriptionId} for user ${userId}`,
        );
      }
      planStartsAt = new Date(stripeSubscriptionItem.current_period_start * 1000);
      planEndsAt = new Date(stripeSubscriptionItem.current_period_end * 1000);
    } catch (error) {
      rootLogger.error(`Failed to retrieve Stripe subscription: ${(error as Error).message}`);
    }
  }

  return {
    planStartsAt,
    planEndsAt,
  };
}

export async function handlePaymentSuccess({
  paymentRecord,
  productName,
  invoiceData,
}: {
  paymentRecord: PaymentRecord;
  productName: ProductName;
  invoiceData?: Stripe.Invoice;
}) {
  const userId = paymentRecord.userId;
  await prisma.userTokens.upsert({
    where: { userId },
    create: { userId }, // 默认 permanentBalance 和 monthlyBalance 都是 0
    update: {},
  });
  if (productName === ProductName.TOKENS1M) {
    // recharge 1M tokens
    await recharge1MTokens({ userId, paymentRecordId: paymentRecord.id });
  } else if (productName === ProductName.PRO1MONTH) {
    const { planStartsAt, planEndsAt } = await calculatePlanStartEnd({
      userId,
      invoice: invoiceData,
    });
    await prisma.userSubscription.create({
      data: {
        userId,
        plan: SubscriptionPlan.pro,
        startsAt: planStartsAt,
        endsAt: planEndsAt,
        extra: {
          paymentRecordId: paymentRecord.id,
          invoice: invoiceData as unknown as InputJsonValue,
        },
      },
    });
    // reset monthly tokens
    await resetMonthlyTokens({ userId });
  } else if (productName === ProductName.MAX1MONTH) {
    const { planStartsAt, planEndsAt } = await calculatePlanStartEnd({
      userId,
      invoice: invoiceData,
    });
    await prisma.userSubscription.create({
      data: {
        userId,
        plan: SubscriptionPlan.max,
        startsAt: planStartsAt,
        endsAt: planEndsAt,
        extra: {
          paymentRecordId: paymentRecord.id,
          invoice: invoiceData as unknown as InputJsonValue,
        },
      },
    });
    // reset monthly tokens
    await resetMonthlyTokens({ userId });
  }
}
