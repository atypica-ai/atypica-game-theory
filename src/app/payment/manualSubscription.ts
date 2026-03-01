import "server-only";

import { rootLogger } from "@/lib/logging";
import { Currency, PaymentStatus, SubscriptionExtra, SubscriptionPlan } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { ProductName } from "./data";
import { resetTeamMonthlyTokens, resetUserMonthlyTokens } from "./monthlyTokens";

const logger = rootLogger.child({ api: "manual-subscription" });

/**
 * Safely add months to a date while preserving the original day of month
 *
 * @param baseDate - The base date to calculate from
 * @param originalDay - The day of month from the initial start date (e.g., 30 from Jan 30)
 * @param monthsToAdd - Number of months to add
 * @returns New date with months added
 *
 * @example
 * addMonthsPreservingDay(new Date('2024-01-30'), 30, 1)
 * // Returns: 2024-02-29 (Feb doesn't have day 30)
 *
 * addMonthsPreservingDay(new Date('2024-01-30'), 30, 2)
 * // Returns: 2024-03-30 (March has day 30, so we use it)
 */
function addMonthsPreservingDay(baseDate: Date, originalDay: number, monthsToAdd: number): Date {
  const result = new Date(baseDate);

  // Set to 1st day first to avoid overflow
  result.setDate(1);
  result.setMonth(result.getMonth() + monthsToAdd);

  // Get last day of target month
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();

  // Use original day if possible, otherwise use month end
  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return result;
}

/**
 * Generate subscription periods from start date and number of months
 * Each period is exactly one month long, preserving the original day of month when possible
 *
 * @param startsAt - Start date of the first period
 * @param months - Number of monthly periods to generate
 * @returns Array of subscription periods with startsAt and endsAt
 *
 * @example
 * generateSubscriptionPeriods(new Date('2024-01-30'), 3)
 * // Returns:
 * // [
 * //   { startsAt: 2024-01-30, endsAt: 2024-02-29 },  // Feb doesn't have day 30
 * //   { startsAt: 2024-02-29, endsAt: 2024-03-30 },  // Back to day 30 in March
 * //   { startsAt: 2024-03-30, endsAt: 2024-04-30 }   // Day 30 in April
 * // ]
 */
export function generateSubscriptionPeriods(
  startsAt: Date,
  months: number,
): Array<{ startsAt: Date; endsAt: Date }> {
  const periods: Array<{ startsAt: Date; endsAt: Date }> = [];
  const originalDay = startsAt.getDate(); // Remember the original day throughout

  for (let i = 0; i < months; i++) {
    const currentStart = addMonthsPreservingDay(startsAt, originalDay, i);
    const currentEnd = addMonthsPreservingDay(startsAt, originalDay, i + 1);

    periods.push({
      startsAt: new Date(currentStart),
      endsAt: new Date(currentEnd),
    });
  }

  return periods;
}

/**
 * Create a manual payment record for subscriptions (admin tool use only)
 *
 * @param userId - User ID who owns the payment
 * @param plan - Subscription plan
 * @param months - Number of months
 * @param seats - Number of seats (for team subscriptions only)
 * @param currency - Payment currency (default: CNY)
 * @param paidAt - Payment date (should be subscription start date for manual payments)
 * @returns Payment record ID and details
 */
export async function createManualPaymentRecord({
  userId,
  plan,
  months,
  seats,
  currency = Currency.CNY,
  paidAt,
}: {
  userId: number;
  plan: "pro" | "max" | "super" | "team" | "superteam";
  months: number;
  seats?: number;
  currency?: Currency;
  paidAt: Date;
}): Promise<{
  paymentRecordId: number;
  orderNo: string;
  productName: string;
  price: number;
  quantity: number;
  amount: number;
  currency: Currency;
}> {
  // Determine product name based on plan
  let productName: ProductName;
  if (plan === "pro") {
    productName = ProductName.PRO1MONTH;
  } else if (plan === "max") {
    productName = ProductName.MAX1MONTH;
  } else if (plan === "super") {
    productName = ProductName.SUPER1MONTH;
  } else if (plan === "team") {
    productName = ProductName.TEAMSEAT1MONTH;
  } else if (plan === "superteam") {
    productName = ProductName.SUPERTEAMSEAT1MONTH;
  } else {
    throw new Error(`Invalid plan: ${plan}`);
  }

  // Find product
  const product = await prisma.product.findUnique({
    where: {
      name_currency: {
        name: productName,
        currency: currency,
      },
    },
  });

  if (!product) {
    throw new Error(`Product not found: ${productName} (${currency})`);
  }

  // Generate order number (same format as normal orders: ATP{randomPart}{timestamp})
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNo = `ATP${randomPart}${timestamp}`;

  // Calculate quantity and amount
  // IMPORTANT: PaymentLine.quantity is ONLY for billing calculation
  // - For personal subscriptions: quantity = months
  // - For team subscriptions: quantity = seats × months
  // Business logic (e.g., resetTeamMonthlyTokens) reads seats from Subscription.extra.seats, NOT from PaymentLine
  const quantity = seats ? seats * months : months;
  const amount = product.price * quantity;

  // Create payment record and payment line in transaction
  const paymentRecord = await prisma.$transaction(async (tx) => {
    const newPaymentRecord = await tx.paymentRecord.create({
      data: {
        userId: userId,
        orderNo: orderNo,
        amount: amount,
        currency: currency,
        status: PaymentStatus.succeeded,
        paymentMethod: "manual",
        description: `Manual payment - ${productName} × ${quantity}`,
        paidAt: paidAt,
        createdAt: paidAt,
        updatedAt: paidAt,
      },
    });

    await tx.paymentLine.create({
      data: {
        paymentRecordId: newPaymentRecord.id,
        productId: product.id,
        productName: product.name,
        description: product.description,
        quantity: quantity,
        price: product.price,
        currency: currency,
      },
    });

    logger.info({
      msg: `Created manual payment record ${newPaymentRecord.id}`,
      paymentRecordId: newPaymentRecord.id,
      userId,
      orderNo,
      amount,
      currency,
      productName,
      quantity,
    });

    return newPaymentRecord;
  });

  return {
    paymentRecordId: paymentRecord.id,
    orderNo: paymentRecord.orderNo,
    productName,
    price: product.price,
    quantity,
    amount,
    currency,
  };
}

/**
 * Manually add subscription for a personal user (admin tool use only)
 * Creates consecutive monthly subscription records
 *
 * @param userId - User ID (must be a personal user, not team member)
 * @param plan - Subscription plan (pro, max, or super)
 * @param startsAt - Start date of the first subscription
 * @param months - Number of months to add (each month creates one subscription record)
 * @param paymentRecordId - Optional payment record ID to associate with subscriptions
 */
export async function manuallyAddSubscription({
  userId,
  plan,
  startsAt,
  months,
  paymentRecordId,
}: {
  userId: number;
  plan: "pro" | "max" | "super";
  startsAt: Date;
  months: number;
  paymentRecordId?: number;
}): Promise<void> {
  // Validate months parameter
  if (months < 1 || !Number.isInteger(months)) {
    throw new Error(`Invalid months parameter: ${months}. Must be a positive integer.`);
  }

  // Validate plan parameter
  const subscriptionPlan =
    plan === "super"
      ? SubscriptionPlan.super
      : plan === "max"
        ? SubscriptionPlan.max
        : SubscriptionPlan.pro;

  // Check if user exists and is a personal user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  if (user.teamIdAsMember) {
    throw new Error(
      `User ${userId} is a team member. This function only works for personal users.`,
    );
  }

  // Generate subscription periods
  const subscriptionPeriods = generateSubscriptionPeriods(startsAt, months);
  const finalEndsAt = subscriptionPeriods[subscriptionPeriods.length - 1].endsAt;

  // Check for existing subscriptions that would overlap with the new subscriptions
  const overlappingSubscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      OR: [
        {
          // Existing subscription starts within the new range
          startsAt: {
            gte: startsAt,
            lt: finalEndsAt,
          },
        },
        {
          // Existing subscription ends within the new range
          endsAt: {
            gt: startsAt,
            lte: finalEndsAt,
          },
        },
        {
          // Existing subscription completely covers the new range
          AND: [{ startsAt: { lte: startsAt } }, { endsAt: { gte: finalEndsAt } }],
        },
      ],
    },
  });

  if (overlappingSubscriptions.length > 0) {
    throw new Error(
      `User ${userId} already has ${overlappingSubscriptions.length} subscription(s) that overlap with the requested time range [${startsAt.toISOString()} - ${finalEndsAt.toISOString()}]`,
    );
  }

  // Create subscription records (one per month)
  const subscriptions = [];
  for (const period of subscriptionPeriods) {
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: subscriptionPlan,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
        ...(paymentRecordId ? { paymentRecordId } : {}),
      },
    });

    subscriptions.push(subscription);
    logger.info({
      msg: `Created subscription ${subscription.id} for user ${userId}`,
      subscriptionId: subscription.id,
      userId,
      plan,
      startsAt: period.startsAt.toISOString(),
      endsAt: period.endsAt.toISOString(),
    });
  }

  // If the first subscription is active now, reset monthly tokens immediately
  const now = new Date();
  const firstSubscription = subscriptions[0];
  if (firstSubscription.startsAt <= now && firstSubscription.endsAt > now) {
    logger.info({
      msg: `First subscription is active, resetting monthly tokens for user ${userId}`,
      userId,
    });
    await resetUserMonthlyTokens({ userId });
  }

  logger.info({
    msg: `Successfully added ${months} month(s) of ${plan} subscription for user ${userId}`,
    userId,
    plan,
    months,
    startsAt: startsAt.toISOString(),
    endsAt: finalEndsAt.toISOString(),
  });
}

/**
 * Manually add team subscription (admin tool use only)
 * Creates consecutive monthly subscription records for a team
 *
 * @param teamId - Team ID
 * @param seats - Number of seats for the subscription
 * @param plan - Subscription plan (team or superteam)
 * @param startsAt - Start date of the first subscription
 * @param months - Number of months to add (each month creates one subscription record)
 * @param paymentRecordId - Optional payment record ID to associate with subscriptions
 */
export async function manuallyAddTeamSubscription({
  teamId,
  seats,
  plan,
  startsAt,
  months,
  paymentRecordId,
}: {
  teamId: number;
  seats: number;
  plan: "team" | "superteam";
  startsAt: Date;
  months: number;
  paymentRecordId?: number;
}): Promise<void> {
  // Validate months parameter
  if (months < 1 || !Number.isInteger(months)) {
    throw new Error(`Invalid months parameter: ${months}. Must be a positive integer.`);
  }

  // Validate seats parameter
  if (seats < 0 || !Number.isInteger(seats)) {
    throw new Error(`Invalid seats parameter: ${seats}. Must be a non negative integer.`);
  }

  const subscriptionPlan =
    plan === "superteam" ? SubscriptionPlan.superteam : SubscriptionPlan.team;

  // Check if team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { ownerUser: true },
  });

  if (!team) {
    throw new Error(`Team with ID ${teamId} not found`);
  }

  // Generate subscription periods
  const subscriptionPeriods = generateSubscriptionPeriods(startsAt, months);
  const finalEndsAt = subscriptionPeriods[subscriptionPeriods.length - 1].endsAt;

  // Check for existing subscriptions that would overlap with the new subscriptions
  const overlappingSubscriptions = await prisma.subscription.findMany({
    where: {
      teamId,
      OR: [
        {
          // Existing subscription starts within the new range
          startsAt: {
            gte: startsAt,
            lt: finalEndsAt,
          },
        },
        {
          // Existing subscription ends within the new range
          endsAt: {
            gt: startsAt,
            lte: finalEndsAt,
          },
        },
        {
          // Existing subscription completely covers the new range
          AND: [{ startsAt: { lte: startsAt } }, { endsAt: { gte: finalEndsAt } }],
        },
      ],
    },
  });

  if (overlappingSubscriptions.length > 0) {
    throw new Error(
      `Team ${teamId} already has ${overlappingSubscriptions.length} subscription(s) that overlap with the requested time range [${startsAt.toISOString()} - ${finalEndsAt.toISOString()}]`,
    );
  }

  // If paymentRecordId is provided, get the userId from PaymentRecord
  let paymentUserId: number | undefined = undefined;
  if (paymentRecordId) {
    const paymentRecord = await prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId },
      select: { userId: true },
    });
    if (!paymentRecord) {
      throw new Error(`PaymentRecord with ID ${paymentRecordId} not found`);
    }
    paymentUserId = paymentRecord.userId;
  }

  // Create subscription records (one per month)
  const subscriptions = [];
  for (const period of subscriptionPeriods) {
    const subscription = await prisma.subscription.create({
      data: {
        // If paymentRecordId is provided, use the userId from PaymentRecord (should be a team user)
        ...(paymentUserId ? { userId: paymentUserId } : {}),
        teamId,
        plan: subscriptionPlan,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
        extra: { seats } satisfies SubscriptionExtra,
        ...(paymentRecordId ? { paymentRecordId } : {}),
      },
    });

    subscriptions.push(subscription);
    logger.info({
      msg: `Created team subscription ${subscription.id} for team ${teamId}`,
      subscriptionId: subscription.id,
      teamId,
      seats,
      startsAt: period.startsAt.toISOString(),
      endsAt: period.endsAt.toISOString(),
    });
  }

  // If the first subscription is active now, reset monthly tokens immediately
  const now = new Date();
  const firstSubscription = subscriptions[0];
  if (firstSubscription.startsAt <= now && firstSubscription.endsAt > now) {
    logger.info({
      msg: `First subscription is active, resetting monthly tokens for team ${teamId}`,
      teamId,
    });
    await resetTeamMonthlyTokens({ teamId });
  }

  logger.info({
    msg: `Successfully added ${months} month(s) of team subscription with ${seats} seats for team ${teamId}`,
    teamId,
    seats,
    months,
    startsAt: startsAt.toISOString(),
    endsAt: finalEndsAt.toISOString(),
  });
}
