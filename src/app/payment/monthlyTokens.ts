import "server-only";

import { fetchActiveSubscription } from "@/app/account/lib";
import { rootLogger } from "@/lib/logging";
import {
  SubscriptionExtra,
  SubscriptionPlan,
  TokensAccountExtra,
  TokensLogVerb,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { TokensLogResourceType } from "@/tokens/types";

export const PRO_MONTHLY_TOKENS = 2_000_000;
export const PRO_MONTHLY_GIFT = 1_000_000;
export const MAX_MONTHLY_TOKENS = 5_000_000;
export const MAX_MONTHLY_GIFT = 3_000_000;
export const TEAM_MONTHLY_TOKENS_PER_SEAT = 5_000_000;

/**
 * 定期调用，找到当前生效的套餐，如果生效时间 > tokensAccount 上的重置余额时间，就重置余额并更新重置时间
 */
export async function resetUserMonthlyTokens({ userId }: { userId: number }) {
  const logger = rootLogger.child({ api: "resetUserMonthlyTokens" });
  const now = new Date();

  let tokensAccount = await prisma.tokensAccount.findUniqueOrThrow({
    where: { userId },
  });

  if (tokensAccount.monthlyResetAt && tokensAccount.monthlyResetAt > now) {
    // 当前的 monthlyBalance 还在生效中，结束
    return;
  }

  // 此时满足 tokensAccount.monthlyResetAt === null || tokensAccount.monthlyResetAt && tokensAccount.monthlyResetAt <= now
  // 重置 monthlyBalance 和 monthlyResetAt
  await prisma.$transaction(async (tx) => {
    // 如果余额大于 0，创建一个 userTokensLog 记录，扣除剩余余额
    const rest = tokensAccount.monthlyBalance;

    if (rest > 0) {
      logger.info(
        `User ${userId} needs monthly token reset, monthlyBalance=${rest}, monthlyResetAt=${tokensAccount.monthlyResetAt}`,
      );
      const activeSubscriptionId = tokensAccount.activeSubscriptionId;
      if (!activeSubscriptionId) {
        logger.error(
          `TokensAccount ${tokensAccount.id} of user ${userId} is being reset, but activeSubscriptionId is missing. It will continue but further investigation is required.`,
        );
      }
      await tx.tokensLog.create({
        data: {
          userId: userId,
          verb: TokensLogVerb.subscriptionReset,
          value: -rest,
          resourceType: TokensLogResourceType.Subscription,
          resourceId: activeSubscriptionId,
        },
      });
      tokensAccount = await tx.tokensAccount.update({
        where: { userId },
        data: {
          monthlyBalance: { decrement: rest },
          monthlyResetAt: null,
          activeSubscriptionId: null,
        },
      });
    } else {
      // 如果 monthlyBalance < 0，保留
      // 只有当 monthlyResetAt 不是 null 时才需要更新
      if (tokensAccount.monthlyResetAt !== null) {
        logger.info(
          `User ${userId} needs monthly token reset, monthlyBalance=${rest}, monthlyResetAt=${tokensAccount.monthlyResetAt}`,
        );
        // activeSubscriptionId 现在是直接字段，不需要从 extra 中移除
        tokensAccount = await tx.tokensAccount.update({
          where: { userId },
          data: {
            monthlyResetAt: null,
            activeSubscriptionId: null,
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

  // if (activeSubscription.createdAt < new Date(1749865000000)) {
  //   // TODO: 这个在一个月以后（2025-07-15）去掉，即 2025-06-14 09:30 之前的 subscription 都已经过期了
  //   // 在 2025-06-14 09:30 之前的 tokens 都被加到了 permanentBalance 里，在此时间之后的才加入到 monthlyBalance
  //   logger.info(`User ${userId} subscription before cutoff date, skipping`);
  //   return;
  // }

  let rechargeAmount: number;
  let giftAmount: number;
  let unlimitedTokens: boolean;
  if (activeSubscription.plan === SubscriptionPlan.pro) {
    rechargeAmount = PRO_MONTHLY_TOKENS; // 2_000_000
    giftAmount = PRO_MONTHLY_GIFT; // 1_000_000
    unlimitedTokens = false;
  } else if (activeSubscription.plan === SubscriptionPlan.max) {
    rechargeAmount = MAX_MONTHLY_TOKENS; // 5_000_000
    giftAmount = MAX_MONTHLY_GIFT; // 3_000_000
    unlimitedTokens = false;
  } else if (activeSubscription.plan === SubscriptionPlan.super) {
    rechargeAmount = 0;
    giftAmount = 0;
    unlimitedTokens = true;
  } else {
    logger.error(`User ${userId} has unknown subscription plan: ${activeSubscription.plan}`);
    return;
  }

  logger.info(
    `User ${userId} allocating monthly tokens: plan=${activeSubscription.plan}, recharge=${rechargeAmount}, gift=${giftAmount}, unlimitedTokens=${unlimitedTokens}`,
  );

  await prisma.$transaction(async (tx) => {
    if (!unlimitedTokens) {
      await tx.tokensLog.create({
        data: {
          userId: userId,
          verb: TokensLogVerb.subscription,
          resourceType: TokensLogResourceType.Subscription,
          resourceId: activeSubscription.id,
          value: rechargeAmount,
        },
      });
      await tx.tokensLog.create({
        data: {
          userId: userId,
          verb: TokensLogVerb.gift,
          resourceType: TokensLogResourceType.Subscription,
          resourceId: activeSubscription.id,
          value: giftAmount,
        },
      });
    }
    // 注意！这里也是 balance.increment，如果之前研究过程中把 monthlyBalance 扣减到负数了，这里余额不满
    const extra = tokensAccount.extra as TokensAccountExtra;
    tokensAccount = await tx.tokensAccount.update({
      where: { userId },
      data: {
        monthlyBalance: unlimitedTokens
          ? undefined
          : {
              increment: rechargeAmount + giftAmount,
            },
        monthlyResetAt: activeSubscription.endsAt,
        activeSubscriptionId: activeSubscription.id,
        extra: {
          ...extra,
          unlimitedTokens,
        } satisfies TokensAccountExtra,
      },
    });
  });

  logger.info(
    `User ${userId} monthly tokens reset completed successfully. New monthlyResetAt: ${tokensAccount.monthlyResetAt?.toISOString()}, activeSubscriptionId: ${tokensAccount.activeSubscriptionId}`,
  );
}

export async function resetTeamMonthlyTokens({
  teamId,
  forceReset = false,
}: {
  teamId: number;
  forceReset?: boolean;
}) {
  const logger = rootLogger.child({ api: "resetTeamMonthlyTokens" });
  const now = new Date();

  let tokensAccount = await prisma.tokensAccount.findUniqueOrThrow({
    where: { teamId },
  });

  // 如果不是强制重置，且当前 monthlyBalance 还在生效中，结束
  if (!forceReset && tokensAccount.monthlyResetAt && tokensAccount.monthlyResetAt > now) {
    return;
  }

  // 此时满足 tokensAccount.monthlyResetAt === null || tokensAccount.monthlyResetAt && tokensAccount.monthlyResetAt <= now
  // 重置 monthlyBalance 和 monthlyResetAt
  await prisma.$transaction(async (tx) => {
    const rest = tokensAccount.monthlyBalance;
    if (rest > 0) {
      // 如果余额大于 0，创建一个 userTokensLog 记录，扣除剩余余额
      logger.info(
        `Team ${teamId} needs monthly token reset, monthlyBalance=${rest}, monthlyResetAt=${tokensAccount.monthlyResetAt}`,
      );
      const activeSubscriptionId = tokensAccount.activeSubscriptionId;
      if (!activeSubscriptionId) {
        logger.error(
          `TokensAccount ${tokensAccount.id} of team ${teamId} is being reset, but activeSubscriptionId is missing. It will continue but further investigation is required.`,
        );
      }
      await tx.tokensLog.create({
        data: {
          teamId: teamId,
          verb: TokensLogVerb.subscriptionReset,
          value: -rest,
          resourceType: TokensLogResourceType.Subscription,
          resourceId: activeSubscriptionId,
        },
      });
      tokensAccount = await tx.tokensAccount.update({
        where: { teamId },
        data: {
          monthlyBalance: { decrement: rest },
          monthlyResetAt: null,
          activeSubscriptionId: null,
        },
      });
    } else {
      // 如果 monthlyBalance < 0，保留余额
      // 但是当 monthlyResetAt 不为空时，还是需要清空
      if (tokensAccount.monthlyResetAt !== null) {
        logger.info(
          `Team ${teamId} needs monthly token reset, monthlyBalance=${rest}, monthlyResetAt=${tokensAccount.monthlyResetAt}`,
        );
        // activeSubscriptionId 现在是直接字段，不需要从 extra 中移除
        tokensAccount = await tx.tokensAccount.update({
          where: { teamId },
          data: {
            monthlyResetAt: null,
            activeSubscriptionId: null,
          },
        });
      }
    }
  });

  // now 在 [startsAt, endsAt) 的区间内，理应只有一个，所以 orderBy 和 findFirst 都其实没意义
  const { activeSubscription } = await fetchActiveSubscription({ teamId });
  if (!activeSubscription) {
    // 当前没有生效中的订阅
    return;
  }

  let seats: number;
  let unlimitedTokens: boolean;
  if (activeSubscription.plan === SubscriptionPlan.team) {
    // Get seats from subscription.extra
    const subscriptionExtra = activeSubscription.extra as SubscriptionExtra;
    if (typeof subscriptionExtra.seats !== "number") {
      throw new Error(`Seats not found in subscription ${activeSubscription.id} extra`);
    }
    seats = subscriptionExtra.seats;
    unlimitedTokens = false;
  } else if (activeSubscription.plan === SubscriptionPlan.superteam) {
    // Get seats from subscription.extra
    const subscriptionExtra = activeSubscription.extra as SubscriptionExtra;
    if (typeof subscriptionExtra.seats !== "number") {
      throw new Error(`Seats not found in subscription ${activeSubscription.id} extra`);
    }
    seats = subscriptionExtra.seats;
    unlimitedTokens = true;
  } else {
    logger.error(`Team ${teamId} has unknown subscription plan: ${activeSubscription.plan}`);
    return;
  }

  // Update team seats to reflect current active subscription
  await prisma.team.update({
    where: { id: teamId },
    data: { seats },
  });

  const rechargeAmount = unlimitedTokens ? 0 : TEAM_MONTHLY_TOKENS_PER_SEAT * seats;
  logger.info(
    `Team ${teamId} allocating monthly tokens: seats=${seats}, recharge=${rechargeAmount}, unlimitedTokens=${unlimitedTokens}`,
  );

  await prisma.$transaction(async (tx) => {
    if (!unlimitedTokens) {
      await tx.tokensLog.create({
        data: {
          // userId: activeSubscription.userId, // 不要用 responsibleUser.id，直接使用 activeSubscription.userId，确保 userTokensLog 记录在付款人上
          teamId: teamId,
          verb: TokensLogVerb.subscription,
          resourceType: TokensLogResourceType.Subscription,
          resourceId: activeSubscription.id,
          value: rechargeAmount,
        },
      });
    }
    // 注意！这里也是 balance.increment，如果之前研究过程中把 monthlyBalance 扣减到负数了，这里余额不满
    const extra = tokensAccount.extra as TokensAccountExtra;
    tokensAccount = await tx.tokensAccount.update({
      where: { teamId },
      data: {
        monthlyBalance: unlimitedTokens
          ? undefined
          : {
              increment: rechargeAmount,
            },
        monthlyResetAt: activeSubscription.endsAt,
        activeSubscriptionId: activeSubscription.id,
        extra: {
          ...extra,
          unlimitedTokens,
        } satisfies TokensAccountExtra,
      },
    });
  });

  logger.info(
    `Team ${teamId} monthly tokens reset completed successfully. New monthlyResetAt: ${tokensAccount.monthlyResetAt?.toISOString()}, activeSubscriptionId: ${tokensAccount.activeSubscriptionId}`,
  );
}
