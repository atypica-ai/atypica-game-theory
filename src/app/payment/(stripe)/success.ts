import "server-only";

import { ProductName } from "@/app/payment/data";
import { resetTeamMonthlyTokens, resetUserMonthlyTokens } from "@/app/payment/monthlyTokens";
import { recharge1MTokens } from "@/app/payment/permanentTokens";
import { trackUserServerSide } from "@/lib/analytics/server";
import { trackToltPayment } from "@/lib/analytics/tolt/lib";
import { PaymentRecord, SubscriptionExtra, SubscriptionPlan } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";
import { retrieveStripeSubscriptionDetails } from "./utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryGetChargeFromInvoice(invoiceData: any): string {
  // Track Tolt payment
  const chargeId = typeof invoiceData.charge === "string" ? invoiceData.charge : invoiceData.id;
  return chargeId as string;
}

export async function handleTeamSubscriptionPaymentSuccess({
  paymentRecord,
  productName,
  invoiceData,
}: {
  paymentRecord: PaymentRecord;
  productName: ProductName.TEAMSEAT1MONTH | ProductName.SUPERTEAMSEAT1MONTH;
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

  const { stripeSubscriptionId, planStartsAt, planEndsAt } =
    await retrieveStripeSubscriptionDetails({
      invoice: invoiceData,
    });

  // Create team subscription record with seats in extra
  // Note: team.seats will be updated when subscription becomes active (in resetTeamMonthlyTokens)
  const plan =
    productName === ProductName.SUPERTEAMSEAT1MONTH
      ? SubscriptionPlan.superteam
      : SubscriptionPlan.team;

  await prisma.subscription.create({
    data: {
      userId,
      teamId,
      plan,
      startsAt: planStartsAt,
      endsAt: planEndsAt,
      paymentRecordId: paymentRecord.id,
      stripeSubscriptionId,
      extra: { seats: quantity } satisfies SubscriptionExtra,
    },
  });

  // Reset team monthly tokens
  await resetTeamMonthlyTokens({ teamId });

  // Track Tolt payment, team user 暂时不 track
  // const chargeId = tryGetChargeFromInvoice(invoiceData);
  // waitUntil(trackToltPayment({ userId, paymentRecord, productName, chargeId }));

  // team user 暂时不 track analytics
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
      `User is a member of a team, but received a success paymentRecord ${paymentRecord.id} for a personal subscription`,
    );
  }

  if (productName === ProductName.PRO1MONTH) {
    const { stripeSubscriptionId, planStartsAt, planEndsAt } =
      await retrieveStripeSubscriptionDetails({
        invoice: invoiceData,
      });
    await prisma.subscription.create({
      data: {
        userId,
        plan: SubscriptionPlan.pro,
        startsAt: planStartsAt,
        endsAt: planEndsAt,
        paymentRecordId: paymentRecord.id,
        stripeSubscriptionId,
      },
    });
    // reset monthly tokens
    await resetUserMonthlyTokens({ userId });
  } else if (productName === ProductName.MAX1MONTH) {
    const { stripeSubscriptionId, planStartsAt, planEndsAt } =
      await retrieveStripeSubscriptionDetails({
        invoice: invoiceData,
      });
    await prisma.subscription.create({
      data: {
        userId,
        plan: SubscriptionPlan.max,
        startsAt: planStartsAt,
        endsAt: planEndsAt,
        paymentRecordId: paymentRecord.id,
        stripeSubscriptionId,
      },
    });
    // reset monthly tokens
    await resetUserMonthlyTokens({ userId });
  } else if (productName === ProductName.SUPER1MONTH) {
    const { stripeSubscriptionId, planStartsAt, planEndsAt } =
      await retrieveStripeSubscriptionDetails({
        invoice: invoiceData,
      });
    await prisma.subscription.create({
      data: {
        userId,
        plan: SubscriptionPlan.super,
        startsAt: planStartsAt,
        endsAt: planEndsAt,
        paymentRecordId: paymentRecord.id,
        stripeSubscriptionId,
      },
    });
    // reset monthly tokens (will set unlimitedTokens flag in extra)
    await resetUserMonthlyTokens({ userId });
  }

  // Track Tolt payment
  const chargeId = tryGetChargeFromInvoice(invoiceData);
  waitUntil(trackToltPayment({ userId, paymentRecord, productName, chargeId }));

  // track user
  trackUserServerSide({
    userId,
    traitTypes: ["revenue"],
  }).catch(() => {});
}

export async function handleRechargePaymentSuccess({
  paymentRecord,
  productName,
  invoiceData,
}: {
  paymentRecord: PaymentRecord;
  productName: ProductName;
  invoiceData: Stripe.Invoice;
}) {
  const userId = paymentRecord.userId;
  if (productName === ProductName.TOKENS1M) {
    // recharge 1M tokens
    await recharge1MTokens({ userId, paymentRecordId: paymentRecord.id });
  } else {
    throw new Error(`Invalid product name ${productName} received in handleRechargePaymentSuccess`);
  }

  // Track Tolt payment
  const chargeId = tryGetChargeFromInvoice(invoiceData);
  waitUntil(trackToltPayment({ userId, paymentRecord, productName, chargeId }));

  // track user
  trackUserServerSide({
    userId,
    traitTypes: ["revenue"],
  }).catch(() => {});
}
