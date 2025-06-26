"use server";
import { fetchActiveUserSubscription } from "@/app/(account)/account/lib";
import {
  PaymentMethod,
  ProductName,
  StripeMetadata,
  StripeNewPaymentParams,
} from "@/app/payment/data";
import { PRO_MONTHLY_GIFT, PRO_MONTHLY_TOKENS, stripeClient } from "@/app/payment/lib";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestOrigin } from "@/lib/request/headers";
import { SubscriptionPlan } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";

export async function createStripeSession({
  userId,
  productName,
  currency,
  successUrl,
}: StripeNewPaymentParams) {
  // if (currency !== "USD") {
  //   throw new Error("Only USD currency is supported");
  // }

  let mode: "subscription" | "payment";
  let upgradeFrom: ProductName | null = null;
  const { activeSubscription } = await fetchActiveUserSubscription({ userId });
  if (productName === ProductName.TOKENS1M) {
    // 只有会员才能充值
    if (!activeSubscription) {
      throw new Error("Recharge is only available to users with a valid subscription");
    }
    mode = "payment";
  } else if (productName === ProductName.PRO1MONTH) {
    // 如果当前有套餐，不能继续 PRO 会员购买
    if (activeSubscription) {
      throw new Error("Pro subscription is only available to users without an active subscription");
    }
    mode = "subscription";
  } else if (productName === ProductName.MAX1MONTH) {
    // 如果当前套餐是 MAX，不能继续，如果当前套餐是 PRO，则这是一个升级套餐
    if (activeSubscription) {
      if (activeSubscription.plan === SubscriptionPlan.pro) {
        upgradeFrom = ProductName.PRO1MONTH;
      } else {
        throw new Error(
          "Max subscription is only available to users with a PRO subscription or without an existing subscription",
        );
      }
    }
    mode = "subscription";
  } else {
    throw new Error("Invalid product name");
  }

  // Generate a unique order number
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNo = `ATP${randomPart}${timestamp}`;
  const product = await prisma.product.findUniqueOrThrow({
    where: {
      name_currency: { name: productName, currency: currency },
    },
  });
  const user = await prisma.user.findUniqueOrThrow({
    include: {
      tokens: true,
    },
    where: {
      id: userId,
    },
  });

  const stripe = stripeClient();

  const amountInCents = product.price * 100;
  let discountAmountInCents = 0;
  let discountCoupon: string | null = null;
  if (productName === ProductName.MAX1MONTH && upgradeFrom === ProductName.PRO1MONTH) {
    const monthlyBalance = Math.max(user.tokens?.monthlyBalance ?? 0, 0); // >=0
    const monthlyInitial = PRO_MONTHLY_TOKENS + PRO_MONTHLY_GIFT;
    const proProduct = await prisma.product.findUniqueOrThrow({
      where: {
        name_currency: { name: ProductName.PRO1MONTH, currency: currency },
      },
    });
    discountAmountInCents = Math.floor(proProduct.price * 100 * (monthlyBalance / monthlyInitial));
    if (discountAmountInCents > 0) {
      // 动态创建一次性折扣券
      const coupon = await stripe.coupons.create({
        amount_off: discountAmountInCents,
        currency: currency,
        duration: "once", // 只应用一次
        name: currency === "CNY" ? `PRO升级到MAX套餐扣减` : `Pro to Max Upgrade Credit`,
        max_redemptions: 1, // 只能使用1次
        redeem_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24小时后过期
      });
      discountCoupon = coupon.id;
    }
  }
  // const priceId = (product.extra as any)?.price_id ?? null;
  // if (!priceId) {
  //   throw new Error("Price ID is missing");
  // }
  const siteOrigin = await getRequestOrigin();
  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName, // 目前只有一个 product, 直接放进 metadata
  };
  const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
    product_data: {
      name: product.name,
      description: product.description,
    },
    currency: currency,
    unit_amount: amountInCents,
  };
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types: currency === "CNY" ? ["card", "alipay"] : ["card"],
    metadata,
    mode: mode,
    // line_items: [{ price: priceId, quantity: 1 }],
    ...(mode === "subscription"
      ? {
          subscription_data: { metadata },
          discounts: discountCoupon ? [{ coupon: discountCoupon }] : undefined,
          line_items: [
            {
              price_data: {
                ...priceData,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
        }
      : {
          invoice_creation: {
            enabled: true,
            invoice_data: { metadata },
          },
          line_items: [
            {
              price_data: priceData,
              quantity: 1,
            },
          ],
        }),
    automatic_tax: { enabled: true },
    success_url: successUrl || `${siteOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin}/payment/cancel?canceled=true`,
  });

  if (!session.url) {
    throw new Error("No session URL");
  }

  // const clientIp = await getRequestClientIp();
  const paymentMethod: PaymentMethod = PaymentMethod.stripe;
  const finalPrice = Math.floor((amountInCents - discountAmountInCents) / 100);
  const lines = [
    {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: finalPrice,
      currency: product.currency,
      description: product.description,
    },
  ];
  const amount = lines.reduce((acc, line) => acc + line.price * line.quantity, 0);
  const description = lines.map((line) => line.description).join(", ");
  // Save the charge record to database
  const paymentRecord = await prisma.paymentRecord.create({
    data: {
      userId: userId,
      orderNo: orderNo,
      amount: amount,
      currency: product.currency,
      status: "pending",
      paymentMethod: paymentMethod,
      chargeId: session.id, // 这个在 stripe 里没有用，只是存储一下
      charge: session as unknown as InputJsonValue, // 这个在 stripe 里没有用，只是存储一下
      credential: {},
      description: description,
    },
  });

  await prisma.paymentLine.createMany({
    data: lines.map((line) => ({
      paymentRecordId: paymentRecord.id,
      ...line,
    })),
  });

  // return { session } as {
  //   session: Omit<typeof session, "url"> & { url: string };
  // };

  return {
    sessionUrl: session.url,
  };
}
