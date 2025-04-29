"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import withAuth from "@/lib/withAuth";
import { UserTokensLogResourceType, UserTokensLogVerb } from "@prisma/client";

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
        resourceType: UserTokensLogResourceType.StudyUserChat,
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
