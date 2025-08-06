import "server-only";

import { fetchActiveSubscription } from "@/app/account/lib";
import { rootLogger } from "@/lib/logging";
import { SubscriptionPlan, User, UserTokensLogVerb } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export const PRO_MONTHLY_TOKENS = 2_000_000;
export const PRO_MONTHLY_GIFT = 1_000_000;
export const MAX_MONTHLY_TOKENS = 5_000_000;
export const MAX_MONTHLY_GIFT = 3_000_000;
export const TEAM_MONTHLY_TOKENS_PER_SEAT = 5_000_000;

/**
 * 定期调用，找到当前生效的套餐，如果生效时间 > userTokens 上的重置余额时间，就重置余额并更新重置时间
 */
export async function resetUserMonthlyTokens({ userId }: { userId: number }) {
  const logger = rootLogger.child({ api: "resetUserMonthlyTokens" });
  const now = new Date();

  let userTokens = await prisma.userTokens.findUniqueOrThrow({
    where: { userId },
  });

  if (userTokens.monthlyResetAt && userTokens.monthlyResetAt > now) {
    // 当前的 monthlyBalance 还在生效中，结束
    return;
  }

  // 此时满足 userTokens.monthlyResetAt === null || userTokens.monthlyResetAt && userTokens.monthlyResetAt <= now
  // 重置 monthlyBalance 和 monthlyResetAt
  await prisma.$transaction(async (tx) => {
    // 如果余额大于 0，创建一个 userTokensLog 记录，扣除剩余余额
    const rest = userTokens.monthlyBalance;

    if (rest > 0) {
      logger.info(
        `User ${userId} needs monthly token reset, monthlyBalance=${rest}, monthlyResetAt=${userTokens.monthlyResetAt}`,
      );
      await tx.userTokensLog.create({
        data: {
          userId: userId,
          verb: UserTokensLogVerb.subscriptionReset,
          value: -rest,
        },
      });
      userTokens = await tx.userTokens.update({
        where: { userId },
        data: {
          monthlyBalance: { decrement: rest },
          monthlyResetAt: null,
        },
      });
    } else {
      // 如果 monthlyBalance < 0，保留
      // 只有当 monthlyResetAt 不是 null 时才需要更新
      if (userTokens.monthlyResetAt !== null) {
        logger.info(
          `User ${userId} needs monthly token reset, monthlyBalance=${rest}, monthlyResetAt=${userTokens.monthlyResetAt}`,
        );
        userTokens = await tx.userTokens.update({
          where: { userId },
          data: {
            monthlyResetAt: null,
          },
        });
      }
    }
  });

  // now 在 [startsAt, endsAt) 的区间内，理应只有一个，所以 orderBy 和 findFirst 都其实没意义
  const { activeSubscription } = await fetchActiveSubscription({ userId });
  if (!activeSubscription) {
    // 当前没有生效中的订阅
    return;
  }

  if (activeSubscription.createdAt < new Date(1749865000000)) {
    // TODO: 这个在一个月以后（2025-07-15）去掉，即 2025-06-14 09:30 之前的 subscription 都已经过期了
    // 在 2025-06-14 09:30 之前的 tokens 都被加到了 permanentBalance 里，在此时间之后的才加入到 monthlyBalance
    logger.info(`User ${userId} subscription before cutoff date, skipping`);
    return;
  }

  let rechargeAmount;
  let giftAmount;
  if (activeSubscription.plan === SubscriptionPlan.pro) {
    rechargeAmount = PRO_MONTHLY_TOKENS; // 2_000_000
    giftAmount = PRO_MONTHLY_GIFT; // 1_000_000
  } else if (activeSubscription.plan === SubscriptionPlan.max) {
    rechargeAmount = MAX_MONTHLY_TOKENS; // 5_000_000
    giftAmount = MAX_MONTHLY_GIFT; // 3_000_000
  } else {
    logger.error(`User ${userId} has unknown subscription plan: ${activeSubscription.plan}`);
    return;
  }

  logger.info(
    `User ${userId} allocating monthly tokens: plan=${activeSubscription.plan}, recharge=${rechargeAmount}, gift=${giftAmount}`,
  );

  await prisma.$transaction(async (tx) => {
    await tx.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.subscription,
        resourceType: "UserSubscription",
        resourceId: activeSubscription.id,
        value: rechargeAmount,
      },
    });
    await tx.userTokensLog.create({
      data: {
        userId: userId,
        verb: UserTokensLogVerb.gift,
        resourceType: "UserSubscription",
        resourceId: activeSubscription.id,
        value: giftAmount,
      },
    });
    // 注意！这里也是 balance.increment，如果之前研究过程中把 monthlyBalance 扣减到负数了，这里余额不满
    await tx.userTokens.update({
      where: { userId },
      data: {
        monthlyBalance: {
          increment: rechargeAmount + giftAmount,
        },
        monthlyResetAt: activeSubscription.endsAt,
      },
    });
  });

  logger.info(
    `User ${userId} monthly tokens reset completed successfully. New monthlyResetAt: ${activeSubscription.endsAt.toISOString()}`,
  );
}

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
  if (activeSubscription.plan === SubscriptionPlan.team) {
    try {
      const { invoice: invoiceData } = activeSubscription.extra;
      const quantity = invoiceData?.lines.data[0]?.quantity;
      if (!quantity) {
        throw new Error(
          `Invalid quantity on invoice data of subscription ${activeSubscription.id}`,
        );
      }
      seats = quantity;
    } catch (error) {
      logger.error((error as Error).message);
      throw error;
    }
  } else {
    logger.error(`Team ${teamId} has unknown subscription plan: ${activeSubscription.plan}`);
    return;
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
