import "server-only";

import {
  AgentStatisticsExtra,
  TokensAccountExtra,
  TokensLogExtra,
  TokensLogVerb,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { TokensLogResourceType } from "./types";

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
      await prisma.$transaction(async (tx) => {
        const tokensAccount = await tx.tokensAccount.findUniqueOrThrow({
          where: { teamId },
        });
        // 检查是否为无限 tokens 团队（虽然当前 super 是个人套餐，但保持逻辑完整性）
        const accountExtra = tokensAccount.extra as TokensAccountExtra;
        const unlimitedTokens = accountExtra.unlimitedTokens === true;

        // 创建 tokensLog 记录（用于统计），在 extra 中标记是否不扣减余额
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

        // 如果不是无限 tokens，才扣减余额
        if (!unlimitedTokens) {
          // 优先扣除 monthlyBalance，并且不拆分，balance 可以是负数
          if (tokensAccount.monthlyBalance > 0) {
            await tx.tokensAccount.update({
              where: { teamId },
              data: { monthlyBalance: { decrement: tokens } },
            });
          } else {
            await tx.tokensAccount.update({
              where: { teamId },
              data: { permanentBalance: { decrement: tokens } },
            });
          }
        }
      });
      logger.info({ msg: "User tokens consumed successfully", userId, teamId, tokens });
    } else {
      await prisma.$transaction(async (tx) => {
        const tokensAccount = await tx.tokensAccount.findUniqueOrThrow({
          where: { userId },
        });
        // 检查是否为无限 tokens 用户
        const accountExtra = tokensAccount.extra as TokensAccountExtra;
        const unlimitedTokens = accountExtra.unlimitedTokens === true;

        // 创建 tokensLog 记录（用于统计），在 extra 中标记是否不扣减余额
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

        // 如果不是无限 tokens，才扣减余额
        if (!unlimitedTokens) {
          // 优先扣除 monthlyBalance，并且不拆分，balance 可以是负数
          if (tokensAccount.monthlyBalance > 0) {
            await tx.tokensAccount.update({
              where: { userId },
              data: { monthlyBalance: { decrement: tokens } },
            });
          } else {
            await tx.tokensAccount.update({
              where: { userId },
              data: { permanentBalance: { decrement: tokens } },
            });
          }
        }
      });
      logger.info({ msg: "User tokens consumed successfully", userId, tokens });
    }
  } catch (error) {
    logger.error({
      msg: `Failed to consume tokens: ${(error as Error).message}`,
      userId,
      tokens,
    });
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
