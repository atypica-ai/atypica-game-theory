"use server";
import { prisma } from "@/lib/prisma";
import withAuth from "./withAuth";

export async function getUserPointsBalance(): Promise<number> {
  return withAuth(async ({ id: userId }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { points: true },
    });

    return user.points?.balance ?? 0;
  });
}

export async function checkStudyUserChatConsume({ studyUserChatId }: { studyUserChatId: number }) {
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
      return true;
    }
    const balance = await getUserPointsBalance();
    if (balance >= 100) {
      return true;
    }
    return false;
  });
}
