import { MarketplaceEntitlementService } from "@aws-sdk/client-marketplace-entitlement-service";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";

const logger = rootLogger.child({ module: "aws-marketplace-entitlement" });

const entitlementClient = new MarketplaceEntitlementService({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Get all entitlements for a customer
 */
export async function getCustomerEntitlements(customerIdentifier: string) {
  logger.info({ msg: "Getting customer entitlements", customerIdentifier });

  const response = await entitlementClient.getEntitlements({
    ProductCode: process.env.AWS_MARKETPLACE_PRODUCT_CODE!,
    Filter: {
      CUSTOMER_IDENTIFIER: [customerIdentifier],
    },
  });

  logger.info({
    msg: "Customer entitlements retrieved",
    customerIdentifier,
    entitlementsCount: response.Entitlements?.length || 0,
  });

  return response.Entitlements || [];
}

/**
 * Check customer subscription status and entitlements
 */
export async function checkCustomerSubscription(customerIdentifier: string) {
  const entitlements = await getCustomerEntitlements(customerIdentifier);

  if (entitlements.length === 0) {
    logger.info({ msg: "No active entitlements", customerIdentifier });
    return { active: false, plan: null, quantity: 0 };
  }

  // Assuming dimension is "team_plan"
  const teamPlan = entitlements.find((e) => e.Dimension === "team_plan");

  const result = {
    active: true,
    plan: teamPlan?.Dimension || null,
    quantity: teamPlan?.Value?.IntegerValue || 3,
    expiresAt: teamPlan?.ExpirationDate,
  };

  logger.info({
    msg: "Customer subscription checked",
    customerIdentifier,
    ...result,
  });

  return result;
}

/**
 * Sync customer subscription status to database
 */
export async function syncCustomerSubscription(customerIdentifier: string) {
  logger.info({ msg: "Syncing customer subscription", customerIdentifier });

  const subscription = await checkCustomerSubscription(customerIdentifier);

  const awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
    where: { customerIdentifier },
  });

  if (!awsCustomer) {
    logger.error({ msg: "Customer not found in database", customerIdentifier });
    throw new Error("Customer not found");
  }

  await prisma.aWSMarketplaceCustomer.update({
    where: { id: awsCustomer.id },
    data: {
      status: subscription.active ? "active" : "expired",
      dimension: subscription.plan,
      quantity: subscription.quantity,
      expiresAt: subscription.expiresAt,
    },
  });

  logger.info({ msg: "Customer subscription synced", customerIdentifier });

  return subscription;
}
