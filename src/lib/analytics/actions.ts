"use server";
import authOptions from "@/app/(auth)/authOptions";
import { upsertUserProfile } from "@/app/(auth)/lib";
import { UserProfileExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { rootLogger } from "../logging";
import { trackUserServerSide } from "./server";

export async function trackUserAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return;
  }
  if (session.userType !== "Personal") {
    // 只上报 Personal user
    return;
  }
  waitUntil(
    (async (userId: number) => {
      const userProfile = await upsertUserProfile({ userId });
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        // include: { profile: true },
      });
      const lastTrack = (userProfile.extra as UserProfileExtra)?.lastTrack;
      // 12个小时只上报一次，其他时候在对应行为发生以后主动触发
      if (!lastTrack || lastTrack < Date.now() - 1000 * 60 * 60 * 12) {
        rootLogger.info(`trackUser ${user.id}`);
        await trackUserServerSide({
          user,
          userProfile,
          traitTypes: "all",
        }).catch(() => {});
        await prisma.$executeRaw`
          UPDATE "UserProfile"
          SET extra = jsonb_set(COALESCE(extra, '{}'::jsonb), '{lastTrack}', to_jsonb(${Date.now()}::bigint))
          WHERE "userId" = ${user.id}
        `;
      }
    })(session.user.id),
  );
}
