import "server-only";

import { fetchActiveSubscription } from "@/app/account/lib";
import { stripeClient } from "@/app/payment/(stripe)/lib";
import { ProductName, StripeMetadata } from "@/app/payment/data";
import {
  PRO_MONTHLY_GIFT,
  PRO_MONTHLY_TOKENS,
  resetUserMonthlyTokens,
} from "@/app/payment/monthlyTokens";
import { trackUserServerSide } from "@/lib/analytics/server";
import { rootLogger } from "@/lib/logging";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { SubscriptionPlan } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { createPaymentRecord, getStripePriceIdForUser, requirePersonalUser } from "./utils";

function generateOrderNo() {
  // Generate a unique order number
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNo = `ATP${randomPart}${timestamp}`;
  return orderNo;
}

export async function createProToMaxInvoice({ userId }: { userId: number }) {
  const { monthlyBalance: currentMonthlyBalance } = await requirePersonalUser(userId);
  const {
    userType,
    activeSubscription,
    stripeSubscriptionId: activeStripeSubscriptionId,
  } = await fetchActiveSubscription({ userId });
  if (
    userType !== "Personal" ||
    !activeStripeSubscriptionId ||
    !activeSubscription ||
    !activeSubscription.paymentRecordId ||
    activeSubscription.plan !== SubscriptionPlan.pro
  ) {
    throw new Error(
      "Upgrade from PRO to MAX is only available to personal users with an existing PRO subscription, and paymentRecordId exists",
    );
  }
  const { currency } = await prisma.paymentRecord.findUniqueOrThrow({
    where: {
      id: activeSubscription.paymentRecordId,
    },
  });

  const orderNo = generateOrderNo();
  const [maxProduct, proProduct] = await Promise.all([
    prisma.product.findUniqueOrThrow({
      where: { name_currency: { name: ProductName.MAX1MONTH, currency } },
    }),
    prisma.product.findUniqueOrThrow({
      where: { name_currency: { name: ProductName.PRO1MONTH, currency } },
    }),
  ]);
  const proProductPriceInCents = proProduct.price * 100;
  const maxProductPriceInCents = maxProduct.price * 100;

  const stripe = stripeClient();

  // 获取当前订阅信息
  const currentSubscription = await stripe.subscriptions.retrieve(activeStripeSubscriptionId);
  if (!currentSubscription.items.data.length) {
    throw new Error("No subscription items found");
  }

  // 计算折扣
  const monthlyBalance = Math.max(currentMonthlyBalance, 0);
  const monthlyInitial = PRO_MONTHLY_TOKENS + PRO_MONTHLY_GIFT;
  const discountAmountInCents = Math.floor(
    proProductPriceInCents * (monthlyBalance / monthlyInitial),
  );

  // const maxProductStripePriceId = maxProduct.stripePriceId;
  const maxProductStripePriceId = getStripePriceIdForUser({
    user: { id: userId },
    product: maxProduct,
  });
  if (!maxProductStripePriceId) {
    throw new Error("Price ID is missing");
  }

  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName: ProductName.MAX1MONTH,
  };

  // 创建升级发票（关联到订阅，但设置为手动收费）
  const upgradeInvoice = await stripe.invoices.create({
    customer: currentSubscription.customer as string,
    subscription: activeStripeSubscriptionId, // 👈 关联到订阅
    collection_method: "charge_automatically",
    auto_advance: false, // 👈 不自动 finalize，我们手动控制
    metadata: {
      ...metadata,
      invoiceType: "ProToMaxUpgrade",
    } as StripeMetadata,
  });

  await stripe.invoiceItems.create({
    customer: currentSubscription.customer as string,
    invoice: upgradeInvoice.id,
    amount: maxProductPriceInCents,
    currency: currency,
    description: maxProduct.description,
    metadata: {
      ...metadata,
      lineType: "Plan",
    } as StripeMetadata,
  });

  // 如果有 token 折扣，添加折扣到发票
  if (discountAmountInCents > 0) {
    await stripe.invoiceItems.create({
      customer: currentSubscription.customer as string,
      invoice: upgradeInvoice.id,
      amount: -discountAmountInCents,
      currency: currency,
      description: currency === "CNY" ? `基于剩余token的升级折扣` : `Token-based upgrade discount`,
      metadata: {
        ...metadata,
        lineType: "UpgradeDiscount",
      } as StripeMetadata,
    });
  }

  // 手动 finalize 和支付升级发票
  const finalizedUpgradeInvoice = await stripe.invoices.finalizeInvoice(upgradeInvoice.id!, {
    auto_advance: true,
  });
  const paidInvoice = await stripe.invoices.pay(finalizedUpgradeInvoice.id!);

  // 确保 invoice 成功支付
  if (paidInvoice.status !== "paid") {
    throw new Error("Invoice payment failed");
  }

  // 更新订阅到新价格（下个周期生效）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updatedSubscription = await stripe.subscriptions.update(activeStripeSubscriptionId, {
    items: [
      {
        id: currentSubscription.items.data[0].id,
        price: maxProductStripePriceId,
      },
    ],
    metadata,
    proration_behavior: "none", // 不要时间比例计费，下个月开始自动扣费，当月已经手动处理了
    billing_cycle_anchor: "unchanged", // 本次 invoice 是手动扣款的，套餐周期保持不变，下一次自动扣款的时间点保持不变
  });

  // 计算最终价格（考虑折扣）
  const finalPrice = (maxProductPriceInCents - discountAmountInCents) / 100;
  // invoice 已经支付成功，直接创建一个成功的支付记录，只创建一个 paymentLine，价格是折算后的价格
  const paymentRecord = await createPaymentRecord({
    userId,
    orderNo,
    status: "succeeded",
    price: finalPrice,
    product: maxProduct,
    quantity: 1,
    stripeInvoice: paidInvoice,
  });

  // 取消现在的 subscription，并创建一个新的 subscription，新的 subscription 开始时间是当前，结束时间和之前的订阅保持一致
  const now = new Date();
  now.setMilliseconds(0);
  const planEndsAt = activeSubscription.endsAt;
  await prisma.subscription.update({
    where: { id: activeSubscription.id },
    data: { endsAt: now },
  });
  // subscription 取消以后，把 monthlyResetAt 设置成当前时间，resetUserMonthlyTokens 里面会进一步重置
  await prisma.tokensAccount.update({
    where: { userId },
    data: { monthlyResetAt: now },
  });

  let stripeSubscriptionId: string | null;
  const subscription_details = paidInvoice.parent?.subscription_details;
  if (!subscription_details) {
    rootLogger.error(
      `No subscription details found for invoice ${paidInvoice.id} on paymentRecord ${paymentRecord.id}`,
    );
    stripeSubscriptionId = null;
  } else if (typeof subscription_details.subscription === "string") {
    stripeSubscriptionId = subscription_details.subscription;
  } else {
    stripeSubscriptionId = subscription_details.subscription.id;
  }

  await prisma.subscription.create({
    data: {
      userId,
      plan: SubscriptionPlan.max,
      startsAt: now,
      endsAt: planEndsAt,
      paymentRecordId: paymentRecord.id,
      stripeSubscriptionId,
    },
  });

  await resetUserMonthlyTokens({ userId });

  // track user
  trackUserServerSide({
    userId,
    traitTypes: ["revenue"],
  });
}
