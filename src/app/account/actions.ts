"use server";
import { authOptions } from "@/lib/auth";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserTokensLog, UserTokensLogVerb } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";
import { PaymentChargeData, PaymentMethod, PaymentRecord } from "../payment/data";

export async function fetchTokensHistory(
  page: number = 1,
  pageSize: number = 10,
): Promise<ServerActionResult<UserTokensLog[]>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  const userId = session.user.id;
  const skip = (page - 1) * pageSize;

  const [tokensLogs, totalCount] = await Promise.all([
    (
      await prisma.userTokensLog.groupBy({
        by: ["userId", "resourceType", "resourceId", "verb"],
        where: { userId },
        _sum: { value: true },
        _min: { id: true, createdAt: true, updatedAt: true },
        orderBy: { _min: { createdAt: "desc" } },
        take: pageSize,
        skip: skip,
      })
    ).map(({ _sum, _min, ...item }) => ({
      ...item,
      value: _sum.value!,
      id: _min.id!,
      createdAt: _min.createdAt!,
      updatedAt: _min.updatedAt!,
    })),
    (
      await prisma.userTokensLog.groupBy({
        by: ["userId", "resourceType", "resourceId", "verb"],
        where: { userId },
      })
    ).length,
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
}

export async function fetchPaymentRecords(
  page: number = 1,
  pageSize: number = 10,
): Promise<ServerActionResult<Omit<PaymentRecord, "credential">[]>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  const userId = session.user.id;
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
}

export async function getUserTokensBalance(): Promise<ServerActionResult<number>> {
  return withAuth(async ({ id: userId }) => {
    const userTokens = await prisma.userTokens.findUniqueOrThrow({
      where: { userId },
    });
    return {
      success: true,
      data: userTokens.balance,
    };
  });
}

/*
 * Deprecated
 */
export async function checkStudyUserChatConsume({
  studyUserChatId,
}: {
  studyUserChatId: number;
}): Promise<ServerActionResult<boolean>> {
  throw new Error("Deprecated");

  return withAuth(async ({ id: userId }) => {
    const log = await prisma.userTokensLog.findFirst({
      where: {
        userId: userId,
        verb: UserTokensLogVerb.consume,
        resourceType: "StudyUserChat",
        resourceId: studyUserChatId,
      },
    });
    if (log) {
      return {
        success: true,
        data: true,
      };
    }
    const balanceResult = await getUserTokensBalance();
    if (!balanceResult.success) {
      return {
        success: false,
        message: balanceResult.message,
      };
    }
    return {
      success: true,
      data: balanceResult.data >= 100,
    };
  });
}
