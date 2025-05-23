import "server-only";

import { TDeployRegion } from "@/lib/request/deployRegion";
import { PaymentRecord, SubscriptionPlan, UserTokensLogVerb } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";
import { ProductName } from "../data";

export type StripeMetadata = {
  project: "atypica";
  deployRegion: TDeployRegion;
  orderNo: string;
  productName: ProductName;
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
  await prisma.$transaction([
    prisma.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.recharge,
        resourceType: "PaymentRecord",
        resourceId: paymentRecordId,
        value: rechargeAmount,
      },
    }),
    prisma.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.gift,
        resourceType: "PaymentRecord",
        resourceId: paymentRecordId,
        value: giftAmount,
      },
    }),
    prisma.userTokens.update({
      where: { userId },
      data: {
        balance: {
          increment: rechargeAmount + giftAmount,
        },
      },
    }),
  ]);
}

async function addPlan3MTokens({
  userId,
  paymentRecordId,
}: {
  userId: number;
  paymentRecordId: number;
}) {
  const rechargeAmount = 3_000_000;
  await prisma.$transaction([
    prisma.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.subscription,
        resourceType: "PaymentRecord",
        resourceId: paymentRecordId,
        value: rechargeAmount,
      },
    }),
    prisma.userTokens.update({
      where: { userId },
      data: {
        balance: {
          increment: rechargeAmount,
        },
      },
    }),
  ]);
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
    create: { userId, balance: 0 },
    update: {},
  });
  if (productName === ProductName.TOKENS1M) {
    // recharge 1M tokens
    await recharge1MTokens({ userId, paymentRecordId: paymentRecord.id });
  } else if (productName === ProductName.PRO1MONTH) {
    // recharge for initial 3M tokens
    await addPlan3MTokens({ userId, paymentRecordId: paymentRecord.id });
    // create plan
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
  }
}
