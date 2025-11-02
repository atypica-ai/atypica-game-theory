import "server-only";

import { ProductName } from "@/app/payment/data";
import { resetTeamMonthlyTokens, resetUserMonthlyTokens } from "@/app/payment/monthlyTokens";
import { recharge1MTokens } from "@/app/payment/permanentTokens";
import { trackUserServerSide } from "@/lib/analytics/server";
import { PaymentRecord, SubscriptionPlan } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";
import { retrieveStripeSubscriptionDetails } from "./utils";

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

  const { stripeSubscriptionId, planStartsAt, planEndsAt } =
    await retrieveStripeSubscriptionDetails({
      invoice: invoiceData,
    });

  // Create team subscription record
  await prisma.subscription.create({
    data: {
      userId,
      teamId,
      plan: SubscriptionPlan.team,
      startsAt: planStartsAt,
      endsAt: planEndsAt,
      paymentRecordId: paymentRecord.id,
      stripeSubscriptionId,
    },
  });

  // Reset team monthly tokens
  await resetTeamMonthlyTokens({ teamId });

  // team user 暂时不 track
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
  }
  // track user
  waitUntil(
    trackUserServerSide({
      userId,
      traitTypes: ["revenue"],
    }).catch(() => {}),
  );
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
  // track user
  waitUntil(
    trackUserServerSide({
      userId,
      traitTypes: ["revenue"],
    }).catch(() => {}),
  );
}
