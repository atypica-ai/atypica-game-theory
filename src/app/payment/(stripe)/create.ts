import "server-only";

import { fetchActiveSubscription } from "@/app/account/lib";
import { ProductName, StripeMetadata } from "@/app/payment/data";
import { stripeClient } from "@/app/payment/lib";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestOrigin } from "@/lib/request/headers";
import { Currency, ProductExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import {
  createPaymentRecord,
  generateOrderNo,
  requirePersonalUser,
  requireTeamlUser,
} from "./utils";

export async function createSubscriptionStripeSession({
  userId,
  productName,
  currency,
  successUrl,
}: {
  userId: number;
  productName: ProductName.PRO1MONTH | ProductName.MAX1MONTH;
  currency: Currency;
  successUrl: string;
}) {
  const {
    user,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    monthlyBalance: currentMonthlyBalance,
  } = await requirePersonalUser(userId);

  // let upgradeFrom: ProductName | null = null;
  const { activeSubscription } = await fetchActiveSubscription({ userId });
  // 升级现在是一个单独的方法，这里凡是有 subscription 存在的都不继续
  if (activeSubscription) {
    throw new Error("This action is only available to users without an active subscription");
  }
  // if (productName === ProductName.PRO1MONTH) {
  //   // 如果当前有套餐，不能继续 PRO 会员购买
  //   if (activeSubscription) {
  //     throw new Error("Pro subscription is only available to users without an active subscription");
  //   }
  // }
  // if (productName === ProductName.MAX1MONTH) {
  //   // 如果当前套餐是 MAX，不能继续，如果当前套餐是 PRO，则这是一个升级套餐
  //   if (activeSubscription) {
  //     if (activeSubscription.plan === SubscriptionPlan.pro) {
  //       upgradeFrom = ProductName.PRO1MONTH;
  //     } else {
  //       throw new Error(
  //         "Max subscription is only available to users with a PRO subscription or without an existing subscription",
  //       );
  //     }
  //   }
  // }

  const orderNo = generateOrderNo();
  const product = await prisma.product.findUniqueOrThrow({
    where: {
      name_currency: { name: productName, currency: currency },
    },
  });

  const stripe = stripeClient();

  const amountInCents = product.price * 100;
  // 这部分现在用不到了，但是代码保留一段日子
  // let discountAmountInCents = 0;
  // let discountCoupon: string | null = null;
  // if (productName === ProductName.MAX1MONTH && upgradeFrom === ProductName.PRO1MONTH) {
  //   const monthlyBalance = Math.max(currentMonthlyBalance, 0); // >=0
  //   const monthlyInitial = PRO_MONTHLY_TOKENS + PRO_MONTHLY_GIFT;
  //   const proProduct = await prisma.product.findUniqueOrThrow({
  //     where: {
  //       name_currency: { name: ProductName.PRO1MONTH, currency: currency },
  //     },
  //   });
  //   discountAmountInCents = Math.floor(proProduct.price * 100 * (monthlyBalance / monthlyInitial));
  //   if (discountAmountInCents > 0) {
  //     // 动态创建一次性折扣券
  //     const coupon = await stripe.coupons.create({
  //       amount_off: discountAmountInCents,
  //       currency: currency,
  //       duration: "once", // 只应用一次
  //       name: currency === "CNY" ? `PRO升级到MAX套餐扣减` : `Pro to Max Upgrade Credit`,
  //       max_redemptions: 1, // 只能使用1次
  //       redeem_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24小时后过期
  //     });
  //     discountCoupon = coupon.id;
  //   }
  // }

  const siteOrigin = await getRequestOrigin();
  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName, // 目前只有一个 product, 直接放进 metadata
  };
  // const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
  //   product_data: {
  //     name: product.name,
  //     description: product.description,
  //   },
  //   currency: currency,
  //   unit_amount: amountInCents,
  //   recurring: { interval: "month" },
  // };
  const stripePriceId = (product.extra as ProductExtra).stripePriceId;
  if (!stripePriceId) {
    throw new Error("Price ID is missing");
  }
  const quantity = 1;
  // const stripeCustomerId = await stripeCustomerIdForUser(user, user.email);
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    // 不再给 user 固定 stripeCustomerId, 一个 customer 只支持一种 currency，如果有 usd 的 subscription 就没法用 rmb 充值了，所以，索性简单点每次都重新创建
    // customer: stripeCustomerId,
    // 如果是固定 stripe customer id 并且开启 automatic_tax，必须配置 customer_update 的策略
    // customer_update: { name: "auto", address: "auto", shipping: "auto" },
    automatic_tax: { enabled: true },
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types: currency === "CNY" ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "subscription",
    subscription_data: { metadata },
    // discounts: discountCoupon ? [{ coupon: discountCoupon }] : undefined,
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
    chargeId: session.id,
    charge: session,
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

  const orderNo = generateOrderNo();
  const product = await prisma.product.findUniqueOrThrow({
    where: {
      name_currency: { name: productName, currency: currency },
    },
  });

  const stripe = stripeClient();

  const amountInCents = product.price * 100;
  const siteOrigin = await getRequestOrigin();
  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName, // 目前只有一个 product, 直接放进 metadata
  };
  // const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
  //   product_data: {
  //     name: product.name,
  //     description: product.description,
  //   },
  //   currency: currency,
  //   unit_amount: amountInCents,
  // };
  const stripePriceId = (product.extra as ProductExtra).stripePriceId;
  if (!stripePriceId) {
    throw new Error("Price ID is missing");
  }
  const quantity = 1;
  // const stripeCustomerId = await stripeCustomerIdForUser(user, user.email);
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    // customer: stripeCustomerId,
    // customer_update: { name: "auto", address: "auto", shipping: "auto" },
    automatic_tax: { enabled: true },
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types: currency === "CNY" ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "payment",
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
    chargeId: session.id,
    charge: session,
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
}: {
  userId: number;
  productName: ProductName.TEAMSEAT1MONTH;
  quantity: number;
  currency: Currency;
  successUrl: string;
}) {
  if (quantity < 3) {
    throw new Error("Minimum 3 seats required for team subscription");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email: personalUserEmail, team, teamUser } = await requireTeamlUser(userId);
  // team user 会取 team subscription
  const { activeSubscription: activeTeamSubscription } = await fetchActiveSubscription({ userId });
  // 如果当前有套餐，不能继续 PRO 会员购买
  if (activeTeamSubscription) {
    throw new Error("Team subscription is only available to teams without an active subscription");
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
    productName: ProductName.TEAMSEAT1MONTH,
  };
  // const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
  //   product_data: {
  //     name: `${product.name} x ${quantity}`,
  //     description: `${product.description} (${quantity} seats)`,
  //   },
  //   currency: currency,
  //   unit_amount: amountInCents,
  //   recurring: { interval: "month" },
  // };
  // const stripeCustomerId = await stripeCustomerIdForUser(teamUser, personalUserEmail);
  const stripePriceId = (product.extra as ProductExtra).stripePriceId;
  if (!stripePriceId) {
    throw new Error("Price ID is missing");
  }
  const session = await stripe.checkout.sessions.create({
    customer_email: personalUserEmail,
    // customer: stripeCustomerId,
    // customer_update: { name: "auto", address: "auto", shipping: "auto" },
    automatic_tax: { enabled: true },
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types: currency === "CNY" ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "subscription",
    subscription_data: { metadata },
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
    chargeId: session.id,
    charge: session,
  });

  return {
    sessionUrl: session.url,
  };
}
