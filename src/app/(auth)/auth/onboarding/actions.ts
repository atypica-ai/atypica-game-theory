"use server";
import authOptions from "@/app/(auth)/authOptions";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";

export interface OnboardingData {
  usageType: "work" | "personal";
  role: string;
  industry?: string;
  companyName?: string;
  howDidYouHear: string;
}

export async function saveOnboardingData(
  data: OnboardingData,
): Promise<ServerActionResult<boolean>> {
  const t = await getTranslations("Auth.Onboarding");

  try {
    // Get current session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return {
        success: false,
        code: "unauthorized",
        message: t("sessionRequired"),
      };
    }

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return {
        success: false,
        code: "not_found",
        message: t("userNotFound"),
      };
    }

    // Merge with existing extra data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentExtra = (user.extra as Record<string, any>) || {};
    const updatedExtra = {
      ...currentExtra,
      onboarding: {
        ...data,
        completedAt: new Date().toISOString(),
      },
    };

    // Update user with onboarding data
    await prisma.user.update({
      where: { id: session.user.id },
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
}

export async function checkOnboardingStatus(userId: number): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extra = (user.extra as Record<string, any>) || {};
    return !!extra.onboarding?.completedAt;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
}
