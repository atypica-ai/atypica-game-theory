import "server-only";

import { ProductName } from "@/app/payment/data";
import { resetTeamMonthlyTokens, resetUserMonthlyTokens } from "@/app/payment/monthlyTokens";
import { recharge1MTokens } from "@/app/payment/permanentTokens";
import { PaymentRecord, SubscriptionPlan } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";
import { retrievePlanStartEnd } from "./utils";

export async function handleTeamSubscriptionPaymentSuccess({
  paymentRecord,
  // productName,
  invoiceData,
}: {
  paymentRecord: PaymentRecord;
  productName: ProductName.TEAMSEAT1MONTH;
  invoiceData: Stripe.Invoice;
}) {
  const paymentLine = await prisma.paymentLine.findFirstOrThrow({
    where: { paymentRecordId: paymentRecord.id },
  });
  const quantity = invoiceData.lines.data[0]?.quantity;
  if (!quantity || quantity !== paymentLine.quantity) {
    throw new Error(`Invalid quantity on invoice data for paymentRecord ${paymentRecord.id}`);
  }

  const userId = paymentRecord.userId;
  const teamUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  if (!teamUser.teamIdAsMember) {
    throw new Error(
      `User is not a member of a team, but received a success paymentRecord ${paymentRecord.id} for a team subscription`,
    );
  }
  const teamId = teamUser.teamIdAsMember;
  // Update team seats
  await prisma.team.update({
    where: { id: teamId },
    data: { seats: quantity },
  });

  const { planStartsAt, planEndsAt } = await retrievePlanStartEnd({
    invoice: invoiceData,
  });

  // Create team subscription record using UserSubscription
  await prisma.userSubscription.create({
    data: {
      userId,
      plan: SubscriptionPlan.team,
      startsAt: planStartsAt,
      endsAt: planEndsAt,
      extra: {
        paymentRecordId: paymentRecord.id,
        invoice: invoiceData as unknown as InputJsonValue,
      },
    },
  });

  // Reset team monthly tokens
  await resetTeamMonthlyTokens({ teamId });
}

export async function handleUserSubscriptionPaymentSuccess({
  paymentRecord,
  productName,
  invoiceData,
}: {
  paymentRecord: PaymentRecord;
  productName: ProductName;
  invoiceData: Stripe.Invoice;
}) {
  const userId = paymentRecord.userId;
  const personalUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  if (personalUser.teamIdAsMember) {
    throw new Error(
      `User is not a member of a team, but received a success paymentRecord ${paymentRecord.id} for a personal subscription`,
    );
  }

  if (productName === ProductName.PRO1MONTH) {
    const { planStartsAt, planEndsAt } = await retrievePlanStartEnd({
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
    await resetUserMonthlyTokens({ userId });
  } else if (productName === ProductName.MAX1MONTH) {
    // 无需再处理升级的情况，现在 createProToMaxInvoice 里直接处理好了
    // const { activeSubscription, stripeSubscriptionId } = await fetchActiveSubscription({
    //   userId,
    // });
    // // 如果当前套餐是 pro，则升级，否则只是简单的延长套餐
    // if (
    //   activeSubscription &&
    //   activeSubscription.plan === SubscriptionPlan.pro &&
    //   !(activeSubscription.createdAt < new Date(1749865000000))
    //   // TODO: 这个在一个月以后（2025-07-15）去掉，即 2025-06-14 09:30 之前的 subscription 都已经过期了
    //   // 在 2025-06-14 09:30 之前的 tokens 都被加到了 permanentBalance 里，在此时间之后的才加入到 monthlyBalance
    // ) {
    //   let userTokens = await prisma.userTokens.findUniqueOrThrow({
    //     where: { userId },
    //   });
    //   if (!userTokens.monthlyResetAt) {
    //     throw new Error(`Active subscription found, but monthlyResetAt value is not set`);
    //   }
    //   if (stripeSubscriptionId) {
    //     const stripe = stripeClient();
    //     try {
    //       await stripe.subscriptions.cancel(stripeSubscriptionId);
    //     } catch (error) {
    //       rootLogger.error(
    //         `Failed to cancel Stripe subscription during upgrade. The process will continue and this error will be ignored, but further investigation is required: ${error}`,
    //       );
    //     }
    //   }
    //   const now = new Date();
    //   now.setMilliseconds(0);
    //   await prisma.userSubscription.update({
    //     where: { id: activeSubscription.id },
    //     data: { endsAt: now },
    //   });
    //   // subscription 取消以后，把 monthlyResetAt 设置成当前时间，resetUserMonthlyTokens 里面会进一步重置
    //   userTokens = await prisma.userTokens.update({
    //     where: { userId },
    //     data: { monthlyResetAt: now },
    //   });
    // }
    // 注意，一定要在前面先取消当前 pro 套餐，然后下面再创建新的 userSubscription，否则 fetchActiveSubscription 会返回新创建的记录
    // 现在一定是 stripe，所以就算是 pro 到 max 的 upgrade，新的套餐时间也是从当前时间开始的，不是从之前的 pro 套餐结束后开始，这符合预期
    const { planStartsAt, planEndsAt } = await retrievePlanStartEnd({
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
    await resetUserMonthlyTokens({ userId });
  }
}

export async function handleRechargePaymentSuccess({
  paymentRecord,
  productName,
}: {
  paymentRecord: PaymentRecord;
  productName: ProductName;
}) {
  const userId = paymentRecord.userId;
  if (productName === ProductName.TOKENS1M) {
    // recharge 1M tokens
    await recharge1MTokens({ userId, paymentRecordId: paymentRecord.id });
  } else {
    throw new Error(`Invalid product name ${productName} received in handleRechargePaymentSuccess`);
  }
}

/*
// 自动续费之前，用户手动续费更新套餐的时候会往后顺延，现在不需要了，直接从 stripe 计算好的 subscription 信息里取

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
*/
