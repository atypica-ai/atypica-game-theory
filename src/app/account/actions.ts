"use server";
import { stripeClient } from "@/app/payment/(stripe)/lib";
import { PaymentMethod } from "@/app/payment/data";
import { rootLogger } from "@/lib/logging";
import { getRequestOrigin } from "@/lib/request/headers";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { PaymentRecord, TokensLog } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import Stripe from "stripe";
import { fetchActiveSubscription } from "./lib";

export async function fetchTokensHistory(
  page: number = 1,
  pageSize: number = 10,
): Promise<ServerActionResult<(TokensLog & { noCharge: "true" | "false" | null })[]>> {
  return withAuth(async (user) => {
    const userId = user.id;
    const skip = (page - 1) * pageSize;

    const [tokensLogs, totalCount] = await Promise.all([
      (async () => {
        // (await prisma.tokensLog.groupBy({
        //   by: ["userId", "resourceType", "resourceId", "verb"],
        //   where: { userId },
        //   _sum: { value: true },
        //   _min: { id: true, createdAt: true, updatedAt: true },
        //   orderBy: { _min: { createdAt: "desc" } },
        //   take: pageSize,
        //   skip: skip,
        // })).map(({ _sum, _min, ...item }) => ({
        //   ...item,
        //   value: _sum.value!,
        //   id: _min.id!,
        //   createdAt: _min.createdAt!,
        //   updatedAt: _min.updatedAt!,
        // }));
        const result = await prisma.$queryRaw<
          Array<TokensLog & { noCharge: "true" | "false" | null }>
        >`
        SELECT
          "userId",
          "resourceType",
          "resourceId",
          "verb",
          MAX("extra" ->> 'noCharge') as "noCharge",
          SUM("value") as "value",
          MIN("id") as "id",
          MIN("createdAt") as "createdAt",
          MAX("updatedAt") as "updatedAt"
        FROM "TokensLog"
        WHERE "userId" = ${userId}
        GROUP BY
          "userId",
          "resourceType",
          "resourceId",
          "verb",
          CASE WHEN "resourceType" IS NULL THEN "id" ELSE NULL END
        ORDER BY MAX("updatedAt") DESC
        LIMIT ${pageSize} OFFSET ${skip}
      `;
        return result;
      })(),
      (async () => {
        // (await prisma.tokensLog.groupBy({
        //   by: ["userId", "resourceType", "resourceId", "verb"],
        //   where: { userId },
        // })).length,
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM (
          SELECT
            "userId",
            "resourceType",
            "resourceId",
            "verb",
            CASE WHEN "resourceType" IS NULL THEN "id" ELSE NULL END
          FROM "TokensLog"
          WHERE "userId" = ${userId}
          GROUP BY
            "userId",
            "resourceType",
            "resourceId",
            "verb",
            CASE WHEN "resourceType" IS NULL THEN "id" ELSE NULL END
        ) as grouped_data
      `;
        return Number(result[0].count);
      })(),
    ]);

    // const [tokensLogs, totalCount] = await Promise.all([
    //   prisma.tokensLog.findMany({
    //     where: { userId },
    //     orderBy: { createdAt: "desc" },
    //     take: pageSize,
    //     skip: skip,
    //   }),
    //   prisma.tokensLog.count({
    //     where: { userId },
    //   }),
    // ]);

    return {
      success: true,
      data: tokensLogs,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}

export async function fetchTokensHistoryAsTeamOwner(
  page: number = 1,
  pageSize: number = 10,
): Promise<
  ServerActionResult<(TokensLog & { consumedBy: string; noCharge: "true" | "false" | null })[]>
> {
  return withAuth(async (user) => {
    // const userId = user.id;
    const skip = (page - 1) * pageSize;

    const ownerUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!ownerUser?.teamIdAsMember) {
      return {
        success: false,
        message: "User is not a team user",
      };
    }
    const teamAsMember = await prisma.team.findUnique({
      where: { id: ownerUser.teamIdAsMember },
    });
    if (teamAsMember?.ownerUserId !== ownerUser.personalUserId) {
      return {
        success: false,
        message: "User is not the owner of the team",
      };
    }

    const teamId = teamAsMember.id;

    // 需要 join user 以获取 user.name，但是过滤直接用 teamId，有些 log 没有 userid，所以要用 leftjoin
    const [tokensLogs, totalCount] = await Promise.all([
      (async () => {
        const result = await prisma.$queryRaw<
          Array<TokensLog & { consumedBy: string; noCharge: "true" | "false" | null }>
        >`
        SELECT
          "TokensLog"."userId" as "userId",
          MIN("User"."name") as "consumedBy",
          "resourceType",
          "resourceId",
          "verb",
          MAX("extra" ->> 'noCharge') as "noCharge",
          SUM("value") as "value",
          MIN("TokensLog"."id") as "id",
          MIN("TokensLog"."createdAt") as "createdAt",
          MAX("TokensLog"."updatedAt") as "updatedAt"
        FROM "TokensLog"
        LEFT JOIN "User" ON "TokensLog"."userId" = "User"."id"
        WHERE "TokensLog"."teamId" = ${teamId}
        GROUP BY
          "TokensLog"."userId",
          "resourceType",
          "resourceId",
          "verb",
          CASE WHEN "resourceType" IS NULL THEN "TokensLog"."id" ELSE NULL END
        ORDER BY MAX("TokensLog"."updatedAt") DESC
        LIMIT ${pageSize} OFFSET ${skip}
      `;
        return result;
      })(),
      (async () => {
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM (
          SELECT
            "TokensLog"."userId" as "userId",
            "resourceType",
            "resourceId",
            "verb",
            CASE WHEN "resourceType" IS NULL THEN "TokensLog"."id" ELSE NULL END
          FROM "TokensLog"
          LEFT JOIN "User" ON "TokensLog"."userId" = "User"."id"
          WHERE "TokensLog"."teamId" = ${teamId}
          GROUP BY
            "TokensLog"."userId",
            "resourceType",
            "resourceId",
            "verb",
            CASE WHEN "resourceType" IS NULL THEN "TokensLog"."id" ELSE NULL END
        ) as grouped_data
      `;
        return Number(result[0].count);
      })(),
    ]);

    return {
      success: true,
      data: tokensLogs,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}

export async function fetchPaymentRecords(
  page: number = 1,
  pageSize: number = 10,
): Promise<
  ServerActionResult<
    (Omit<
      PaymentRecord,
      | "pingxxCredential"
      | "pingxxChargeId"
      | "pingxxCharge"
      | "stripeInvoiceId"
      | "stripeInvoice"
      | "stripeSession"
    > & { stripeInvoice: Stripe.Invoice | null })[]
  >
> {
  return withAuth(async (user) => {
    const userId = user.id;
    const skip = (page - 1) * pageSize;
    const [paymentRecords, totalCount] = await Promise.all([
      prisma.paymentRecord.findMany({
        where: { userId },
        select: {
          id: true,
          userId: true,
          orderNo: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          description: true,
          paidAt: true,
          stripeInvoice: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: skip,
      }),
      prisma.paymentRecord.count({
        where: { userId },
      }),
    ]);

    return {
      success: true,
      data: paymentRecords.map(({ stripeInvoice, paymentMethod, ...paymentRecord }) => ({
        ...paymentRecord,
        stripeInvoice: stripeInvoice as unknown as Stripe.Invoice | null,
        paymentMethod: paymentMethod as PaymentMethod,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}

export async function getUserTokensBalanceAction(): Promise<ServerActionResult<number>> {
  return withAuth(async ({ id: userId }) => {
    const { balance } = await getUserTokens({ userId });
    return {
      success: true,
      data: balance,
    };
  });
}

// 返回当前生效的订阅信息
export async function activeUserSubscriptionAction(): Promise<
  ServerActionResult<Awaited<ReturnType<typeof fetchActiveSubscription>>>
> {
  return withAuth(async (user) => {
    try {
      const result = await fetchActiveSubscription({ userId: user.id });
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
}

export async function stripeSubscriptionAction() {
  return withAuth(async (user) => {
    const { stripeSubscriptionId } = await fetchActiveSubscription({ userId: user.id });
    const stripe = stripeClient();
    if (!stripeSubscriptionId) {
      return null;
    }
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    return {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
    };
  });
}

/**
 * 返回的 stripeCustomerId 是 subscription 上的 stripeCustomerId，
 * 虽然 user 现在都固定了 stripeCustomerId，但既然 subscription 上有，更合理且靠谱
 * @todo 只有 team owner 才可以看，其他人不应该看到
 */
export async function createCustomerPortalSessionAction({
  subscriptionId,
}: {
  subscriptionId: number;
}): Promise<ServerActionResult<{ url: string }>> {
  return withAuth(async ({ id: userId }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const subscription = await prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
        // userId: user.id, // 确保 subscription 是用户自己的
        ...(user?.teamIdAsMember ? { teamId: user.teamIdAsMember } : { userId: user.id }),
      },
      include: {
        paymentRecord: true,
      },
    });
    if (!subscription) {
      return {
        success: false,
        message: "User subscription not found",
        code: "not_found",
      };
    }
    if (!subscription.paymentRecord?.stripeInvoice) {
      return {
        success: false,
        message: "User subscription payment record not found or invoice not found",
        code: "internal_server_error",
      };
    }
    const invoiceData = subscription.paymentRecord.stripeInvoice as unknown as Stripe.Invoice;
    const stripeCustomerId = typeof invoiceData.customer === "string" ? invoiceData.customer : null;
    if (!stripeCustomerId) {
      return {
        success: false,
        message: "Stripe customer ID not found",
        code: "internal_server_error",
      };
    }
    const stripe = stripeClient();
    const siteOrigin = await getRequestOrigin();
    const returnUrl = `${siteOrigin}/account`;
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });
      return {
        success: true,
        data: {
          url: portalSession.url,
        },
      };
    } catch (error) {
      rootLogger.error(
        `Failed to create customer portal session for user ${user.id}: ${(error as Error).message}`,
      );
      return {
        success: false,
        message: "Failed to create customer portal session",
      };
    }
  });
}

/**
 * 只有 stripe subscription 可以被 cancel
 * active subscription 后面不可能再有另一个 subscription 了，一定是最后一个
 */
export async function cancelSubscriptionAction(): Promise<ServerActionResult<null>> {
  return withAuth(async (user) => {
    const { activeSubscription, stripeSubscriptionId } = await fetchActiveSubscription({
      userId: user.id,
    });
    if (!activeSubscription || !stripeSubscriptionId) {
      return {
        success: false,
        message: "No active subscription found",
      };
    }

    const stripe = stripeClient();
    try {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    } catch (error) {
      rootLogger.error(
        `Failed to cancel subscription ${activeSubscription.id}: ${(error as Error).message}`,
      );
      return {
        success: false,
        message: "Failed to cancel subscription",
      };
    }

    return {
      success: true,
      data: null,
    };
  });
}
