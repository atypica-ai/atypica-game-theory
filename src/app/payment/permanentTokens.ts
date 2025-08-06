import "server-only";

import { UserTokensLogVerb } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export const ONCE_RECHARGE_TOKENS = 1_000_000;
export const ONCE_RECHARGE_GIFT = 1_000_000;

export async function recharge1MTokens({
  userId,
  paymentRecordId,
}: {
  userId: number;
  paymentRecordId: number;
}) {
  const rechargeAmount = ONCE_RECHARGE_TOKENS;
  const giftAmount = ONCE_RECHARGE_GIFT;
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
