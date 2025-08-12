"use server";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createProToMaxInvoice } from "./upgrade";

export async function upgradeFromProToMaxAction(): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
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
