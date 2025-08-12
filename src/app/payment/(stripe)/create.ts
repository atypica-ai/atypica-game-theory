import { fetchActiveSubscription } from "@/app/account/lib";
import { PaymentMethod, ProductName, StripeMetadata } from "@/app/payment/data";
import { stripeClient } from "@/app/payment/lib";
import { PRO_MONTHLY_GIFT, PRO_MONTHLY_TOKENS } from "@/app/payment/monthlyTokens";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestOrigin } from "@/lib/request/headers";
import { Currency, Product, SubscriptionPlan, User, UserExtra } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";

async function requirePersonalUser(userId: number) {
  const { tokens, email, ...user } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { tokens: true },
  });
  if (user.personalUserId || user.teamIdAsMember) {
    throw new Error("Only personal users can purchase");
  }
  if (!email) throw new Error("User must have an email");
  if (!tokens) throw new Error("User must have tokens");
  return {
    user: {
      ...user,
      email,
    },
    monthlyBalance: tokens.monthlyBalance,
  };
}

async function requireTeamlUser(userId: number) {
  const { teamAsMember, personalUser, ...user } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      // tokens: true,
      teamAsMember: true,
      personalUser: true,
    },
  });
  if (!user.personalUserId || !user.teamIdAsMember) {
    throw new Error("Only team users can purchase");
  }
  if (!personalUser || !personalUser.email) {
    throw new Error("User must be linked to a personal user with an email");
  }
  if (!teamAsMember) {
    throw new Error("User must be a member of a team");
  }
  return {
    teamUser: user,
    team: teamAsMember,
    email: personalUser.email,
  };
}

function generateOrderNo() {
  // Generate a unique order number
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNo = `ATP${randomPart}${timestamp}`;
  return orderNo;
}

async function createPaymentRecord({
  userId,
  orderNo,
  price,
  product,
  quantity,
  session,
}: {
  userId: number;
  orderNo: string;
  price: number;
  product: Product;
  quantity: number;
  session: Stripe.Checkout.Session;
}) {
  // const clientIp = await getRequestClientIp();
  const paymentMethod: PaymentMethod = PaymentMethod.stripe;
  const lines = [
    {
      productId: product.id,
      productName: product.name,
      quantity,
      price,
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
}

async function stripeCustomerIdForUser(user: User, email: string) {
  let stripeCustomerId = (user.extra as UserExtra).stripeCustomerId;
  if (stripeCustomerId) {
    return stripeCustomerId;
  }

  const stripe = stripeClient();
  stripeCustomerId = await stripe.customers
    .create({
      email: email,
      name: user.name,
      metadata: user.teamIdAsMember
        ? {
            teamId: user.teamIdAsMember.toString(),
            userId: user.id.toString(),
          }
        : { userId: user.id.toString() },
    })
    .then((customer) => customer.id);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      extra: {
        ...(user.extra as UserExtra),
        stripeCustomerId,
      },
    },
  });

  return stripeCustomerId;
}

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
  const { user, monthlyBalance: currentMonthlyBalance } = await requirePersonalUser(userId);

  let upgradeFrom: ProductName | null = null;
  const { activeSubscription } = await fetchActiveSubscription({ userId });
  if (productName === ProductName.PRO1MONTH) {
    // 如果当前有套餐，不能继续 PRO 会员购买
    if (activeSubscription) {
      throw new Error("Pro subscription is only available to users without an active subscription");
    }
  }
  if (productName === ProductName.MAX1MONTH) {
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
  }

  const orderNo = generateOrderNo();
  const product = await prisma.product.findUniqueOrThrow({
    where: {
      name_currency: { name: productName, currency: currency },
    },
  });

  const stripe = stripeClient();

  const amountInCents = product.price * 100;
  let discountAmountInCents = 0;
  let discountCoupon: string | null = null;
  if (productName === ProductName.MAX1MONTH && upgradeFrom === ProductName.PRO1MONTH) {
    const monthlyBalance = Math.max(currentMonthlyBalance, 0); // >=0
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
    recurring: { interval: "month" },
  };
  const quantity = 1;
  const stripeCustomerId = await stripeCustomerIdForUser(user, user.email);
  const session = await stripe.checkout.sessions.create({
    // customer_email: user.email,
    customer: stripeCustomerId,
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types: currency === "CNY" ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "subscription",
    subscription_data: { metadata },
    discounts: discountCoupon ? [{ coupon: discountCoupon }] : undefined,
    line_items: [{ price_data: priceData, quantity }],
    automatic_tax: { enabled: true },
    customer_update: { name: "auto", address: "auto", shipping: "auto" },
    success_url: successUrl || `${siteOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin}/payment/cancel?canceled=true`,
  });

  if (!session.url) {
    throw new Error("No session URL");
  }

  const finalPrice = (amountInCents - discountAmountInCents) / 100;
  await createPaymentRecord({
    userId,
    orderNo,
    price: finalPrice,
    product,
    quantity,
    session,
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
  const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
    product_data: {
      name: product.name,
      description: product.description,
    },
    currency: currency,
    unit_amount: amountInCents,
  };
  const quantity = 1;
  const stripeCustomerId = await stripeCustomerIdForUser(user, user.email);
  const session = await stripe.checkout.sessions.create({
    // customer_email: user.email,
    customer: stripeCustomerId,
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types: currency === "CNY" ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "payment",
    invoice_creation: {
      enabled: true,
      invoice_data: { metadata },
    },
    line_items: [{ price_data: priceData, quantity }],
    automatic_tax: { enabled: true },
    customer_update: { name: "auto", address: "auto", shipping: "auto" },
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
    session,
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
  const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
    product_data: {
      name: `${product.name} x ${quantity}`,
      description: `${product.description} (${quantity} seats)`,
    },
    currency: currency,
    unit_amount: amountInCents,
    recurring: { interval: "month" },
  };
  const stripeCustomerId = await stripeCustomerIdForUser(teamUser, personalUserEmail);
  const session = await stripe.checkout.sessions.create({
    // customer_email: email,
    customer: stripeCustomerId,
    client_reference_id: orderNo,
    currency: currency,
    payment_method_types: currency === "CNY" ? ["card", "alipay"] : ["card"],
    metadata,
    mode: "subscription",
    subscription_data: { metadata },
    line_items: [{ price_data: priceData, quantity }],
    automatic_tax: { enabled: true },
    customer_update: { name: "auto", address: "auto", shipping: "auto" },
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
    session,
  });

  return {
    sessionUrl: session.url,
  };
}
