import { UserTokensLogVerb } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { StatReporter } from "./types";

export const initStudyStatReporter = ({
  userId,
  studyUserChatId,
  studyLog,
}: {
  userId: number;
  studyUserChatId: number;
  studyLog: Logger;
}): { statReport: StatReporter } => {
  const statReport: StatReporter = async (dimension, value, extra) => {
    await prisma.chatStatistics.create({
      data: {
        userChatId: studyUserChatId,
        dimension,
        value,
        extra: extra as InputJsonValue,
      },
    });
    if (dimension === "tokens") {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.userTokensLog.create({
            data: {
              userId: userId,
              verb: UserTokensLogVerb.consume,
              resourceType: "StudyUserChat",
              resourceId: studyUserChatId,
              value: -value,
            },
          });
          const userTokens = await tx.userTokens.findUniqueOrThrow({
            where: { userId },
          });
          // 优先扣除 monthlyBalance，并且不拆分，balance 可以是负数
          if (userTokens.monthlyBalance > 0) {
            await tx.userTokens.update({
              where: { userId },
              data: { monthlyBalance: { decrement: value } },
            });
          } else {
            await tx.userTokens.update({
              where: { userId },
              data: { permanentBalance: { decrement: value } },
            });
          }
        });
        studyLog.info({ msg: "User tokens consumed successfully", userId, tokens: value });
      } catch (error) {
        studyLog.error({
          msg: `Failed to consume user tokens: ${(error as Error).message}`,
          userId,
          tokens: value,
        });
      }
    }
  };
  return { statReport };
};

export const initInterviewProjectStatReporter = ({
  userId,
  interviewProjectId,
  sessionUserChatId,
  logger,
}: {
  userId: number;
  interviewProjectId: number;
  sessionUserChatId?: number;
  logger: Logger;
}): { statReport: StatReporter } => {
  const statReport: StatReporter = async (dimension, value, extra) => {
    if (sessionUserChatId) {
      await prisma.chatStatistics.create({
        data: {
          userChatId: sessionUserChatId,
          dimension,
          value,
          extra: extra as InputJsonValue,
        },
      });
    }
    if (dimension === "tokens") {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.userTokensLog.create({
            data: {
              userId: userId,
              verb: UserTokensLogVerb.consume,
              resourceType: "InterviewProject",
              resourceId: interviewProjectId,
              value: -value,
            },
          });
          const userTokens = await tx.userTokens.findUniqueOrThrow({
            where: { userId },
          });
          // 优先扣除 monthlyBalance，并且不拆分，balance 可以是负数
          if (userTokens.monthlyBalance > 0) {
            await tx.userTokens.update({
              where: { userId },
              data: { monthlyBalance: { decrement: value } },
            });
          } else {
            await tx.userTokens.update({
              where: { userId },
              data: { permanentBalance: { decrement: value } },
            });
          }
        });
        logger.info({ msg: "User tokens consumed successfully", userId, tokens: value });
      } catch (error) {
        logger.error({
          msg: `Failed to consume user tokens: ${(error as Error).message}`,
          userId,
          tokens: value,
        });
      }
    }
  };
  return { statReport };
};
