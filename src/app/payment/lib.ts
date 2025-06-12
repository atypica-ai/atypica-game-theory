import "server-only";

import { ProductName } from "@/app/payment/data";
import { PaymentRecord, SubscriptionPlan, UserTokensLogVerb } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";

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
async function resetMonthlyTokens({ userId }: { userId: number }) {
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
  const activeSubscription = await prisma.userSubscription.findFirst({
    where: {
      userId,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: { endsAt: "desc" },
  });
  if (!activeSubscription) {
    // 当前没有生效中的订阅
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
    // // reset monthly tokens
    // await resetMonthly2MTokens({ userId, paymentRecordId: paymentRecord.id });
    let planStartsAt = new Date();
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: { userId },
      orderBy: { endsAt: "desc" },
    });
    if (existingSubscription?.endsAt && existingSubscription.endsAt > planStartsAt) {
      planStartsAt = existingSubscription.endsAt;
    }
    const planEndsAt = new Date(planStartsAt.getTime() + 31 * 86400 * 1000); // 有效期 31 天。
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
    let planStartsAt = new Date();
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: { userId },
      orderBy: { endsAt: "desc" },
    });
    if (existingSubscription?.endsAt && existingSubscription.endsAt > planStartsAt) {
      planStartsAt = existingSubscription.endsAt;
    }
    const planEndsAt = new Date(planStartsAt.getTime() + 31 * 86400 * 1000); // 有效期 31 天。
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
