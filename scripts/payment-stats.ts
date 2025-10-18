/**
 * 11月注意
 * 团队版的订单现在没有统计，因为没有 email
 * 这个人的的8月和9月的订单分别是 ATP5511755600969896, ATP5511755600969896-1 都是团队版的
 *
 * 退款订单 ATP1021753148031772-1, 需要标记
 */

// pnpm tsx scripts/payment-stats.ts > payment-stats.csv

import { TokensLogResourceType } from "@/tokens/types";
import { loadEnvConfig } from "@next/env";
import Stripe from "stripe";
import "./mock-server-only";

const dateBefore = new Date("2025-10-01T00:00:00+08:00"); // 注意，导出的 excel 文件里，days 的公式也需要改一下时间为本月 1 号
const pad12 = (n: number) => n.toLocaleString().padStart(12, " ");
const fdate = (d: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeZone: "Asia/Shanghai",
  })
    .format(d)
    .padEnd(10, " ");

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");
  const users = await prisma.user.findMany({
    where: {
      paymentRecords: {
        some: {
          status: "succeeded",
          paidAt: { lt: dateBefore },
        },
      },
    },
  });
  console.log(
    `Order,StripePaymentId,StripeCharge,PaymentMethod,Currency,Amount,Receibed,Used,Payable,Plan,Date,Email`,
  );
  for (const user of users) {
    const tokensLogs = await prisma.tokensLog.findMany({
      where: {
        userId: user.id,
        createdAt: {
          lt: dateBefore,
        },
      },
      orderBy: { id: "asc" },
    });
    const giftedTokensTotal = tokensLogs
      .filter((log) => log.verb === "gift" || log.verb === "signup")
      .reduce((acc, log) => acc + log.value, 0);
    const consumedTokensTotal = tokensLogs
      .filter((log) => log.verb === "consume")
      .reduce((acc, log) => acc + log.value, 0);
    let payable = giftedTokensTotal + consumedTokensTotal;
    console.log(`Free,,,,,,${giftedTokensTotal},${consumedTokensTotal},${payable},,,${user.email}`);
    for (const log of tokensLogs.filter((log) => log.verb === "subscription")) {
      if (log.resourceType === TokensLogResourceType.PaymentRecord) {
        const paymentRecord = await prisma.paymentRecord.findUniqueOrThrow({
          where: { id: log.resourceId! },
        });
        const invoice = paymentRecord.stripeInvoice as Stripe.Invoice | null;
        const used = Math.min(0, Math.max(payable, -log.value));
        payable = payable - used;
        console.log(
          `${paymentRecord.orderNo},${(invoice as any)?.payment_intent ?? ""},${(invoice as any)?.charge ?? ""},${paymentRecord.paymentMethod},${paymentRecord.currency},${paymentRecord.amount},${log.value},${used},${payable},Pro,${paymentRecord.paidAt ? fdate(paymentRecord.paidAt) : ""},${user.email}`,
        );
      } else if (log.resourceType === TokensLogResourceType.Subscription) {
        const subscription = await prisma.subscription.findUniqueOrThrow({
          where: { id: log.resourceId! },
        });
        const paymentRecordId = subscription.paymentRecordId;
        if (paymentRecordId) {
          const paymentRecord = await prisma.paymentRecord.findUniqueOrThrow({
            where: { id: paymentRecordId },
          });
          const invoice = paymentRecord.stripeInvoice as Stripe.Invoice | null;
          const used = Math.min(0, Math.max(payable, -log.value));
          payable = payable - used;
          console.log(
            `${paymentRecord.orderNo},${(invoice as any)?.payment_intent ?? ""},${(invoice as any)?.charge ?? ""},${paymentRecord.paymentMethod},${paymentRecord.currency},${paymentRecord.amount},${log.value},${used},${payable},Pro,${paymentRecord.paidAt ? fdate(paymentRecord.paidAt) : ""},${user.email}`,
          );
        } else {
          // 一般是人工添加的 subscription 可以跳过
          // throw new Error(
          //   `Payment record ID not found in user subscription ${subscription.id}`,
          // );
        }
      } else if (log.resourceType === null) {
        // subscription 月末清零，应该是完全不需要处理:
        // consumedTokensTotal 里面已经把这个扣减掉了
        // paymentRecord 是依次把待扣减的 tokens 依次抵消，似乎也没问题
      } else {
        console.log(log);
        throw new Error("Something went wrong");
      }
    }
    for (const log of tokensLogs.filter((log) => log.verb === "recharge")) {
      if (log.resourceType !== TokensLogResourceType.PaymentRecord) {
        throw new Error("Something went wrong");
      }
      const paymentRecord = await prisma.paymentRecord.findUniqueOrThrow({
        where: { id: log.resourceId! },
      });
      const invoice = paymentRecord.stripeInvoice as Stripe.Invoice | null;
      const used = Math.min(0, Math.max(payable, -log.value));
      payable = payable - used;
      console.log(
        `${paymentRecord.orderNo},${(invoice as any)?.payment_intent ?? ""},${(invoice as any)?.charge ?? ""},${paymentRecord.paymentMethod},${paymentRecord.currency},${paymentRecord.amount},${log.value},${used},${payable},Recharge,${paymentRecord.paidAt ? fdate(paymentRecord.paidAt) : ""},${user.email}`,
      );
    }
  }
}

if (require.main === module) {
  main();
}
