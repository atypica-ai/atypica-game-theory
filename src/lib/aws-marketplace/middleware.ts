import { prisma } from "@/prisma/prisma";
import { auth } from "next-auth/react";
import { rootLogger } from "@/lib/logging";

const logger = rootLogger.child({ module: "aws-marketplace-middleware" });

export async function checkAWSMarketplaceSubscription() {
  const session = await auth();

  if (!session?.user?.id) {
    logger.info({ msg: "User not authenticated" });
    return { hasAccess: false, reason: "not_authenticated" };
  }

  // Check if user is an AWS Marketplace customer
  const awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
    where: { userId: parseInt(session.user.id) },
  });

  if (!awsCustomer) {
    // Not an AWS Marketplace customer - might be subscribed through other channels
    logger.info({ msg: "Not an AWS Marketplace customer", userId: session.user.id });
    return { hasAccess: true, reason: "not_aws_customer" };
  }

  // Check subscription status
  if (awsCustomer.status !== "active") {
    logger.info({
      msg: "AWS subscription inactive",
      userId: session.user.id,
      status: awsCustomer.status,
    });
    return { hasAccess: false, reason: "subscription_inactive" };
  }

  // Check if subscription has expired
  if (awsCustomer.expiresAt && awsCustomer.expiresAt < new Date()) {
    logger.info({
      msg: "AWS subscription expired",
      userId: session.user.id,
      expiresAt: awsCustomer.expiresAt,
    });
    return { hasAccess: false, reason: "subscription_expired" };
  }

  logger.info({
    msg: "AWS subscription valid",
    userId: session.user.id,
    plan: awsCustomer.dimension,
  });

  return {
    hasAccess: true,
    subscription: {
      plan: awsCustomer.dimension,
      quantity: awsCustomer.quantity,
      expiresAt: awsCustomer.expiresAt,
    },
  };
}
