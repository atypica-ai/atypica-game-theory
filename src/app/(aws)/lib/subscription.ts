import "server-only";

import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { checkCustomerSubscription } from "./entitlement";

const logger = rootLogger.child({ module: "aws-subscription-sync" });

/**
 * Sync AWS subscription expiration date to database
 *
 * This function:
 * 1. Fetches subscription info from AWS Entitlement API
 * 2. Updates Subscription.endsAt in database
 * 3. Updates TokensAccount.monthlyResetAt in database
 *
 * @param customerIdentifier - AWS customer identifier
 * @param teamId - Team ID to sync subscription for
 * @returns Promise<void>
 */
export async function syncAwsSubscriptionExpiration({
  customerIdentifier,
  teamId,
}: {
  customerIdentifier: string;
  teamId: number;
}): Promise<void> {
  logger.info({
    msg: "Syncing AWS subscription expiration",
    customerIdentifier,
    teamId,
  });

  // Fetch subscription info from AWS
  const awsSubscription = await checkCustomerSubscription(customerIdentifier);

  // Only sync if subscription is active and has expiration date
  if (!awsSubscription.active || !awsSubscription.expiresAt) {
    logger.warn({
      msg: "AWS subscription is not active or has no expiration date",
      customerIdentifier,
      teamId,
      active: awsSubscription.active,
      hasExpiresAt: !!awsSubscription.expiresAt,
    });
    return;
  }

  const expiresAt = awsSubscription.expiresAt;

  // Find the team's subscription
  const subscription = await prisma.subscription.findFirst({
    where: { teamId },
  });

  if (!subscription) {
    logger.error({
      msg: "Subscription not found for team",
      customerIdentifier,
      teamId,
    });
    return;
  }

  // Update Subscription.endsAt and TokensAccount.monthlyResetAt
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { endsAt: expiresAt },
    }),
    prisma.tokensAccount.update({
      where: { teamId },
      data: { monthlyResetAt: expiresAt },
    }),
  ]);

  logger.info({
    msg: "AWS subscription expiration synced",
    customerIdentifier,
    teamId,
    expiresAt,
  });
}
