"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import withAuth from "@/lib/withAuth";

export async function getUserPointsBalance(): Promise<ServerActionResult<number>> {
  return withAuth(async ({ id: userId }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { points: true },
    });
    return {
      success: true,
      data: user.points?.balance ?? 0,
    };
  });
}

export async function checkStudyUserChatConsume({
  studyUserChatId,
}: {
  studyUserChatId: number;
}): Promise<ServerActionResult<boolean>> {
  return withAuth(async ({ id: userId }) => {
    const log = await prisma.userPointsLog.findFirst({
      where: {
        userId: userId,
        verb: "consume",
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
    const balanceResult = await getUserPointsBalance();
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
