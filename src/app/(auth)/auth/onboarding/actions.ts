"use server";
import { upsertUserProfile } from "@/app/(auth)/lib";
import { trackUserServerSide } from "@/lib/analytics/server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserOnboardingData } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";

export async function saveOnboardingData(
  data: UserOnboardingData,
): Promise<ServerActionResult<void>> {
  return withAuth(async ({ id: userId }) => {
    await upsertUserProfile({ userId });

    const { user, ...userProfile } = await prisma.userProfile.update({
      where: { userId },
      data: {
        onboarding: {
          ...data,
          completedAt: new Date().toISOString(),
        },
      },
      include: {
        user: true,
      },
    });

    waitUntil(
      trackUserServerSide({
        user,
        userProfile,
        traitTypes: ["profile", "clientInfo"],
      }).catch(() => {}),
    );

    return {
      success: true,
      data: undefined,
    };
  });
}
