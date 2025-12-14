import "server-only";

import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import {
  SubscriptionPlan,
  User,
  UserLastLogin,
  UserOnboardingData,
  UserProfile,
  UserProfileExtra,
} from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import {
  Analytics as AnalyticsServer,
  UserTraits as UserTraitsSegment,
} from "@segment/analytics-node";
import { ExtraContext as ExtraContextSegment } from "@segment/analytics-node/dist/types/app/types";
import { getLocale } from "next-intl/server";
import { after } from "next/server";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "../request/headers";
import { segmentAnalyticsWriteKey } from "./config";
import { TAnalyticsEvent } from "./event";

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

/**
 *
 */
async function _trackEventServerSide<E extends keyof TAnalyticsEvent, T extends TAnalyticsEvent[E]>(
  {
    user,
    userProfile,
    userId,
    event,
    properties,
  }: {
    user?: Pick<User, "id" | "name" | "email" | "createdAt">;
    userProfile?: Pick<UserProfile, "extra" | "lastLogin">;
    userId?: number;
    event: E;
  } & (T extends undefined
    ? { properties?: undefined } // undefined 时可选
    : { properties: T }), // 有值时必填
) {
  if (!userId) {
    if (!user) {
      throw new Error("userId or user must be provided");
    }
    userId = user.id;
  }

  // prepare
  const analytics = await loadSegmentAnalytics().catch(() => null);
  if (!analytics) return;

  let context: ExtraContextSegment = {};
  try {
    if (!userProfile) {
      userProfile = await prismaRO.userProfile.findUniqueOrThrow({
        where: { userId },
        select: { id: true, onboarding: true, lastLogin: true, extra: true },
      });
    }
    const lastLogin = userProfile.lastLogin as UserLastLogin;
    context = {
      ...context,
      ...(lastLogin.clientIp ? { ip: lastLogin.clientIp } : {}),
      ...(lastLogin.userAgent ? { userAgent: lastLogin.userAgent } : {}),
      ...(lastLogin.geo
        ? { location: { city: lastLogin.geo.city, country: lastLogin.geo.country } }
        : {}),
      // ...(locale ? { locale } : {}),
    };
  } catch (error) {
    rootLogger.error(
      { event, userId },
      `Failed to track last login traits: ${(error as Error).message}`,
    );
  }

  try {
    analytics.track({
      userId: userId.toString(),
      event,
      properties,
      context,
    });
  } catch (error) {
    rootLogger.error(
      { event, userId },
      `Failed to send track request: ${(error as Error).message}`,
    );
  }
}

export function trackEventServerSide<E extends keyof TAnalyticsEvent, T extends TAnalyticsEvent[E]>(
  args: {
    user: Pick<User, "id" | "name" | "email" | "createdAt"> & {};
    userProfile: Pick<UserProfile, "extra" | "lastLogin">;
    event: E;
  } & (T extends undefined
    ? { properties?: undefined } // undefined 时可选
    : { properties: T }), // 有值时必填
): void;

export function trackEventServerSide<E extends keyof TAnalyticsEvent, T extends TAnalyticsEvent[E]>(
  args: { userId: number; event: E } & (T extends undefined
    ? { properties?: undefined } // undefined 时可选
    : { properties: T }), // 有值时必填
): void;

export function trackEventServerSide<E extends keyof TAnalyticsEvent, T extends TAnalyticsEvent[E]>(
  args: {
    user?: Pick<User, "id" | "name" | "email" | "createdAt">;
    userProfile?: Pick<UserProfile, "extra" | "lastLogin">;
    userId?: number;
    event: E;
  } & (T extends undefined
    ? { properties?: undefined } // undefined 时可选
    : { properties: T }), // 有值时必填
) {
  after(
    _trackEventServerSide(args)
      .then(() => {
        rootLogger.info({ userId: args.userId, event: args.event }, `Successfully tracked event`);
      })
      .catch((error) => {
        rootLogger.error({
          msg: `Failed to track event: ${(error as Error).message}`,
          stack: (error as Error).stack,
          event: args.event,
          userId: args.userId,
        });
      }),
  );
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
async function _trackUserServerSide({
  user,
  userProfile,
  userId,
  traitTypes,
}: {
  user?: Pick<User, "id" | "name" | "email" | "createdAt">;
  userProfile?: Pick<UserProfile, "extra" | "onboarding" | "lastLogin">;
  userId?: number;
  traitTypes: UserTraitType[] | "all";
}) {
  if (!userId) {
    if (!user) {
      throw new Error("userId or user must be provided");
    }
    userId = user.id;
  }

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
        prismaRO.subscription.findFirst({
          where: { userId: userId, startsAt: { lte: now }, endsAt: { gt: now } },
          orderBy: { endsAt: "desc" },
        }),
        prismaRO.paymentRecord.count({
          where: { userId: userId, status: "succeeded" },
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
      rootLogger.error({ userId }, `Failed to track revenue traits: ${(error as Error).message}`);
    }
  }

  if (traitTypesToUse["stats"]) {
    try {
      const [studies, interviews, personas, tokensConsumed] = await Promise.all([
        prismaRO.analyst.count({ where: { userId: userId } }),
        prismaRO.interviewProject.count({ where: { userId: userId } }),
        prismaRO.personaImport.count({ where: { userId: userId } }),
        prismaRO.tokensLog
          .aggregate({
            where: { userId: userId, verb: "consume" },
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
      rootLogger.error({ userId }, `Failed to track stats traits: ${(error as Error).message}`);
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
      context = {
        ...context,
        ...(clientIp ? { ip: clientIp } : {}),
        ...(userAgent ? { userAgent } : {}),
        ...(geo ? { location: { city: geo.city, country: geo.country } } : {}),
        ...(locale ? { locale } : {}),
      };
    } catch (error) {
      rootLogger.error(
        { userId },
        `Failed to track client info traits: ${(error as Error).message}`,
      );
    }
  } else {
    // ⚠️，context 信息一定要有，不然就会被设置默认值
    try {
      if (!userProfile) {
        userProfile = await prismaRO.userProfile.findUniqueOrThrow({
          where: { userId },
          select: { id: true, onboarding: true, lastLogin: true, extra: true },
        });
      }
      const lastLogin = userProfile.lastLogin as UserLastLogin;
      context = {
        ...context,
        ...(lastLogin.clientIp ? { ip: lastLogin.clientIp } : {}),
        ...(lastLogin.userAgent ? { userAgent: lastLogin.userAgent } : {}),
        ...(lastLogin.geo
          ? { location: { city: lastLogin.geo.city, country: lastLogin.geo.country } }
          : {}),
        // ...(locale ? { locale } : {}),
      };
    } catch (error) {
      rootLogger.error(
        { userId },
        `Failed to track last login traits: ${(error as Error).message}`,
      );
    }
  }

  if (traitTypesToUse["profile"]) {
    try {
      if (!user) {
        user = await prismaRO.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, name: true, email: true, createdAt: true },
        });
      }
      if (!userProfile) {
        userProfile = await prismaRO.userProfile.findUniqueOrThrow({
          where: { userId },
          select: { id: true, onboarding: true, lastLogin: true, extra: true },
        });
      }
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
        name: user.name || undefined,
        email: user.email || undefined,
        createdAt: user.createdAt,
        onboarding: userProfile.onboarding as UserOnboardingData,
        // acquisition
        ...(Object.keys(acquisition).length > 0 ? { acquisition } : {}),
      };
    } catch (error) {
      rootLogger.error({ userId }, `Failed to track profile traits: ${(error as Error).message}`);
    }
  }

  try {
    analytics.identify({
      userId: userId.toString(),
      traits,
      context,
    });
  } catch (error) {
    rootLogger.error(
      { userId },
      `Failed to send identify user request: ${(error as Error).message}`,
    );
  }
}

export function trackUserServerSide(args: {
  user: Pick<User, "id" | "name" | "email" | "createdAt"> & {};
  userProfile: Pick<UserProfile, "extra" | "onboarding" | "lastLogin">;
  traitTypes: UserTraitType[] | "all";
}): void;

export function trackUserServerSide(args: {
  userId: number;
  traitTypes: UserTraitType[] | "all";
}): void;

export function trackUserServerSide(args: {
  user?: Pick<User, "id" | "name" | "email" | "createdAt">;
  userProfile?: Pick<UserProfile, "extra" | "onboarding" | "lastLogin">;
  userId?: number;
  traitTypes: UserTraitType[] | "all";
}) {
  after(
    _trackUserServerSide(args)
      .then(() => {
        rootLogger.info(
          { userId: args.userId, traitTypes: args.traitTypes },
          `Successfully tracked user`,
        );
      })
      .catch((error) => {
        rootLogger.error({
          msg: `Failed to track user: ${(error as Error).message}`,
          stack: (error as Error).stack,
          userId: args.userId,
          traitTypes: args.traitTypes,
        });
      }),
  );
}
