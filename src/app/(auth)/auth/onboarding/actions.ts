"use server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserExtra, UserOnboardingData } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getTranslations } from "next-intl/server";

export async function saveOnboardingData(
  data: UserOnboardingData,
): Promise<ServerActionResult<boolean>> {
  return withAuth(async ({ id: userId }) => {
    const t = await getTranslations("Auth.Onboarding");

    try {
      // Get current user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          code: "not_found",
          message: t("userNotFound"),
        };
      }

      // Merge with existing extra data
      const updatedExtra = {
        ...(user.extra as UserExtra),
        onboarding: {
          ...data,
          completedAt: new Date().toISOString(),
        },
      };

      // Update user with onboarding data
      await prisma.user.update({
        where: { id: userId },
        data: {
          extra: updatedExtra,
        },
      });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      return {
        success: false,
        code: "internal_server_error",
        message: t("saveFailed"),
      };
    }
  });
}
