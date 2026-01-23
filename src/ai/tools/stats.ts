import { prisma } from "@/prisma/prisma";
import { consumeUserTokens } from "@/tokens/lib";
import { TokensLogResourceType } from "@/tokens/types";
import { InputJsonValue } from "@prisma/client/runtime/client";
import { after } from "next/server";
import { Logger } from "pino";
import { StatReporter } from "./types";

function backgroundStatReport(statReport: StatReporter, logger: Logger) {
  const func: StatReporter = async (...args) => {
    after(async () => {
      try {
        await statReport(...args);
      } catch (error) {
        logger.error({
          msg: "Background stat report failed",
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    });
  };
  return func;
}

export const initStudyStatReporter = ({
  userId,
  studyUserChatId,
  logger,
}: {
  userId: number;
  studyUserChatId: number;
  logger: Logger;
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
        resourceType: TokensLogResourceType.StudyUserChat,
        resourceId: studyUserChatId,
        tokens: value,
        extra,
        logger: logger,
      });
    }
  };
  return {
    statReport: backgroundStatReport(statReport, logger),
  };
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
        resourceType: TokensLogResourceType.GenericUserChat,
        resourceId: userChatId,
        tokens: value,
        extra,
        logger,
      });
    }
  };
  return {
    statReport: backgroundStatReport(statReport, logger),
  };
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
        resourceType: TokensLogResourceType.InterviewProject,
        resourceId: interviewProjectId,
        tokens: value,
        extra,
        logger,
      });
    }
  };
  return {
    statReport: backgroundStatReport(statReport, logger),
  };
};

export const initPersonaImportStatReporter = ({
  userId,
  personaImportId,
  userChatId,
  logger,
}: {
  userId: number;
  personaImportId: number;
  userChatId?: number; // followup chat or persona chat
  logger: Logger;
}): { statReport: StatReporter } => {
  const statReport: StatReporter = async (dimension, value, extra) => {
    if (userChatId) {
      await prisma.chatStatistics.create({
        data: {
          userChatId: userChatId,
          dimension,
          value,
          extra: extra as InputJsonValue,
        },
      });
    }
    if (dimension === "tokens") {
      await consumeUserTokens({
        userId,
        resourceType: TokensLogResourceType.PersonaImport,
        resourceId: personaImportId,
        tokens: value,
        extra,
        logger,
      });
    }
  };
  return {
    statReport: backgroundStatReport(statReport, logger),
  };
};
