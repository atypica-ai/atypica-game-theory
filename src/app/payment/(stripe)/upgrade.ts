import "server-only";

import { fetchActiveSubscription } from "@/app/account/lib";
import { stripeClient } from "@/app/payment/(stripe)/lib";
import { ProductName, StripeMetadata } from "@/app/payment/data";
import {
  MAX_MONTHLY_GIFT,
  MAX_MONTHLY_TOKENS,
  PRO_MONTHLY_GIFT,
  PRO_MONTHLY_TOKENS,
  resetUserMonthlyTokens,
} from "@/app/payment/monthlyTokens";
import { generateSubscriptionPeriods } from "@/app/payment/manualSubscription";
import { trackUserServerSide } from "@/lib/analytics/server";
import { rootLogger } from "@/lib/logging";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { Currency, SubscriptionPlan } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import {
  createPaymentRecord,
  generateOrderNo,
  getOrCreateStripeCustomerIdForUser,
  getStripePriceIdForUser,
  requirePersonalUser,
} from "./utils";

const VALID_UPGRADE_PATHS: Record<
  string,
  {
    sourcePlans: SubscriptionPlan[];
    targetProduct: ProductName;
  }
> = {
  [SubscriptionPlan.max]: {
    sourcePlans: [SubscriptionPlan.pro],
    targetProduct: ProductName.MAX1MONTH,
  },
  [SubscriptionPlan.super]: {
    sourcePlans: [SubscriptionPlan.pro, SubscriptionPlan.max],
    targetProduct: ProductName.SUPER1MONTH,
  },
};

function getSourceProductName(plan: SubscriptionPlan): ProductName {
  switch (plan) {
    case SubscriptionPlan.pro:
      return ProductName.PRO1MONTH;
    case SubscriptionPlan.max:
      return ProductName.MAX1MONTH;
    default:
      throw new Error(`Unsupported source plan: ${plan}`);
  }
}

function getMonthlyInitial(plan: SubscriptionPlan): number {
  switch (plan) {
    case SubscriptionPlan.pro:
      return PRO_MONTHLY_TOKENS + PRO_MONTHLY_GIFT;
    case SubscriptionPlan.max:
      return MAX_MONTHLY_TOKENS + MAX_MONTHLY_GIFT;
    default:
      throw new Error(`Unsupported source plan for discount: ${plan}`);
  }
}

/** 校验升级路径 + 计算折扣，preview 和 createInvoice 共用 */
async function resolveUpgradeContext({
  userId,
  targetPlan,
}: {
  userId: number;
  targetPlan: SubscriptionPlan;
}) {
  const { user, monthlyBalance: currentMonthlyBalance } = await requirePersonalUser(userId);

  const { userType, activeSubscription, stripeSubscriptionId } = await fetchActiveSubscription({
    userId,
  });
  if (userType !== "Personal" || !activeSubscription || !activeSubscription.paymentRecordId) {
    throw new Error(
      "Upgrade is only available to personal users with an active subscription and paymentRecordId",
    );
  }

  const upgradePath = VALID_UPGRADE_PATHS[targetPlan];
  if (!upgradePath || !upgradePath.sourcePlans.includes(activeSubscription.plan)) {
    throw new Error(`Invalid upgrade path: ${activeSubscription.plan} → ${targetPlan}`);
  }

  const { currency } = await prisma.paymentRecord.findUniqueOrThrow({
    where: { id: activeSubscription.paymentRecordId },
  });

  const sourceProductName = getSourceProductName(activeSubscription.plan);
  const [targetProduct, sourceProduct] = await Promise.all([
    prisma.product.findUniqueOrThrow({
      where: { name_currency: { name: upgradePath.targetProduct, currency } },
    }),
    prisma.product.findUniqueOrThrow({
      where: { name_currency: { name: sourceProductName, currency } },
    }),
  ]);

  const monthlyBalance = Math.max(currentMonthlyBalance, 0);
  const monthlyInitial = getMonthlyInitial(activeSubscription.plan);
  const sourceProductPriceInCents = sourceProduct.price * 100;
  const targetProductPriceInCents = targetProduct.price * 100;
  const discountAmountInCents = Math.floor(
    sourceProductPriceInCents * (monthlyBalance / monthlyInitial),
  );

  return {
    user,
    activeSubscription,
    stripeSubscriptionId,
    currency,
    targetProduct,
    upgradePath,
    targetProductPriceInCents,
    discountAmountInCents,
  };
}

export async function previewUpgrade({
  userId,
  targetPlan,
}: {
  userId: number;
  targetPlan: SubscriptionPlan;
}): Promise<{
  targetPrice: number;
  discount: number;
  finalPrice: number;
  currency: string;
}> {
  const { currency, targetProductPriceInCents, discountAmountInCents } =
    await resolveUpgradeContext({ userId, targetPlan });

  return {
    targetPrice: targetProductPriceInCents / 100,
    discount: discountAmountInCents / 100,
    finalPrice: (targetProductPriceInCents - discountAmountInCents) / 100,
    currency,
  };
}

/**
 * 套餐升级：创建升级 invoice 并执行订阅切换。
 *
 * 支持路径：Pro → Max, Pro → Super, Max → Super
 *
 * ## 为什么用 standalone invoice 而不是挂到旧 subscription？
 *
 * 旧方案把 invoice 挂到旧 subscription 上，再通过 subscriptions.update() 改 price。
 * 问题：如果用户取消了自动续费（Stripe sub 状态 canceled），update 会失败。
 * 新方案创建 standalone invoice（不关联任何 subscription），与旧 sub 状态解耦。
 *
 * ## 为什么新 subscription 有 trial？
 *
 * 升级费用已经通过 standalone invoice 一次性收了（当月的差额）。
 * 新 subscription 的 trial_end 设为旧订阅的结束时间，
 * 这样 Stripe 在当前周期内不会重复收费，到期后才开始按新价格自动扣费。
 * 用户侧看不到 trial——我们的 UI 只读本地 subscription 数据，不展示 Stripe 的 trial 状态。
 *
 * ## 执行顺序
 *
 * 1. 校验 + 计算折扣（resolveUpgradeContext）
 * 2. 从旧 subscription 获取 payment method（但不 cancel）
 * 3. 创建 standalone invoice → 添加 line items → finalize → 付款
 * 4. 付款成功后：cancel 旧 Stripe sub + 创建新 Stripe sub
 *    - 如果这一步失败，钱已收，本地记录照常创建，Stripe 侧需人工介入
 * 5. 创建本地 payment record + 切换本地 subscription + 重置 tokens
 */
export async function createUpgradeInvoice({
  userId,
  targetPlan,
}: {
  userId: number;
  targetPlan: SubscriptionPlan;
}) {
  const {
    user,
    activeSubscription,
    stripeSubscriptionId,
    currency,
    targetProduct,
    upgradePath,
    targetProductPriceInCents,
    discountAmountInCents,
  } = await resolveUpgradeContext({ userId, targetPlan });

  const targetStripePriceId = getStripePriceIdForUser({
    user: { id: userId },
    product: targetProduct,
  });
  if (!targetStripePriceId) {
    throw new Error("Price ID is missing");
  }

  const orderNo = generateOrderNo();
  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName: upgradePath.targetProduct,
    invoiceType: "PlanUpgrade",
  };

  // 获取 Stripe customer ID
  const stripeCustomerId = await getOrCreateStripeCustomerIdForUser({
    userId,
    email: user.email,
    currency: currency as Extract<Currency, "USD" | "CNY">,
  });

  const stripe = stripeClient();

  // 从旧 subscription 获取 payment method（但先不 cancel）
  if (!stripeSubscriptionId) {
    throw new Error("No Stripe subscription found for upgrade");
  }
  const oldSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const defaultPaymentMethod =
    typeof oldSub.default_payment_method === "string"
      ? oldSub.default_payment_method
      : oldSub.default_payment_method?.id;
  if (!defaultPaymentMethod) {
    throw new Error("No payment method found on existing subscription");
  }

  // ===== 第一步：付款 =====
  // 先付款，付款失败则旧 subscription 不受影响
  const upgradeInvoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    default_payment_method: defaultPaymentMethod,
    // Stripe 默认会把 customer 上所有 pending invoice items 拉入新 invoice。
    // 这里用 exclude 确保只有我们手动添加的 line items 进来，不受其他残留项影响。
    pending_invoice_items_behavior: "exclude",
    collection_method: "charge_automatically",
    auto_advance: false,
    metadata: metadata as unknown as Record<string, string>,
  });

  await stripe.invoiceItems.create({
    customer: stripeCustomerId,
    invoice: upgradeInvoice.id,
    amount: targetProductPriceInCents,
    currency: currency,
    description: targetProduct.description,
    metadata: {
      ...metadata,
      lineType: "Plan",
    } as unknown as Record<string, string>,
  });

  if (discountAmountInCents > 0) {
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: upgradeInvoice.id,
      amount: -discountAmountInCents,
      currency: currency,
      description: currency === "CNY" ? "基于剩余token的升级折扣" : "Token-based upgrade discount",
      metadata: {
        ...metadata,
        lineType: "UpgradeDiscount",
      } as unknown as Record<string, string>,
    });
  }

  const finalizedInvoice = await stripe.invoices.finalizeInvoice(upgradeInvoice.id!, {
    auto_advance: true,
  });
  const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id!);

  if (paidInvoice.status !== "paid") {
    throw new Error("Invoice payment failed");
  }

  // ===== 第二步：付款成功，cancel 旧 subscription + 创建新 subscription =====
  // 新订阅从现在开始，持续一个自然月
  const now = new Date();
  now.setMilliseconds(0);
  const [{ endsAt: newPlanEndsAt }] = generateSubscriptionPeriods(now, 1);

  // 即使 Stripe 操作失败，本地记录也必须创建（钱已经收了）
  let newStripeSubscriptionId: string | null = null;
  try {
    // prorate: false — Stripe 默认会按剩余天数生成一笔负数 credit 挂在 customer 上，
    // 下次产生 invoice 时自动抵扣，以此实现差额付款。
    // 我们的折扣是按 token 用量算的，不是按时间，所以关掉避免两套折扣逻辑叠加。
    if (stripeSubscriptionId) {
      const oldSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (oldSub.status !== "canceled") {
        await stripe.subscriptions.cancel(stripeSubscriptionId, { prorate: false });
      }
    }
    const newStripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: targetStripePriceId }],
      trial_end: Math.floor(newPlanEndsAt.getTime() / 1000),
      metadata: metadata as unknown as Record<string, string>,
    });
    newStripeSubscriptionId = newStripeSubscription.id;
  } catch (error) {
    // 付款已成功但 Stripe subscription 切换失败，本地记录照常创建，Stripe 侧需要人工介入
    rootLogger.error({
      msg: "Payment succeeded but Stripe subscription switch failed, requires manual intervention",
      stripeSubscriptionId,
      userId,
      error: (error as Error).message,
    });
  }

  // 创建本地 payment record
  const finalPrice = (targetProductPriceInCents - discountAmountInCents) / 100;
  const paymentRecord = await createPaymentRecord({
    userId,
    orderNo,
    status: "succeeded",
    price: finalPrice,
    product: targetProduct,
    quantity: 1,
    stripeInvoice: paidInvoice,
  });

  // 结束旧本地 subscription
  await prisma.subscription.update({
    where: { id: activeSubscription.id },
    data: { endsAt: now },
  });

  // 重置 monthlyResetAt
  await prisma.tokensAccount.update({
    where: { userId },
    data: { monthlyResetAt: now },
  });

  // 创建新本地 subscription（完整一个自然月）
  await prisma.subscription.create({
    data: {
      userId,
      plan: targetPlan,
      startsAt: now,
      endsAt: newPlanEndsAt,
      paymentRecordId: paymentRecord.id,
      stripeSubscriptionId: newStripeSubscriptionId,
    },
  });

  // 重置 tokens
  await resetUserMonthlyTokens({ userId });

  // track
  trackUserServerSide({
    userId,
    traitTypes: ["revenue"],
  });
}

/** @deprecated Use createUpgradeInvoice({ userId, targetPlan: SubscriptionPlan.max }) */
export async function createProToMaxInvoice({ userId }: { userId: number }) {
  return createUpgradeInvoice({ userId, targetPlan: SubscriptionPlan.max });
}
