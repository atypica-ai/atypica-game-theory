"use server";
import { AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN } from "@/app/(aws)/config";
import { ProductName } from "@/app/payment/data";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { SubscriptionPlan } from "@/prisma/client";
import {
  createPaymentStripeSession,
  createSubscriptionStripeSession,
  createTeamSubscriptionStripeSession,
} from "./create";
import { createUpgradeInvoice, previewUpgrade } from "./upgrade";

export async function createStripeSessionAction({
  productName,
  currency,
  successUrl,
  quantity,
  couponId,
}: {
  productName: ProductName;
  currency: "USD" | "CNY";
  successUrl: string;
  quantity?: number;
  couponId?: string;
}): Promise<ServerActionResult<{ sessionUrl: string }>> {
  return withAuth(async (user) => {
    if (user.email.endsWith(AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN)) {
      return {
        success: false,
        message: "AWS Marketplace users cannot purchase subscriptions",
      };
    }

    try {
      let sessionResponse: { sessionUrl: string };

      if (
        productName === ProductName.PRO1MONTH ||
        productName === ProductName.MAX1MONTH ||
        productName === ProductName.SUPER1MONTH
      ) {
        sessionResponse = await createSubscriptionStripeSession({
          userId: user.id,
          productName,
          currency,
          successUrl,
          couponId,
        });
      } else if (productName === ProductName.TOKENS1M) {
        sessionResponse = await createPaymentStripeSession({
          userId: user.id,
          productName,
          currency,
          successUrl,
        });
      } else if (
        productName === ProductName.TEAMSEAT1MONTH ||
        productName === ProductName.SUPERTEAMSEAT1MONTH
      ) {
        if (!quantity || quantity < 1) {
          return { success: false, message: "quantity is required for team subscriptions" };
        }
        sessionResponse = await createTeamSubscriptionStripeSession({
          userId: user.id,
          productName,
          quantity,
          currency,
          successUrl,
          couponId,
        });
      } else {
        return { success: false, message: "Invalid product name" };
      }

      return { success: true, data: sessionResponse };
    } catch (error) {
      rootLogger.error({
        msg: "Error creating Stripe session",
        error: (error as Error).message,
        productName,
      });
      return { success: false, message: (error as Error).message };
    }
  });
}

export async function upgradeSubscriptionAction({
  targetPlan,
}: {
  targetPlan: SubscriptionPlan;
}): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    if (user.email.endsWith(AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN)) {
      return {
        success: false,
        message: "AWS Marketplace users cannot purchase or upgrade subscriptions",
      };
    }

    try {
      await createUpgradeInvoice({ userId: user.id, targetPlan });
      return { success: true, data: undefined };
    } catch (error) {
      rootLogger.error({
        msg: `Error upgrading subscription to ${targetPlan}`,
        error: (error as Error).message,
      });
      return { success: false, message: (error as Error).message };
    }
  });
}

export async function previewUpgradeAction({
  targetPlan,
}: {
  targetPlan: SubscriptionPlan;
}): Promise<
  ServerActionResult<{ targetPrice: number; discount: number; finalPrice: number; currency: string }>
> {
  return withAuth(async (user) => {
    try {
      const preview = await previewUpgrade({ userId: user.id, targetPlan });
      return { success: true, data: preview };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  });
}

/** @deprecated Use upgradeSubscriptionAction({ targetPlan: SubscriptionPlan.max }) */
export async function upgradeFromProToMaxAction(): Promise<ServerActionResult<void>> {
  return upgradeSubscriptionAction({ targetPlan: SubscriptionPlan.max });
}
