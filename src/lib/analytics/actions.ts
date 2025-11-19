"use server";
import authOptions from "@/app/(auth)/authOptions";
import { UserProfileExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
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
      const [user, userProfile] = await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: userId },
          // include: { profile: true },
        }),
        prisma.userProfile.findUniqueOrThrow({ where: { userId } }),
      ]);

      const lastTrack = (userProfile.extra as UserProfileExtra)?.lastTrack;
      // 12个小时只上报一次，其他时候在对应行为发生以后主动触发
      if (!lastTrack || lastTrack < Date.now() - 1000 * 60 * 60 * 12) {
        rootLogger.info(`trackUser ${user.id}`);
        trackUserServerSide({
          user,
          userProfile,
          traitTypes: "all",
        });
        // await prisma.$executeRaw`
        //   UPDATE "UserProfile"
        //   SET extra = jsonb_set(COALESCE(extra, '{}'::jsonb), '{lastTrack}', to_jsonb(${Date.now()}::bigint))
        //   WHERE "userId" = ${user.id}
        // `;
        await mergeExtra({
          tableName: "UserProfile",
          extra: {
            lastTrack: Date.now(),
          },
          id: userProfile.id,
        });
      }
    })(session.user.id),
  );
}
