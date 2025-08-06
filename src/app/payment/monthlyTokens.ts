import "server-only";

import { fetchActiveSubscription } from "@/app/account/lib";
import { rootLogger } from "@/lib/logging";
import { User, UserTokensLogVerb } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export const TEAM_MONTHLY_TOKENS_PER_SEAT = 5_000_000;

export async function resetTeamMonthlyTokens({ teamId }: { teamId: number }) {
  const logger = rootLogger.child({ api: "resetTeamMonthlyTokens" });
  const now = new Date();

  let teamTokens = await prisma.teamTokens.findUniqueOrThrow({
    where: { teamId },
  });

  if (teamTokens.monthlyResetAt && teamTokens.monthlyResetAt > now) {
    // 当前的 monthlyBalance 还在生效中，结束
    return;
  }

  // 获取团队的 owner user，记录 tokenslog
  let teamOwnerUser: User;
  try {
    const team = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
    });
    // TODO: 等 @@unique([teamIdAsMember, personalUserId]) 加上以后，这里要改成 findUnique
    const user = await prisma.user.findFirst({
      where: {
        teamIdAsMember: teamId,
        personalUserId: team.ownerUserId,
      },
    });
    if (!user) {
      throw new Error(
        `Team user not found with teamId: ${teamId} and ownerUserId: ${team.ownerUserId}`,
      );
    }
    teamOwnerUser = user;
  } catch (error) {
    logger.error((error as Error).message);
    throw error;
  }

  // 此时满足 teamTokens.monthlyResetAt === null || teamTokens.monthlyResetAt && teamTokens.monthlyResetAt <= now
  // 重置 monthlyBalance 和 monthlyResetAt
  await prisma.$transaction(async (tx) => {
    const rest = teamTokens.monthlyBalance;
    if (rest > 0) {
      // 如果余额大于 0，创建一个 userTokensLog 记录，扣除剩余余额
      logger.info(
        `Team ${teamId} needs monthly token reset, monthlyBalance=${rest}, monthlyResetAt=${teamTokens.monthlyResetAt}`,
      );
      await tx.userTokensLog.create({
        data: {
          userId: teamOwnerUser.id,
          verb: UserTokensLogVerb.subscriptionReset,
          value: -rest,
          extra: { teamId: teamId },
        },
      });
      teamTokens = await tx.teamTokens.update({
        where: { teamId },
        data: {
          monthlyBalance: { decrement: rest },
          monthlyResetAt: null,
        },
      });
    } else {
      // 如果 monthlyBalance < 0，保留余额
      // 但是当 monthlyResetAt 不为空时，还是需要清空
      if (teamTokens.monthlyResetAt !== null) {
        logger.info(
          `Team ${teamId} needs monthly token reset, monthlyBalance=${rest}, monthlyResetAt=${teamTokens.monthlyResetAt}`,
        );
        teamTokens = await tx.teamTokens.update({
          where: { teamId },
          data: {
            monthlyResetAt: null,
          },
        });
      }
    }
  });

  // now 在 [startsAt, endsAt) 的区间内，理应只有一个，所以 orderBy 和 findFirst 都其实没意义
  const { activeSubscription } = await fetchActiveSubscription({ userId: teamOwnerUser.id });
  if (!activeSubscription) {
    // 当前没有生效中的订阅
    return;
  }

  let seats: number;
  try {
    // Allocate new tokens based on seats from active subscription
    const { invoice: invoiceData } = activeSubscription.extra;
    const quantity = invoiceData?.lines.data[0]?.quantity;
    if (!quantity) {
      throw new Error(`Invalid quantity on invoice data of subscription ${activeSubscription.id}`);
    }
    seats = quantity;
  } catch (error) {
    logger.error((error as Error).message);
    throw error;
  }

  const rechargeAmount = TEAM_MONTHLY_TOKENS_PER_SEAT * seats;
  logger.info(
    `Team ${teamId} allocating monthly tokens: seats=${seats}, recharge=${rechargeAmount}`,
  );

  await prisma.$transaction(async (tx) => {
    await tx.userTokensLog.create({
      data: {
        userId: teamOwnerUser.id,
        verb: UserTokensLogVerb.subscription,
        resourceType: "UserSubscription",
        resourceId: activeSubscription.id,
        value: rechargeAmount,
      },
    });
    // 注意！这里也是 balance.increment，如果之前研究过程中把 monthlyBalance 扣减到负数了，这里余额不满
    await tx.teamTokens.update({
      where: { teamId },
      data: {
        monthlyBalance: {
          increment: rechargeAmount,
        },
        monthlyResetAt: activeSubscription.endsAt,
      },
    });
  });

  logger.info(
    `Team ${teamId} monthly tokens reset completed successfully. New monthlyResetAt: ${activeSubscription.endsAt.toISOString()}`,
  );
}
