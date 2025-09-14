"use server";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { SubscriptionPlan, User, UserExtra, UserOnboardingData } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Analytics as AnalyticsServer } from "@segment/analytics-node";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { segmentAnalyticsWriteKey } from "./config";

// 用一个模块级变量存储 analytics 实例
let analyticsInstance: AnalyticsServer | null = null;

async function loadSegmentAnalytics(): Promise<AnalyticsServer | null> {
  if (analyticsInstance) return analyticsInstance;
  try {
    const writeKey = await segmentAnalyticsWriteKey();
    if (writeKey) {
      analyticsInstance = new AnalyticsServer({ writeKey, httpClient: proxiedFetch });
    }
    return analyticsInstance;
  } catch (error) {
    console.error("Failed to load Segment Analytics:", error);
    throw error;
  }
}

type UserTraits = Partial<{
  name: string;
  email: string;
  createdAt: Date;
  onboarding: UserOnboardingData;
  // stats
  studies: number;
  interviews: number;
  personas: number;
  payments: number;
  // revenue
  plan: SubscriptionPlan | null;
  planEndsAt: Date | null;
}>;

async function _trackUser(user: User) {
  // prepare
  const analytics = await loadSegmentAnalytics();
  const now = new Date();
  const activeSubscription = await prisma.subscription.findFirst({
    where: { userId: user.id, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { endsAt: "desc" },
  });
  const [studies, interviews, personas, payments] = await Promise.all([
    prisma.analyst.count({ where: { userId: user.id } }),
    prisma.interviewProject.count({ where: { userId: user.id } }),
    prisma.personaImport.count({ where: { userId: user.id } }),
    prisma.paymentRecord.count({ where: { userId: user.id, status: "succeeded" } }),
  ]);
  const traits: UserTraits = {
    name: user.name || "",
    email: user.email || "",
    createdAt: user.createdAt,
    onboarding: (user.extra as UserExtra)?.onboarding,
    // stats
    studies,
    interviews,
    personas,
    payments,
    // revenue
    ...(activeSubscription
      ? {
          plan: activeSubscription.plan,
          planEndsAt: activeSubscription.endsAt,
        }
      : { plan: null, planEndsAt: null }),
  };
  analytics?.identify({
    userId: user.id.toString(),
    traits,
  });
}

export async function trackUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return;
  }
  if (session.userType !== "Personal") {
    // 只上报 Personal user
    return;
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  const lastTrack = (user.extra as UserExtra)?.lastTrack;
  // 10分钟只上报一次
  if (!lastTrack || lastTrack < Date.now() - 1000 * 60 * 10) {
    rootLogger.info(`trackUser ${user.id}`);
    waitUntil(
      _trackUser(user)
        .then(async () => {
          await prisma.user.update({
            where: { id: user.id },
            data: { extra: { lastTrack: Date.now() } },
          });
        })
        .catch(() => {}),
    );
  }
}
