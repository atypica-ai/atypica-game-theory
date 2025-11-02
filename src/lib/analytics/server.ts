import "server-only";

import { upsertUserProfile } from "@/app/(auth)/lib";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import {
  SubscriptionPlan,
  User,
  UserOnboardingData,
  UserProfile,
  UserProfileExtra,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import {
  Analytics as AnalyticsServer,
  UserTraits as UserTraitsSegment,
} from "@segment/analytics-node";
import { ExtraContext as ExtraContextSegment } from "@segment/analytics-node/dist/types/app/types";
import { getLocale } from "next-intl/server";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "../request/headers";
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
    rootLogger.error(`Failed to load Segment Analytics: ${(error as Error).message}`);
    throw error;
  }
}

type UserTraits = UserTraitsSegment &
  Partial<{
    // name: string;
    // email: string;
    // createdAt: Date;
    onboarding: UserOnboardingData;
    // stats
    studies: number;
    interviews: number;
    personas: number;
    tokensConsumed: number;
    // revenue
    payments: number;
    plan: SubscriptionPlan | null;
    planEndsAt: Date | null;
    // acquisition
    acquisition: Partial<{
      utm_source: string;
      utm_medium: string;
      utm_campaign: string;
      utm_term: string;
      utm_content: string;
      referer: string;
    }>;
  }>;

type UserTraitType = "profile" | "clientInfo" | "stats" | "revenue";

/**
 * Trait Types
 * - profile: 在 user 和 userProfile 上的信息
 * - clientInfo: 客户端信息，必须确保请求发起是用户的客户端，后端定时任务流程里的 trackUser 里不能设置这个 traitType
 * - stats: 用量统计，包括 tokens 消耗
 * - revenue: 收入统计，包括支付和订阅
 */
export async function trackUserServerSide({
  user,
  traitTypes,
}: {
  user: Pick<User, "id" | "name" | "email" | "createdAt"> & {
    profile?: Pick<UserProfile, "extra" | "onboarding">;
  };
  traitTypes: UserTraitType[] | "all";
}) {
  if (traitTypes === "all") {
    traitTypes = ["profile", "clientInfo", "stats", "revenue"];
  }

  const traitTypesToUse: Record<UserTraitType, boolean> = traitTypes.reduce(
    (acc, type) => ({ ...acc, [type]: true }),
    {
      profile: false,
      clientInfo: false,
      stats: false,
      revenue: false,
    },
  );

  // prepare
  const analytics = await loadSegmentAnalytics().catch(() => null);
  if (!analytics) return;

  let traits: UserTraits = {};
  let context: ExtraContextSegment = {};

  if (traitTypesToUse["revenue"]) {
    try {
      const now = new Date();
      const [activeSubscription, payments] = await Promise.all([
        prisma.subscription.findFirst({
          where: { userId: user.id, startsAt: { lte: now }, endsAt: { gt: now } },
          orderBy: { endsAt: "desc" },
        }),
        prisma.paymentRecord.count({
          where: { userId: user.id, status: "succeeded" },
        }),
      ]);
      // merge traits
      traits = {
        ...traits,
        payments,
        ...(activeSubscription
          ? { plan: activeSubscription.plan, planEndsAt: activeSubscription.endsAt }
          : { plan: null, planEndsAt: null }),
      };
    } catch (error) {
      rootLogger.error(`Failed to track revenue traits: ${(error as Error).message}`);
    }
  }

  if (traitTypesToUse["stats"]) {
    try {
      const [studies, interviews, personas, tokensConsumed] = await Promise.all([
        prisma.analyst.count({ where: { userId: user.id } }),
        prisma.interviewProject.count({ where: { userId: user.id } }),
        prisma.personaImport.count({ where: { userId: user.id } }),
        prisma.tokensLog
          .aggregate({
            where: { userId: user.id, verb: "consume" },
            _sum: { value: true },
          })
          .then((result) => -(result._sum.value ?? 0)),
      ]);
      // merge traits
      traits = {
        ...traits,
        studies,
        interviews,
        personas,
        tokensConsumed,
      };
    } catch (error) {
      rootLogger.error(`Failed to track stats traits: ${(error as Error).message}`);
    }
  }

  if (traitTypesToUse["clientInfo"]) {
    try {
      const [clientIp, userAgent, geo, locale] = await Promise.all([
        getRequestClientIp().catch(() => undefined),
        getRequestUserAgent().catch(() => undefined),
        getRequestGeo().catch(() => undefined),
        getLocale().catch(() => undefined),
      ]);
      traits = {
        ...traits,
      };
      context = {
        ...context,
        ...(clientIp ? { ip: clientIp } : {}),
        ...(userAgent ? { userAgent } : {}),
        ...(geo ? { location: { city: geo.city, country: geo.country } } : {}),
        ...(locale ? { locale } : {}),
      };
    } catch (error) {
      rootLogger.error(`Failed to track client info traits: ${(error as Error).message}`);
    }
  }

  if (traitTypesToUse["profile"]) {
    try {
      const userProfile = user.profile ?? (await upsertUserProfile({ userId: user.id }));
      // 提取 acquisition 数据
      const profileExtra = userProfile.extra as UserProfileExtra;
      const acquisitionData = profileExtra?.acquisition;
      const acquisition: UserTraits["acquisition"] = {};
      if (acquisitionData?.utm) {
        if (acquisitionData.utm.utm_source) acquisition.utm_source = acquisitionData.utm.utm_source;
        if (acquisitionData.utm.utm_medium) acquisition.utm_medium = acquisitionData.utm.utm_medium;
        if (acquisitionData.utm.utm_campaign)
          acquisition.utm_campaign = acquisitionData.utm.utm_campaign;
        if (acquisitionData.utm.utm_term) acquisition.utm_term = acquisitionData.utm.utm_term;
        if (acquisitionData.utm.utm_content)
          acquisition.utm_content = acquisitionData.utm.utm_content;
      }
      if (acquisitionData?.referer?.hostname) {
        acquisition.referer = acquisitionData.referer.hostname;
      }
      // merge traits
      traits = {
        ...traits,
        name: user.name || "",
        email: user.email || "",
        createdAt: user.createdAt,
        onboarding: userProfile.onboarding as UserOnboardingData,
        // acquisition
        ...(Object.keys(acquisition).length > 0 ? { acquisition } : {}),
      };
    } catch (error) {
      rootLogger.error(`Failed to track profile traits: ${(error as Error).message}`);
    }
  }

  analytics.identify({
    userId: user.id.toString(),
    traits,
    context,
  });
}
