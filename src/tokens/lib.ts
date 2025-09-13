import "server-only";

import {
  AgentStatisticsExtra,
  UserTokensLogResourceType,
  UserTokensLogVerb,
} from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";

export async function consumeUserTokens({
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
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, teamIdAsMember: true },
    });
    if (user.teamIdAsMember) {
      // ⚠️ 团队积分扣减，余额记录在 team 上，日志记录在 user 上
      const teamId = user.teamIdAsMember;
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
        const tokensAccount = await tx.tokensAccount.findUniqueOrThrow({
          where: { teamId },
        });
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
      });
      logger.info({ msg: "User tokens consumed successfully", userId, teamId, tokens });
    } else {
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
        const tokensAccount = await tx.tokensAccount.findUniqueOrThrow({
          where: { userId },
        });
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
    const { permanentBalance, monthlyBalance, monthlyResetAt } =
      await prisma.tokensAccount.findUniqueOrThrow({
        where: { teamId },
      });
    return {
      balance: permanentBalance + monthlyBalance,
      permanentBalance,
      monthlyBalance,
      monthlyResetAt,
      source: "team" as const,
    };
  } else {
    const { permanentBalance, monthlyBalance, monthlyResetAt } =
      await prisma.tokensAccount.findUniqueOrThrow({
        where: { userId },
      });
    return {
      balance: permanentBalance + monthlyBalance,
      permanentBalance,
      monthlyBalance,
      monthlyResetAt,
      source: "user" as const,
    };
  }
}
