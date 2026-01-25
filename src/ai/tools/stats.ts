import { prisma } from "@/prisma/prisma";
import { consumeUserTokens } from "@/tokens/lib";
import { TokensLogResourceType } from "@/tokens/types";
import { InputJsonValue } from "@prisma/client/runtime/client";
import { after } from "next/server";
import { Logger } from "pino";
import { StatReporter } from "./types";

/**
 * ⚠️ 严重问题：此函数导致生产环境数据库连接池耗尽和系统不可用
 *
 * 问题原因：
 * 1. Next.js 15 的 after() API 会将所有延迟操作批量存储，直到 HTTP response 完成后统一触发
 * 2. 在一次研究会话中，可能会有 60+ 次 statReport 调用（每个 AI 交互步骤都会调用）
 * 3. 当 response 完成时，这 60+ 个 consumeUserTokens 操作同时并发执行
 * 4. 每个 consumeUserTokens 都会调用 prisma.$transaction() 获取数据库连接
 * 5. 连接池瞬间从 6 个暴涨到 30 个（max），等待队列达到 184
 *
 * 导致的后果：
 * 1. 前 30 个操作获得连接，发送 `SET TRANSACTION ISOLATION LEVEL READ COMMITTED`
 * 2. 但因为事件循环被 60+ 个并发操作塞满，transaction callback 无法被调度执行
 * 3. 这 30 个连接永久卡在 "idle in transaction" 状态（实测超过 35 分钟）
 * 4. 后续所有数据库操作因无法获取连接而超时，系统完全不可用
 * 5. Prisma 的 timeout: 10000 无效，因为 transaction callback 本身就没有被执行
 *
 * 复现时间：2026-01-25 04:43:14 UTC (studyUserChatId: 740780, userId: 354524)
 *
 * 临时缓解方案：
 * - 已在 prisma.ts 中添加连接级别的 idle_in_transaction_session_timeout=15s（但不生效）
 *
 * 根本解决方案（待实施）：
 * - 方案1：移除 after()，改为同步扣费（影响响应延迟，但保证系统可用）
 * - 方案2：实现队列化的 token 扣费系统，避免并发更新同一行
 * - 方案3：批量聚合 token 消耗，一次性提交
 *
 * @deprecated
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

/**
 * 同步执行，但是捕获异常并打印日志，不影响业务流程
 */
function safeStatReport(statReport: StatReporter, logger: Logger) {
  const func: StatReporter = async (...args) => {
    try {
      await statReport(...args);
    } catch (error) {
      logger.error({
        msg: "stat report failed",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
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
    statReport: safeStatReport(statReport, logger),
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
    statReport: safeStatReport(statReport, logger),
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
    statReport: safeStatReport(statReport, logger),
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
    statReport: safeStatReport(statReport, logger),
  };
};
