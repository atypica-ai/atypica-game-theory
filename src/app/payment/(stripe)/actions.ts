"use server";
import { AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN } from "@/app/(aws)/config";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createProToMaxInvoice } from "./upgrade";

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
