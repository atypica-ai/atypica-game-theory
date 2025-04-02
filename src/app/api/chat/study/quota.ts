import { prisma } from "@/lib/prisma";

export async function checkQuota({
  studyUserChatId,
  userId,
}: {
  studyUserChatId: number;
  userId: number;
}) {
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

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    include: {
      points: true,
    },
  });

  const balance = user.points?.balance ?? 0;

  if (balance >= 100) {
    await prisma.$transaction([
      prisma.userPointsLog.create({
        data: {
          userId: userId,
          verb: "consume",
          resourceType: "StudyUserChat",
          resourceId: studyUserChatId,
          points: -100,
        },
      }),
      prisma.userPoints.update({
        where: { userId },
        data: {
          balance: {
            decrement: 100,
          },
        },
      }),
    ]);
    return true;
  }

  return false;
}
