"use server";
import { AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN } from "@/app/(aws)/config";
import { ProductName } from "@/app/payment/data";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import {
  createPaymentStripeSession,
  createSubscriptionStripeSession,
  createTeamSubscriptionStripeSession,
} from "./create";
import { createProToMaxInvoice } from "./upgrade";

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

export async function upgradeFromProToMaxAction(): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Block AWS Marketplace users from upgrading
    if (user.email.endsWith(AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN)) {
      return {
        success: false,
        message: "AWS Marketplace users cannot purchase or upgrade subscriptions",
      };
    }

    try {
      await createProToMaxInvoice({ userId: user.id });
      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      rootLogger.error(`Error upgrading from Pro to Max: ${error}`);
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  });
}
