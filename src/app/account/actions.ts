"use server";
import { authOptions } from "@/lib/auth";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { UserTokensLog, UserTokensLogVerb } from "@prisma/client";
import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";

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
    prisma.userTokensLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: skip,
    }),
    prisma.userTokensLog.count({
      where: { userId },
    }),
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
