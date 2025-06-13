"use server";
import { fetchActiveUserSubscription } from "@/app/account/lib";
import {
  PaymentMethod,
  ProductName,
  StripeMetadata,
  StripeNewPaymentParams,
} from "@/app/payment/data";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestOrigin } from "@/lib/request/headers";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";

export async function createStripeSession({
  userId,
  productName,
  currency,
  successUrl,
}: StripeNewPaymentParams) {
  if (currency !== "USD") {
    throw new Error("Only USD currency is supported");
  }

  const { activeSubscription, stripeSubscriptionId } = await fetchActiveUserSubscription({
    userId,
  });
  if (productName === ProductName.TOKENS1M) {
    // 只有会员才能充值
    if (!activeSubscription) {
      throw new Error("Recharge is only available to users with a valid subscription");
    }
  } else if (productName === ProductName.PRO1MONTH || productName === ProductName.MAX1MONTH) {
    // 如果当前套餐是自动续费的，不能继续
    if (stripeSubscriptionId) {
      throw new Error("Cannot continue with an active auto-renewing subscription");
    }
  }

  // const clientIp = await getRequestClientIp();
  const paymentMethod: PaymentMethod = PaymentMethod.stripe;

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
    where: { id: userId },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceId = (product.extra as any)?.price_id ?? null;
  if (!priceId) {
    throw new Error("Price ID is missing");
  }
  const lines = [
    {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: product.price,
      currency: product.currency,
      description: product.description,
    },
  ];
  const amount = lines.reduce((acc, line) => acc + line.price * line.quantity, 0);
  const description = lines.map((line) => line.description).join(", ");
  const siteOrigin = await getRequestOrigin();
  const mode = productName === ProductName.PRO1MONTH ? "subscription" : "payment";
  const metadata: StripeMetadata = {
    project: "atypica",
    deployRegion: getDeployRegion(),
    orderNo,
    productName, // 目前只有一个 product, 直接放进 metadata
  };
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    currency: "USD",
    mode: mode,
    success_url: successUrl || `${siteOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin}/payment/cancel?canceled=true`,
    automatic_tax: { enabled: true },
    metadata,
    client_reference_id: orderNo,
    ...(mode === "subscription"
      ? {
          subscription_data: {
            metadata,
          },
        }
      : {
          invoice_creation: {
            enabled: true,
            invoice_data: {
              metadata,
            },
          },
        }),
  });

  if (!session.url) {
    throw new Error("No session URL");
  }

  // Save the charge record to database
  const paymentRecord = await prisma.paymentRecord.create({
    data: {
      userId: userId,
      orderNo: orderNo,
      amount: amount, // Convert cents to yuan
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
