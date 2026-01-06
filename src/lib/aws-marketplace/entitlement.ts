import { MarketplaceEntitlementService } from "@aws-sdk/client-marketplace-entitlement-service";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { getAwsCredentials, getProductCode, AWS_MARKETPLACE_CONFIG } from "@/config/aws-marketplace";
import {
  CustomerSubscription,
  ActiveCustomerSubscription,
  SubscriptionDimension,
  isActiveSubscription,
} from "@/lib/aws-marketplace/types";

const logger = rootLogger.child({ module: "aws-marketplace-entitlement" });

const entitlementClient = new MarketplaceEntitlementService({
  region: AWS_MARKETPLACE_CONFIG.REGION,
  credentials: getAwsCredentials(),
});

/**
 * Get all entitlements for a customer
 */
export async function getCustomerEntitlements(customerIdentifier: string) {
  logger.info({ msg: "Getting customer entitlements", customerIdentifier });

  const response = await entitlementClient.getEntitlements({
    ProductCode: getProductCode(),
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
 *
 * @param customerIdentifier - AWS customer identifier
 * @returns Customer subscription information
 */
export async function checkCustomerSubscription(
  customerIdentifier: string
): Promise<CustomerSubscription> {
  const entitlements = await getCustomerEntitlements(customerIdentifier);

  if (entitlements.length === 0) {
    logger.info({ msg: "No active entitlements", customerIdentifier });
    return {
      active: false,
      plan: null,
      quantity: AWS_MARKETPLACE_CONFIG.DEFAULT_QUANTITY,
    };
  }

  // Find the team plan entitlement
  const teamPlan = entitlements.find((e) => e.Dimension === AWS_MARKETPLACE_CONFIG.DEFAULT_DIMENSION);

  const result: CustomerSubscription = {
    active: true,
    plan: (teamPlan?.Dimension as SubscriptionDimension) || null,
    quantity: teamPlan?.Value?.IntegerValue || AWS_MARKETPLACE_CONFIG.DEFAULT_QUANTITY,
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
 *
 * @param customerIdentifier - AWS customer identifier
 * @returns Updated customer subscription information
 */
export async function syncCustomerSubscription(
  customerIdentifier: string
): Promise<CustomerSubscription> {
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
      expiresAt: subscription.expiresAt || null,
    },
  });

  logger.info({ msg: "Customer subscription synced", customerIdentifier });

  return subscription;
}
