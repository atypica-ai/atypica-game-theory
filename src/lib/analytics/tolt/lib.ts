import "server-only";

import { ProductName } from "@/app/payment/data";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { UserProfileExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";

const TOLT_API_BASE = "https://api.tolt.com/v1";
const toltLogger = rootLogger.child({ service: "tolt" });

// ============================================================================
// Tolt API Request Helper
// ============================================================================

async function requestToltApi({
  method,
  path,
  body,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const TOLT_API_KEY = process.env.TOLT_API_KEY;

  if (!TOLT_API_KEY) {
    throw new Error("TOLT_API_KEY not configured");
  }

  const url = `${TOLT_API_BASE}${path}`;
  const response = await proxiedFetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOLT_API_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tolt API request failed: HTTP ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Tolt API Client Methods
// ============================================================================

/**
 * Create a click in Tolt
 * Called when a user arrives through a ?via=xxx link
 */
async function createToltClick({
  param,
  value,
  page,
  device,
}: {
  param: string;
  value: string;
  page?: string;
  device?: string;
}) {
  try {
    const result = await requestToltApi({
      method: "POST",
      path: "/clicks",
      body: {
        param,
        value,
        page,
        device,
      },
    });

    return {
      success: true,
      partnerId: result.data?.partner_id,
      clickId: result.data?.click_id,
    };
  } catch (error) {
    toltLogger.error({
      msg: "Error creating Tolt click",
      error: (error as Error).message,
      param,
      value,
    });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create a customer in Tolt
 * Called when a user signs up
 */
async function createToltCustomer({
  email,
  partnerId,
  customerId,
  clickId,
}: {
  email: string;
  partnerId: string;
  customerId: string;
  clickId?: string;
}) {
  try {
    const result = await requestToltApi({
      method: "POST",
      path: "/customers",
      body: {
        email,
        partner_id: partnerId,
        customer_id: customerId,
        click_id: clickId,
        status: "lead",
        lead_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      toltCustomerId: result.data[0].id,
      data: result.data[0],
    };
  } catch (error) {
    toltLogger.error({
      msg: "Error creating Tolt customer",
      error: (error as Error).message,
      email,
      partnerId,
    });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create a transaction in Tolt
 * Called when a payment succeeds
 */
async function createToltTransaction({
  customerId,
  amount,
  billingType,
  chargeId,
  productName,
  source,
  interval,
}: {
  customerId: string;
  amount: number; // in cents
  billingType: "one_time" | "subscription";
  chargeId: string;
  productName: string;
  source: "stripe";
  interval?: "month" | "year";
}) {
  try {
    const result = await requestToltApi({
      method: "POST",
      path: "/transactions",
      body: {
        amount,
        customer_id: customerId,
        billing_type: billingType,
        charge_id: chargeId,
        product_name: productName,
        source,
        interval,
        created_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      transactionId: result.data[0].id,
      data: result.data[0],
    };
  } catch (error) {
    toltLogger.error({
      msg: "Error creating Tolt transaction",
      error: (error as Error).message,
      customerId,
    });
    return { success: false, error: (error as Error).message };
  }
}

// ============================================================================
// High-Level Tracking Functions
// ============================================================================

/**
 * Track user signup in Tolt
 * Called by recordAcquisition after saving tolt.via to database
 * Reads Tolt referral info and user email from database
 * Calls Tolt API and updates UserProfile.extra with tracking data (customerId, partnerId, clickId)
 */
export async function trackToltSignup({ userId }: { userId: number }): Promise<void> {
  try {
    // Get user email and profile with Tolt data
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        profile: {
          select: { id: true, extra: true },
        },
      },
    });

    if (!user.email) {
      toltLogger.warn({
        msg: "User has no email, skipping Tolt signup tracking",
        userId,
      });
      return;
    }

    if (!user.profile) {
      toltLogger.error({
        msg: "User has no profile, cannot track Tolt signup",
        userId,
      });
      return;
    }

    const toltData = (user.profile.extra as UserProfileExtra)?.tolt;
    if (!toltData?.via) {
      // No Tolt referral, skip
      return;
    }

    // 1. Create click to get partner_id
    const clickResult = await createToltClick({
      param: "via",
      value: toltData.via,
      // page: "https://atypica.ai/auth/signup",
      // device: "desktop",
    });

    if (!clickResult.success || !clickResult.partnerId) {
      toltLogger.warn({
        msg: "Failed to create Tolt click",
        error: clickResult.error,
        via: toltData.via,
      });
      return;
    }

    // 2. Create customer in Tolt
    const customerResult = await createToltCustomer({
      email: user.email,
      partnerId: clickResult.partnerId,
      customerId: userId.toString(),
      clickId: clickResult.clickId,
    });

    if (!customerResult.success) {
      toltLogger.warn({
        msg: "Failed to create Tolt customer",
        error: customerResult.error,
        userId,
        email: user.email,
      });
      return;
    }

    // 3. Update UserProfile.extra with Tolt tracking data (only customerId, partnerId, clickId)
    // via and capturedAt are already saved by recordAcquisition
    await mergeExtra({
      tableName: "UserProfile",
      extra: {
        tolt: {
          customerId: customerResult.toltCustomerId,
          partnerId: clickResult.partnerId,
          clickId: clickResult.clickId,
        },
      },
      id: user.profile.id,
    });

    toltLogger.info({
      msg: "Successfully tracked Tolt signup",
      userId,
      toltCustomerId: customerResult.toltCustomerId,
    });
  } catch (error) {
    // Don't block signup if Tolt tracking fails
    toltLogger.error({
      msg: "Error tracking Tolt signup",
      error: (error as Error).message,
      userId,
    });
  }
}

/**
 * Track payment in Tolt
 * Call this after a successful payment
 */
export async function trackToltPayment({
  userId,
  paymentRecordId,
  amount,
  productName,
  chargeId,
}: {
  userId: number;
  paymentRecordId: number;
  amount: number;
  productName: ProductName;
  chargeId: string;
}): Promise<void> {
  try {
    // Get user's Tolt customer ID
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { extra: true },
    });

    const toltCustomerId = (userProfile?.extra as UserProfileExtra)?.tolt?.customerId;

    if (!toltCustomerId) {
      // No Tolt tracking for this user, skip
      return;
    }

    // Determine billing type based on product name
    const subscriptionProducts = [
      ProductName.PRO1MONTH,
      ProductName.MAX1MONTH,
      ProductName.SUPER1MONTH,
      ProductName.TEAMSEAT1MONTH,
      ProductName.SUPERTEAMSEAT1MONTH,
    ];
    const isSubscription = subscriptionProducts.includes(productName);

    // Create transaction in Tolt
    const result = await createToltTransaction({
      customerId: toltCustomerId,
      amount: Math.round(amount * 100), // Convert to cents
      billingType: isSubscription ? "subscription" : "one_time",
      chargeId,
      productName,
      source: "stripe",
      interval: isSubscription ? "month" : undefined,
    });

    if (result.success) {
      toltLogger.info({
        msg: "Successfully tracked Tolt payment",
        paymentRecordId,
        toltTransactionId: result.transactionId,
      });
    } else {
      toltLogger.warn({
        msg: "Failed to track Tolt payment",
        error: result.error,
        paymentRecordId,
      });
    }
  } catch (error) {
    // Don't block payment processing if Tolt tracking fails
    toltLogger.error({
      msg: "Error tracking Tolt payment",
      error: (error as Error).message,
      paymentRecordId,
    });
  }
}
