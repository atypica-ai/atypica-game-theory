import { prisma } from "@/prisma/prisma";
import { UserTokensLogResourceType, UserTokensLogVerb } from "@prisma/client";

/*
 * Deprecated
 */
export async function checkQuota({
  studyUserChatId,
  userId,
  cost,
}: {
  studyUserChatId: number;
  userId: number;
  cost: number;
}) {
  throw new Error("Deprecated");

  const log = await prisma.userTokensLog.findFirst({
    where: {
      userId: userId,
      verb: UserTokensLogVerb.consume,
      resourceType: UserTokensLogResourceType.StudyUserChat,
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
      tokens: true,
    },
  });

  const balance = user.tokens?.balance ?? 0;

  if (balance >= cost) {
    await prisma.$transaction([
      prisma.userTokensLog.create({
        data: {
          userId: userId,
          verb: "consume",
          resourceType: "StudyUserChat",
          resourceId: studyUserChatId,
          value: -cost,
        },
      }),
      prisma.userTokens.update({
        where: { userId },
        data: {
          balance: {
            decrement: cost,
          },
        },
      }),
    ]);
    return true;
  }

  return false;
}
