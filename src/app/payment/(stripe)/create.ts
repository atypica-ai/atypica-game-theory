import "server-only";

import { fetchActiveSubscription } from "@/app/account/lib";
import { stripeClient } from "@/app/payment/(stripe)/lib";
import { ProductName, StripeMetadata } from "@/app/payment/data";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestOrigin } from "@/lib/request/headers";
import { Currency, SubscriptionPlan } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import {
  createPaymentRecord,
  generateOrderNo,
  getAvailableCouponInfo,
  getOrCreateStripeCustomerIdForUser,
  getStripePriceIdForUser,
  requirePersonalUser,
  requireTeamlUser,
} from "./utils";

async function validateCouponId({ couponId, userId }: { couponId: string; userId: number }) {
  const available = await getAvailableCouponInfo(userId);
  if (!available || available.couponId !== couponId) {
    throw new Error("Invalid coupon");
  }
}

export async function createSubscriptionStripeSession({
  userId,
  productName,
  currency,
  successUrl,
  couponId,
}: {
  userId: number;
  productName: ProductName.PRO1MONTH | ProductName.MAX1MONTH | ProductName.SUPER1MONTH;
  currency: Currency;
  successUrl: string;
  couponId?: string;
}) {
  const {
    user,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    monthlyBalance: currentMonthlyBalance,
  } = await requirePersonalUser(userId);

  const { activeSubscription } = await fetchActiveSubscription({ userId });

  // Plan switching is not supported. Users must wait for current subscription to expire.
  // Note: Pro → Max upgrade is handled by upgradeFromProToMaxAction, not this function.
  if (activeSubscription) {
    throw new Error(
      `Cannot switch subscription plans. You have an active ${activeSubscription.plan} subscription. Please wait until it expires or contact support.`,
    );
  }

  const orderNo = generateOrderNo();
  const product = await prisma.product.findUniqueOrThrow({
    where: {
      name_currency: { name: productName, currency: currency },
    },
  });

  const stripe = stripeClient();

  const amountInCents = product.price * 100;
  const quantity = 1;

  const siteOrigin = await getRequestOrigin();
  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName, // 目前只有一个 product, 直接放进 metadata
  };

  const stripePriceId = getStripePriceIdForUser({ user, product });
  if (!stripePriceId) {
    throw new Error("Price ID is missing");
  }
  if (couponId) {
    await validateCouponId({ couponId, userId });
  }
  const discounts = couponId ? [{ coupon: couponId }] : undefined;
  const allow_promotion_codes = couponId ? undefined : true;
  const stripeCustomerId = await getOrCreateStripeCustomerIdForUser({
    userId,
    email: user.email,
    currency,
  });
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    customer_update: { name: "auto", address: "auto", shipping: "auto" },
    automatic_tax: { enabled: true },
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types:
      currency === "CNY" && amountInCents * quantity <= 800 * 100 ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "subscription",
    subscription_data: { metadata },
    discounts,
    allow_promotion_codes,
    line_items: [
      {
        // price_data: priceData,
        price: stripePriceId,
        quantity,
      },
    ],
    success_url: successUrl || `${siteOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin}/payment/cancel?canceled=true`,
  });

  if (!session.url) {
    throw new Error("No session URL");
  }

  const finalPrice = amountInCents / 100;
  // const finalPrice = (amountInCents - discountAmountInCents) / 100;
  await createPaymentRecord({
    userId,
    orderNo,
    price: finalPrice,
    product,
    quantity,
    stripeSession: session,
  });

  return {
    sessionUrl: session.url,
  };
}

export async function createPaymentStripeSession({
  userId,
  productName,
  currency,
  successUrl,
}: {
  userId: number;
  productName: ProductName.TOKENS1M;
  currency: Currency;
  successUrl: string;
}) {
  const { user } = await requirePersonalUser(userId);

  const { activeSubscription } = await fetchActiveSubscription({ userId });
  if (!activeSubscription) {
    throw new Error("Recharge is only available to users with a valid subscription");
  }
  if (
    activeSubscription.plan === SubscriptionPlan.super ||
    activeSubscription.plan === SubscriptionPlan.superteam
  ) {
    throw new Error("Recharge is not available to users with a super or superteam subscription");
  }

  const orderNo = generateOrderNo();
  const product = await prisma.product.findUniqueOrThrow({
    where: {
      name_currency: { name: productName, currency: currency },
    },
  });

  const stripe = stripeClient();

  const amountInCents = product.price * 100;
  const quantity = 1;

  const siteOrigin = await getRequestOrigin();
  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName, // 目前只有一个 product, 直接放进 metadata
  };

  const stripePriceId = getStripePriceIdForUser({ user, product });
  if (!stripePriceId) {
    throw new Error("Price ID is missing");
  }

  const stripeCustomerId = await getOrCreateStripeCustomerIdForUser({
    userId,
    email: user.email,
    currency,
  });
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    customer_update: { name: "auto", address: "auto", shipping: "auto" },
    automatic_tax: { enabled: true },
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types:
      currency === "CNY" && amountInCents * quantity <= 800 * 100 ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "payment",
    discounts: undefined, // 充值目前不支持折扣
    allow_promotion_codes: false, // 充值目前不支持 REDEEM 优惠券
    invoice_creation: {
      enabled: true,
      invoice_data: { metadata },
    },
    line_items: [
      {
        // price_data: priceData,
        price: stripePriceId,
        quantity,
      },
    ],
    success_url: successUrl || `${siteOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin}/payment/cancel?canceled=true`,
  });

  if (!session.url) {
    throw new Error("No session URL");
  }

  // const clientIp = await getRequestClientIp();
  const finalPrice = amountInCents / 100;

  await createPaymentRecord({
    userId,
    orderNo,
    price: finalPrice,
    product,
    quantity,
    stripeSession: session,
  });

  return {
    sessionUrl: session.url,
  };
}

export async function createTeamSubscriptionStripeSession({
  userId,
  productName,
  quantity,
  currency,
  successUrl,
  couponId,
}: {
  userId: number;
  productName: ProductName.TEAMSEAT1MONTH | ProductName.SUPERTEAMSEAT1MONTH;
  quantity: number;
  currency: Currency;
  successUrl: string;
  couponId?: string;
}) {
  if (quantity < 3) {
    throw new Error("Minimum 3 seats required for team subscription");
  }

  const {
    personalUserEmail,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    team,
    teamUser,
  } = await requireTeamlUser(userId);
  // team user 会取 team subscription
  const { activeSubscription: activeTeamSubscription } = await fetchActiveSubscription({ userId });

  // Team plan switching is not supported. Teams must wait for current subscription to expire.
  if (activeTeamSubscription) {
    throw new Error(
      `Cannot switch team subscription plans. Your team has an active ${activeTeamSubscription.plan} subscription. Please wait until it expires or contact support.`,
    );
  }

  const orderNo = generateOrderNo();

  const product = await prisma.product.findUniqueOrThrow({
    where: {
      name_currency: {
        name: productName,
        currency: currency,
      },
    },
  });

  const stripe = stripeClient();
  const amountInCents = product.price * 100;
  const siteOrigin = await getRequestOrigin();
  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName,
  };

  // const stripePriceId = product.stripePriceId;
  const stripePriceId = getStripePriceIdForUser({
    user: { id: teamUser.personalUserId }, // stripePriceId override 是针对个人用户的
    product,
  });
  if (!stripePriceId) {
    throw new Error("Price ID is missing");
  }
  if (couponId) {
    await validateCouponId({ couponId, userId });
  }
  const discounts = couponId ? [{ coupon: couponId }] : undefined;
  const allow_promotion_codes = couponId ? undefined : true;
  const stripeCustomerId = await getOrCreateStripeCustomerIdForUser({
    userId,
    email: personalUserEmail,
    currency,
  });
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    customer_update: { name: "auto", address: "auto", shipping: "auto" },
    automatic_tax: { enabled: true },
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types:
      currency === "CNY" && amountInCents * quantity <= 800 * 100 ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "subscription",
    subscription_data: { metadata },
    discounts,
    allow_promotion_codes,
    line_items: [
      {
        // price_data: priceData,
        price: stripePriceId,
        quantity,
      },
    ],
    success_url: successUrl || `${siteOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin}/payment/cancel?canceled=true`,
  });

  if (!session.url) {
    throw new Error("No session URL");
  }

  const finalPrice = amountInCents / 100;
  // description: `${product.description} (${quantity} seats)`,
  await createPaymentRecord({
    userId,
    orderNo,
    price: finalPrice,
    product,
    quantity,
    stripeSession: session,
  });

  return {
    sessionUrl: session.url,
  };
}
