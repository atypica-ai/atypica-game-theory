/**
 * 支付统计脚本 V2 - 优化版本
 *
 * 核心改进：
 * 1. 从 paymentRecord 出发，确保所有 succeeded 订单都出现在输出
 * 2. 批量查询，避免 N+1 问题
 * 3. 10个用户并行处理
 * 4. 支持断点续传
 *
 * 使用方式:
 * pnpm tsx scripts/utils/payment-stats-v2.ts > payment-stats-v2.csv
 * pnpm tsx scripts/utils/payment-stats-v2.ts --start-from=123 >> payment-stats-v2.csv  # 从用户123继续
 * pnpm tsx scripts/utils/payment-stats-v2.ts --user=456  # 只处理用户456
 */

import "../mock-server-only";

import { Subscription, SubscriptionPlan, TokensLogExtra, TokensLogVerb } from "@/prisma/client";
import { TokensLogResourceType } from "@/tokens/types";
import { loadEnvConfig } from "@next/env";
import Stripe from "stripe";

const dateBefore = new Date("2026-03-01T00:00:00+08:00");
const BATCH_SIZE = 10;

const fdate = (d: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(d);

interface PaymentRecordRevenue {
  userId: number;
  paymentRecordId: number;
  orderNo: string;
  invoiceId: string;
  chargeId: string;
  paymentMethod: string;
  currency: string;
  amount: number;
  description: string;
  paidAt: string;
  recognitionRate: number;
  recognizedAmount: number;
}

async function processUser(user: {
  id: number;
  email: string | null;
  teamIdAsMember: number | null;
}): Promise<PaymentRecordRevenue[]> {
  const { prismaRO } = await import("@/prisma/prisma");

  // 1. 查询所有 succeeded 的 paymentRecord
  const paymentRecords = await prismaRO.paymentRecord.findMany({
    where: {
      userId: user.id,
      status: "succeeded",
      paidAt: { lt: dateBefore },
    },
    orderBy: { paidAt: "asc" },
  });

  if (paymentRecords.length === 0) {
    return [];
  }

  // 2. 查询所有 tokensLog
  const tokensLogs = await prismaRO.tokensLog.findMany({
    where: {
      ...(user.teamIdAsMember ? { teamId: user.teamIdAsMember } : { userId: user.id }),
      createdAt: { lt: dateBefore },
    },
    orderBy: { createdAt: "asc" },
  });

  // 3. 查询用户所有的 subscription（包括 unlimited 的，它们不产生 subscription log）
  const subscriptions = await prismaRO.subscription.findMany({
    where: {
      ...(user.teamIdAsMember ? { teamId: user.teamIdAsMember } : { userId: user.id }),
      startsAt: { lt: dateBefore },
    },
  });
  const subscriptionMap = new Map<number, Subscription>(subscriptions.map((s) => [s.id, s]));

  // 4. 处理 Unlimited 订阅（独立计算，按时间维度）
  const revenueMap = new Map<number, { consumed: number; allocated: number }>();

  for (const subscription of subscriptions) {
    if (
      subscription.plan === SubscriptionPlan.super ||
      subscription.plan === SubscriptionPlan.superteam
    ) {
      if (!subscription.paymentRecordId) continue;

      const usedTime =
        Math.min(dateBefore.getTime(), subscription.endsAt.getTime()) -
        subscription.startsAt.getTime();
      const totalTime = subscription.endsAt.getTime() - subscription.startsAt.getTime();
      const rate = Math.max(0, Math.min(1, usedTime / totalTime));

      const paymentRecord = paymentRecords.find((r) => r.id === subscription.paymentRecordId);
      if (paymentRecord) {
        const existing = revenueMap.get(subscription.paymentRecordId) ?? {
          consumed: 0,
          allocated: 0,
        };
        revenueMap.set(subscription.paymentRecordId, {
          consumed: existing.consumed + paymentRecord.amount * rate,
          allocated: existing.allocated + paymentRecord.amount,
        });
      }
    }
  }

  // 5. 按时间顺序重放所有 log，维护充值源队列（FIFO）
  interface TokenSource {
    type: "gift" | "subscription" | "recharge";
    paymentRecordId: number | null;
    totalTokens: number;
    remainingTokens: number;
  }

  const tokenSources: TokenSource[] = [];

  for (const log of tokensLogs) {
    // 5.1 发放 tokens（加入队列）
    if (log.verb === TokensLogVerb.gift || log.verb === TokensLogVerb.signup) {
      tokenSources.push({
        type: "gift",
        paymentRecordId: null,
        totalTokens: log.value,
        remainingTokens: log.value,
      });
    } else if (log.verb === TokensLogVerb.subscription) {
      const subscription = log.resourceId ? subscriptionMap.get(log.resourceId) : null;

      // 跳过 unlimited（已在上面独立处理）
      if (
        subscription &&
        (subscription.plan === SubscriptionPlan.super ||
          subscription.plan === SubscriptionPlan.superteam)
      ) {
        continue;
      }

      let paymentRecordId: number | null = null;
      if (log.resourceType === TokensLogResourceType.PaymentRecord) {
        paymentRecordId = log.resourceId;
      } else if (subscription?.paymentRecordId) {
        paymentRecordId = subscription.paymentRecordId;
      }

      tokenSources.push({
        type: "subscription",
        paymentRecordId,
        totalTokens: log.value,
        remainingTokens: log.value,
      });
    } else if (log.verb === TokensLogVerb.recharge) {
      if (log.resourceType !== TokensLogResourceType.PaymentRecord || !log.resourceId) {
        continue;
      }

      tokenSources.push({
        type: "recharge",
        paymentRecordId: log.resourceId,
        totalTokens: log.value,
        remainingTokens: log.value,
      });
    }
    // 5.2 消费 tokens（从队列头开始扣，FIFO）
    else if (log.verb === TokensLogVerb.consume || log.verb === TokensLogVerb.subscriptionReset) {
      // 过滤掉 unlimited 的消费
      if (log.verb === TokensLogVerb.consume) {
        const extra = log.extra as TokensLogExtra | null;
        if (extra?.noCharge === true) continue;
      }

      let remainingConsume = -log.value; // 转为正数

      for (const source of tokenSources) {
        if (remainingConsume <= 0) break;

        const deduction = Math.min(source.remainingTokens, remainingConsume);
        source.remainingTokens -= deduction;
        remainingConsume -= deduction;
      }
    }
  }

  // 6. 统计每个 paymentRecord 的消费量
  for (const source of tokenSources) {
    if (!source.paymentRecordId) continue;

    const consumed = source.totalTokens - source.remainingTokens;
    const existing = revenueMap.get(source.paymentRecordId) ?? { consumed: 0, allocated: 0 };

    revenueMap.set(source.paymentRecordId, {
      consumed: existing.consumed + consumed,
      allocated: existing.allocated + source.totalTokens,
    });
  }

  // 7. 生成输出
  const results: PaymentRecordRevenue[] = [];

  for (const record of paymentRecords) {
    const invoice = record.stripeInvoice as Stripe.Invoice;
    const revenue = revenueMap.get(record.id) ?? { consumed: 0, allocated: 0 };

    // 计算记收比例和金额
    const rate = revenue.allocated > 0 ? revenue.consumed / revenue.allocated : 0;
    const recognizedAmount = record.amount * rate;

    results.push({
      userId: user.id,
      paymentRecordId: record.id,
      orderNo: record.orderNo,
      invoiceId: invoice?.id ?? "",
      chargeId: (invoice as any)?.charge ?? "",
      paymentMethod: record.paymentMethod,
      currency: record.currency,
      amount: record.amount,
      description: record.description ?? "",
      paidAt: record.paidAt ? fdate(record.paidAt) : "",
      recognitionRate: rate,
      recognizedAmount,
    });
  }

  return results;
}

async function main() {
  loadEnvConfig(process.cwd());
  const { prismaRO } = await import("@/prisma/prisma");

  // 解析命令行参数
  let startFromUserId = 0;
  let specificUserId: number | null = null;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--start-from=")) {
      startFromUserId = parseInt(arg.split("=")[1]);
    } else if (arg.startsWith("--user=")) {
      specificUserId = parseInt(arg.split("=")[1]);
    }
  }

  const users = await prismaRO.user.findMany({
    where: {
      ...(specificUserId ? { id: specificUserId } : { id: { gte: startFromUserId } }),
      paymentRecords: {
        some: {
          status: "succeeded",
          paidAt: { lt: dateBefore },
        },
      },
    },
    orderBy: { id: "asc" },
    select: { id: true, email: true, teamIdAsMember: true },
  });

  console.log(
    `UserID,订单号,邮箱,支付时间,金额,货币,PaymentMethod,Description,记收比例,记收金额,InvoiceID,ChargeID`,
  );

  // 分批并行处理
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map((user) =>
        processUser(user).then((results) => ({ userId: user.id, email: user.email, results })),
      ),
    );

    // 按用户 ID 排序输出
    batchResults.sort((a, b) => a.userId - b.userId);

    for (const { email, results } of batchResults) {
      for (const result of results) {
        console.log(
          `${result.userId},${result.orderNo},${email ?? ""},${result.paidAt},${result.amount},${result.currency},${result.paymentMethod},${result.description},${result.recognitionRate.toFixed(4)},${result.recognizedAmount.toFixed(2)},${result.invoiceId},${result.chargeId}`,
        );
      }
    }
  }
}

if (require.main === module) {
  main();
}
