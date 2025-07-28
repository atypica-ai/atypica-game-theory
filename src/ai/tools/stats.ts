import {
  AgentStatisticsExtra,
  UserTokensLogResourceType,
  UserTokensLogVerb,
} from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { StatReporter } from "./types";

async function consumeUserTokens({
  userId,
  resourceType,
  resourceId,
  tokens,
  extra,
  logger,
}: {
  userId: number;
  resourceType: UserTokensLogResourceType;
  resourceId: number;
  tokens: number;
  extra: AgentStatisticsExtra;
  logger: Logger;
}) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.userTokensLog.create({
        data: {
          userId: userId,
          verb: UserTokensLogVerb.consume,
          resourceType,
          resourceId,
          value: -tokens,
          extra: extra as InputJsonValue,
        },
      });
      const userTokens = await tx.userTokens.findUniqueOrThrow({
        where: { userId },
      });
      // 优先扣除 monthlyBalance，并且不拆分，balance 可以是负数
      if (userTokens.monthlyBalance > 0) {
        await tx.userTokens.update({
          where: { userId },
          data: { monthlyBalance: { decrement: tokens } },
        });
      } else {
        await tx.userTokens.update({
          where: { userId },
          data: { permanentBalance: { decrement: tokens } },
        });
      }
    });
    logger.info({ msg: "User tokens consumed successfully", userId, tokens });
  } catch (error) {
    logger.error({
      msg: `Failed to consume user tokens: ${(error as Error).message}`,
      userId,
      tokens,
    });
  }
}

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
      await consumeUserTokens({
        userId,
        resourceType: "StudyUserChat",
        resourceId: studyUserChatId,
        tokens: value,
        extra,
        logger: studyLog,
      });
    }
  };
  return { statReport };
};

export const initGenericUserChatStatReporter = ({
  userId,
  userChatId,
  logger,
}: {
  userId: number;
  userChatId: number;
  logger: Logger;
}): { statReport: StatReporter } => {
  const statReport: StatReporter = async (dimension, value, extra) => {
    await prisma.chatStatistics.create({
      data: {
        userChatId: userChatId,
        dimension,
        value,
        extra: extra as InputJsonValue,
      },
    });
    if (dimension === "tokens") {
      await consumeUserTokens({
        userId,
        resourceType: "GenericUserChat",
        resourceId: userChatId,
        tokens: value,
        extra,
        logger,
      });
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
      await consumeUserTokens({
        userId,
        resourceType: "InterviewProject",
        resourceId: interviewProjectId,
        tokens: value,
        extra,
        logger,
      });
    }
  };
  return { statReport };
};
