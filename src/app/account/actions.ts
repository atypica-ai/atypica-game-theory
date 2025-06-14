"use server";
import { PaymentChargeData, PaymentMethod, PaymentRecord } from "@/app/payment/data";
import { stripeClient } from "@/app/payment/lib";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserTokensLog } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { fetchActiveUserSubscription } from "./lib";

export async function fetchTokensHistory(
  page: number = 1,
  pageSize: number = 10,
): Promise<ServerActionResult<UserTokensLog[]>> {
  return withAuth(async (user) => {
    const userId = user.id;
    const skip = (page - 1) * pageSize;

    const [tokensLogs, totalCount] = await Promise.all([
      (async () => {
        // (await prisma.userTokensLog.groupBy({
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
        const result = await prisma.$queryRaw<Array<UserTokensLog>>`
        SELECT
          "userId",
          "resourceType",
          "resourceId",
          "verb",
          SUM("value") as "value",
          MIN("id") as "id",
          MIN("createdAt") as "createdAt",
          MIN("updatedAt") as "updatedAt"
        FROM "UserTokensLog"
        WHERE "userId" = ${userId}
        GROUP BY
          "userId",
          "resourceType",
          "resourceId",
          "verb",
          CASE WHEN "resourceType" IS NULL THEN "id" ELSE NULL END
        ORDER BY MIN("createdAt") DESC
        LIMIT ${pageSize} OFFSET ${skip}
      `;
        return result;
      })(),
      (async () => {
        // (await prisma.userTokensLog.groupBy({
        //   by: ["userId", "resourceType", "resourceId", "verb"],
        //   where: { userId },
        // })).length,
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT
          COUNT(*) as count
        FROM "UserTokensLog"
        WHERE "userId" = ${userId}
        GROUP BY
          "userId",
          "resourceType",
          "resourceId",
          "verb",
          CASE WHEN "resourceType" IS NULL THEN "id" ELSE NULL END
      `;
        return Number(result[0].count);
      })(),
    ]);

    // const [tokensLogs, totalCount] = await Promise.all([
    //   prisma.userTokensLog.findMany({
    //     where: { userId },
    //     orderBy: { createdAt: "desc" },
    //     take: pageSize,
    //     skip: skip,
    //   }),
    //   prisma.userTokensLog.count({
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

export async function fetchPaymentRecords(
  page: number = 1,
  pageSize: number = 10,
): Promise<ServerActionResult<Omit<PaymentRecord, "credential">[]>> {
  return withAuth(async (user) => {
    const userId = user.id;
    const skip = (page - 1) * pageSize;

    const [paymentRecords, totalCount] = await Promise.all([
      prisma.paymentRecord.findMany({
        where: { userId },
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: paymentRecords.map(({ credential, charge, paymentMethod, ...paymentRecord }) => ({
        ...paymentRecord,
        charge: charge as unknown as PaymentChargeData,
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

export async function getUserTokensBalance(): Promise<ServerActionResult<number>> {
  return withAuth(async ({ id: userId }) => {
    const userTokens = await prisma.userTokens.findUniqueOrThrow({
      where: { userId },
    });
    return {
      success: true,
      data: userTokens.permanentBalance + userTokens.monthlyBalance,
    };
  });
}

// 返回当前生效的订阅信息
export async function activeUserSubscriptionAction(): Promise<
  ServerActionResult<Awaited<ReturnType<typeof fetchActiveUserSubscription>>>
> {
  return withAuth(async (user) => {
    try {
      const result = await fetchActiveUserSubscription({ userId: user.id });
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
    const { stripeSubscriptionId } = await fetchActiveUserSubscription({ userId: user.id });
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
 * 只有 stripe subscription 可以被 cancel
 * active subscription 后面不可能再有另一个 subscription 了，一定是最后一个
 */
export async function cancelSubscriptionAction(): Promise<ServerActionResult<null>> {
  return withAuth(async (user) => {
    const { activeSubscription, stripeSubscriptionId } = await fetchActiveUserSubscription({
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
