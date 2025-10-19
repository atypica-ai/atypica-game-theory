"use server";
import { upsertUserProfile } from "@/app/(auth)/lib";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserOnboardingData } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export async function saveOnboardingData(
  data: UserOnboardingData,
): Promise<ServerActionResult<void>> {
  return withAuth(async ({ id: userId }) => {
    await upsertUserProfile({ userId });

    await prisma.userProfile.update({
      where: { userId },
      data: {
        onboarding: {
          ...data,
          completedAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      data: undefined,
    };
  });
}
