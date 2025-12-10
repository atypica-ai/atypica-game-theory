import "server-only";

import {
  AgentStatisticsExtra,
  Prisma,
  TokensAccountExtra,
  TokensLogExtra,
  TokensLogVerb,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { TokensLogResourceType } from "./types";

/**
 * 带重试的事务执行器，处理死锁情况
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  logger: Logger,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const errorCode =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined;

      const isDeadlock = errorCode === "40P01" || errorCode === "P2034"; // PostgreSQL 死锁错误码
      const isSerializationFailure = errorCode === "40001"; // 序列化失败

      if ((isDeadlock || isSerializationFailure) && attempt < maxRetries - 1) {
        const backoffMs = 50 + Math.random() * 150; // 50-200ms 随机退避
        logger.warn({
          msg: "Transaction conflict detected, retrying",
          attempt: attempt + 1,
          errorCode,
          backoffMs,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Should not reach here");
}

export async function consumeUserTokens({
  userId,
  resourceType,
  resourceId,
  tokens,
  extra,
  logger,
}: {
  userId: number;
  resourceType: TokensLogResourceType;
  resourceId: number;
  tokens: number;
  extra: AgentStatisticsExtra;
  logger: Logger;
}) {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, teamIdAsMember: true },
    });

    if (user.teamIdAsMember) {
      // ⚠️ 团队积分扣减，余额记录在 team 上，日志同时记录在 user 和 team 上
      const teamId = user.teamIdAsMember;

      await executeWithRetry(async () => {
        await prisma.$transaction(
          async (tx) => {
            const tokensAccount = await tx.tokensAccount.findUniqueOrThrow({
              where: { teamId },
              select: { extra: true },
            });

            // 检查是否为无限 tokens 团队
            const accountExtra = tokensAccount.extra as TokensAccountExtra;
            const unlimitedTokens = accountExtra.unlimitedTokens === true;

            // 创建 tokensLog 记录（用于统计）
            await tx.tokensLog.create({
              data: {
                userId: userId,
                teamId: teamId,
                verb: TokensLogVerb.consume,
                resourceType,
                resourceId,
                value: -tokens,
                extra: {
                  ...extra,
                  noCharge: unlimitedTokens,
                } satisfies TokensLogExtra,
              },
            });

            // 如果不是无限 tokens，使用原子操作扣减余额（优先扣除 monthlyBalance，不足时扣除 permanentBalance）
            if (!unlimitedTokens) {
              await tx.$executeRaw`
                UPDATE "TokensAccount"
                SET
                  "monthlyBalance" = CASE
                    WHEN "monthlyBalance" > 0 THEN "monthlyBalance" - ${tokens}
                    ELSE "monthlyBalance"
                  END,
                  "permanentBalance" = CASE
                    WHEN "monthlyBalance" <= 0 THEN "permanentBalance" - ${tokens}
                    ELSE "permanentBalance"
                  END,
                  "updatedAt" = NOW()
                WHERE "teamId" = ${teamId}
              `;
            }
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            timeout: 10000,
          },
        );
      }, logger);

      logger.info({ msg: "Team tokens consumed successfully", userId, teamId, tokens });
    } else {
      await executeWithRetry(async () => {
        await prisma.$transaction(
          async (tx) => {
            const tokensAccount = await tx.tokensAccount.findUniqueOrThrow({
              where: { userId },
              select: { extra: true },
            });

            // 检查是否为无限 tokens 用户
            const accountExtra = tokensAccount.extra as TokensAccountExtra;
            const unlimitedTokens = accountExtra.unlimitedTokens === true;

            // 创建 tokensLog 记录（用于统计）
            await tx.tokensLog.create({
              data: {
                userId: userId,
                verb: TokensLogVerb.consume,
                resourceType,
                resourceId,
                value: -tokens,
                extra: {
                  ...extra,
                  noCharge: unlimitedTokens,
                } satisfies TokensLogExtra,
              },
            });

            // 如果不是无限 tokens，使用原子操作扣减余额（优先扣除 monthlyBalance，不足时扣除 permanentBalance）
            if (!unlimitedTokens) {
              await tx.$executeRaw`
                UPDATE "TokensAccount"
                SET
                  "monthlyBalance" = CASE
                    WHEN "monthlyBalance" > 0 THEN "monthlyBalance" - ${tokens}
                    ELSE "monthlyBalance"
                  END,
                  "permanentBalance" = CASE
                    WHEN "monthlyBalance" <= 0 THEN "permanentBalance" - ${tokens}
                    ELSE "permanentBalance"
                  END,
                  "updatedAt" = NOW()
                WHERE "userId" = ${userId}
              `;
            }
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            timeout: 10000,
          },
        );
      }, logger);

      logger.info({ msg: "User tokens consumed successfully", userId, tokens });
    }
  } catch (error) {
    logger.error({
      msg: `Failed to consume tokens: ${(error as Error).message}`,
      userId,
      tokens,
      error: error instanceof Error ? error.stack : String(error),
    });
    // 重新抛出错误，让上层决定如何处理
    throw error;
  }
}

export async function getUserTokens({ userId }: { userId: number }) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, teamIdAsMember: true },
  });
  if (user.teamIdAsMember) {
    const teamId = user.teamIdAsMember;
    const { permanentBalance, monthlyBalance, monthlyResetAt, extra } =
      await prisma.tokensAccount.findUniqueOrThrow({
        where: { teamId },
      });
    const balance = (extra as TokensAccountExtra).unlimitedTokens
      ? ("Unlimited" as const)
      : permanentBalance + monthlyBalance;
    return {
      balance,
      permanentBalance,
      monthlyBalance,
      monthlyResetAt,
      source: "team" as const,
    };
  } else {
    const { permanentBalance, monthlyBalance, monthlyResetAt, extra } =
      await prisma.tokensAccount.findUniqueOrThrow({
        where: { userId },
      });
    const balance = (extra as TokensAccountExtra).unlimitedTokens
      ? ("Unlimited" as const)
      : permanentBalance + monthlyBalance;
    return {
      balance,
      permanentBalance,
      monthlyBalance,
      monthlyResetAt,
      source: "user" as const,
    };
  }
}
