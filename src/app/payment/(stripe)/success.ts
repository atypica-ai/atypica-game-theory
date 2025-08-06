import "server-only";

import { ProductName } from "@/app/payment/data";
import { resetTeamMonthlyTokens, stripeClient } from "@/app/payment/lib";
import { rootLogger } from "@/lib/logging";
import { PaymentRecord } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";

async function calculateTeamPlanStartEnd({
  teamId,
  invoice,
}: {
  teamId: number; // 只用于 logger
  invoice: Stripe.Invoice;
}): Promise<{
  planStartsAt: Date;
  planEndsAt: Date;
}> {
  const subscription_details = invoice.parent?.subscription_details;
  if (!subscription_details) {
    rootLogger.error({ msg: "subscription details missing on invoice", teamId });
    throw new Error("Subscription details missing on invoice");
  }

  let stripeSubscriptionId: string;
  if (typeof subscription_details.subscription === "string") {
    stripeSubscriptionId = subscription_details.subscription;
  } else {
    stripeSubscriptionId = subscription_details.subscription.id;
  }

  const stripe = stripeClient();
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const stripeSubscriptionItem = stripeSubscription.items.data[0];
  if (!stripeSubscriptionItem) {
    throw new Error(
      `Subscription item not found on stripe subscription ${stripeSubscriptionId} for team ${teamId}`,
    );
  }
  const planStartsAt = new Date(stripeSubscriptionItem.current_period_start * 1000);
  const planEndsAt = new Date(stripeSubscriptionItem.current_period_end * 1000);

  return {
    planStartsAt,
    planEndsAt,
  };
}

export async function handleTeamSubscriptionPaymentSuccess({
  paymentRecord,
  productName,
  invoiceData,
}: {
  paymentRecord: PaymentRecord;
  productName: ProductName.TEAMSEAT1MONTH;
  invoiceData: Stripe.Invoice;
}) {
  const quantity = invoiceData.lines.data[0]?.quantity;
  if (!quantity) {
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

  const { planStartsAt, planEndsAt } = await calculateTeamPlanStartEnd({
    teamId,
    invoice: invoiceData,
  });

  // Create team subscription record using UserSubscription
  await prisma.userSubscription.create({
    data: {
      userId,
      plan: "team",
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
