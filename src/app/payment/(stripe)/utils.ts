import "server-only";

import { stripeClient } from "@/app/payment/(stripe)/lib";
import { PaymentMethod, ProductName, StripeMetadata } from "@/app/payment/data";
import { trackEventServerSide } from "@/lib/analytics/server";
import { rootLogger } from "@/lib/logging";
import { PaymentRecord, PaymentStatus, Product, UserProfileExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { InputJsonValue } from "@prisma/client/runtime/client";
import { after } from "next/server";
import Stripe from "stripe";

export async function requirePersonalUser(userId: number) {
  const { tokensAccount, profile, email, ...user } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      tokensAccount: true,
      profile: true,
    },
  });
  if (user.personalUserId || user.teamIdAsMember) {
    throw new Error("Only personal users can purchase");
  }
  if (!email) throw new Error("User must have an email");
  if (!tokensAccount) throw new Error("User must have tokens");
  if (!profile) throw new Error("User must have a profile");
  return {
    user: {
      id: user.id,
      email,
    },
    userProfileExtra: profile.extra as UserProfileExtra,
    monthlyBalance: tokensAccount.monthlyBalance,
  };
}

export async function requireTeamlUser(userId: number) {
  const { teamAsMember, personalUser, ...user } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      // tokens: true,
      teamAsMember: true,
      personalUser: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!user.personalUserId || !user.teamIdAsMember) {
    throw new Error("Only team users can purchase");
  }
  if (!personalUser || !personalUser.email || !personalUser.profile) {
    throw new Error("User must be linked to a personal user with an email and profile");
  }
  if (!teamAsMember) {
    throw new Error("User must be a member of a team");
  }
  return {
    teamUser: user,
    team: teamAsMember,
    personalUserEmail: personalUser.email,
    personalUserProfileExtra: personalUser.profile.extra as UserProfileExtra,
  };
}

export function getStripePriceIdForUser({
  user,
  product,
}: {
  user: { id: number | null };
  product: Pick<Product, "extra" | "stripePriceId">;
}) {
  const extra = product.extra as unknown as {
    override?: { userIds: number[]; stripePriceId: string };
  };
  if (user.id && extra?.override?.userIds?.includes(user.id)) {
    return extra.override.stripePriceId;
  } else {
    return product.stripePriceId;
  }
}

export function generateOrderNo() {
  // Generate a unique order number
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNo = `ATP${randomPart}${timestamp}`;
  return orderNo;
}

export async function createPaymentRecord(args: {
  userId: number;
  orderNo: string;
  status?: PaymentStatus;
  price: number;
  product: Product;
  quantity: number;
  stripeSession: Stripe.Checkout.Session;
}): Promise<PaymentRecord>;

export async function createPaymentRecord(args: {
  userId: number;
  orderNo: string;
  status?: PaymentStatus;
  price: number;
  product: Product;
  quantity: number;
  stripeInvoice: Stripe.Invoice;
}): Promise<PaymentRecord>;

export async function createPaymentRecord({
  userId,
  orderNo,
  status = "pending",
  price,
  product,
  quantity,
  stripeSession,
  stripeInvoice,
}: {
  userId: number;
  orderNo: string;
  status?: PaymentStatus;
  price: number;
  product: Product;
  quantity: number;
  stripeSession?: Stripe.Checkout.Session;
  stripeInvoice?: Stripe.Invoice;
  // chargeId: string;
  // charge: Stripe.Checkout.Session | Stripe.Invoice;
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
      status: status,
      paymentMethod: paymentMethod,
      ...(stripeSession ? { stripeSession: stripeSession as unknown as InputJsonValue } : {}),
      ...(stripeInvoice
        ? {
            stripeInvoiceId: stripeInvoice.id,
            stripeInvoice: stripeInvoice as unknown as InputJsonValue,
          }
        : {}),
      // chargeId: chargeId, // 这个在 stripe 里没有用，只是存储一下
      // charge: charge as unknown as InputJsonValue, // 这个在 stripe 里没有用，只是存储一下
      description: description,
    },
  });

  await prisma.paymentLine.createMany({
    data: lines.map((line) => ({
      paymentRecordId: paymentRecord.id,
      ...line,
    })),
  });

  trackEventServerSide({
    userId,
    event: "Checkout Started",
    properties: {
      paymentRecordId: paymentRecord.id,
      currency: paymentRecord.currency,
      price: paymentRecord.amount,
      productName: lines[0]?.productName as ProductName | undefined,
    },
  });

  return paymentRecord;
}

export async function cycleNewPaymentRecord(
  invoiceData: Omit<Stripe.Invoice, "id"> & { id: string },
  metadata: StripeMetadata,
) {
  const invoiceId = invoiceData.id;
  const initial = await prisma.paymentRecord.findUniqueOrThrow({
    where: { orderNo: metadata.orderNo },
    include: { paymentLines: true },
  });
  const count = await prisma.paymentRecord.count({
    where: { orderNo: { startsWith: metadata.orderNo } },
  });
  const uniqueIdSuffix = `-${count}`;
  const paymentRecord = await prisma.paymentRecord.create({
    data: {
      userId: initial.userId,
      orderNo: initial.orderNo + uniqueIdSuffix,
      // amount: initial.amount, // Convert cents to yuan
      // initial amount 可能是升级套餐折扣后的，不能直接复制过来，世纪金额要以 invoiceData 上的为准，一般就是套餐的原价
      amount: invoiceData.total / 100,
      currency: invoiceData.currency === "cny" ? "CNY" : "USD",
      paymentMethod: "stripe",
      stripeInvoiceId: invoiceId,
      stripeInvoice: invoiceData as unknown as InputJsonValue,
      description: initial.description,
      status: "succeeded",
      paidAt: new Date(),
    },
  });

  const lines = invoiceData.lines.data
    .map((line) => {
      // 对于续费，line.metadata 可能为空，使用 metadata.productName（从 subscription metadata 传递过来）
      const productName = line.metadata?.productName || metadata.productName;
      const paymentLine = initial.paymentLines.find((p) => p.productName === productName);
      return paymentLine
        ? {
            paymentRecordId: paymentRecord.id,
            productId: paymentLine.productId,
            productName: productName,
            quantity: line.quantity ?? paymentLine.quantity,
            price: line.amount / 100,
            currency: (line.currency === "cny" ? "CNY" : "USD") as "CNY" | "USD",
            description: line.description ?? paymentLine.description,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  // initial.paymentLines.map(
  //   ({ productId, productName, quantity, price, currency, description }) => ({
  //     paymentRecordId: paymentRecord.id,
  //     productId, productName, quantity, price, currency, description,
  //   }),
  // ),
  await prisma.paymentLine.createMany({
    data: lines,
  });

  trackEventServerSide({
    userId: initial.userId,
    event: "Order Completed",
    properties: {
      paymentRecordId: paymentRecord.id,
      currency: paymentRecord.currency,
      price: paymentRecord.amount,
      productName: lines[0]?.productName as ProductName | undefined,
      renew: true,
    },
  });

  return paymentRecord;
}

export async function succeedPaymentRecord({
  orderNo,
  invoiceId,
  invoiceData,
}: {
  orderNo: string;
  invoiceId: string;
  invoiceData: Stripe.Invoice;
}) {
  const paymentRecord = await prisma.paymentRecord.update({
    where: {
      orderNo: orderNo,
      status: "pending", // 确保 pending -> succeeded 只更新一次
    },
    data: {
      status: "succeeded",
      paidAt: new Date(),
      stripeInvoiceId: invoiceId,
      stripeInvoice: invoiceData as unknown as InputJsonValue,
    },
  });

  after(async () => {
    const line = await prisma.paymentLine.findFirst({
      where: { paymentRecordId: paymentRecord.id },
      orderBy: { id: "asc" },
    });
    trackEventServerSide({
      userId: paymentRecord.userId,
      event: "Order Completed",
      properties: {
        paymentRecordId: paymentRecord.id,
        currency: paymentRecord.currency,
        price: paymentRecord.amount,
        productName: line?.productName as ProductName | undefined,
      },
    });
  });

  return paymentRecord;
}

export async function retrieveStripeSubscriptionDetails({
  invoice,
}: {
  invoice: Stripe.Invoice;
}): Promise<{
  stripeSubscriptionId: string;
  planStartsAt: Date;
  planEndsAt: Date;
}> {
  const subscription_details = invoice.parent?.subscription_details;
  if (!subscription_details) {
    throw new Error("Subscription details missing on invoice");
  }

  let stripeSubscriptionId: string;
  if (typeof subscription_details.subscription === "string") {
    stripeSubscriptionId = subscription_details.subscription;
  } else {
    stripeSubscriptionId = subscription_details.subscription.id;
  }

  const stripe = stripeClient();
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const stripeSubscriptionItem = stripeSubscription.items.data[0];
  if (!stripeSubscriptionItem) {
    throw new Error(`Subscription item not found on stripe subscription ${stripeSubscriptionId}`);
  }
  const planStartsAt = new Date(stripeSubscriptionItem.current_period_start * 1000);
  const planEndsAt = new Date(stripeSubscriptionItem.current_period_end * 1000);

  return {
    stripeSubscriptionId,
    planStartsAt,
    planEndsAt,
  };
}

// async function stripeCustomerIdForUser(user: User, email: string) {
//   let stripeCustomerId = (user.extra as UserExtra).stripeCustomerId;
//   if (stripeCustomerId) {
//     return stripeCustomerId;
//   }
//   const stripe = stripeClient();
//   stripeCustomerId = await stripe.customers
//     .create({
//       email: email,
//       name: user.name,
//       metadata: user.teamIdAsMember
//         ? {
//             teamId: user.teamIdAsMember.toString(),
//             userId: user.id.toString(),
//           }
//         : { userId: user.id.toString() },
//     })
//     .then((customer) => customer.id);
//   await prisma.user.update({
//     where: { id: user.id },
//     data: {
//       extra: {
//         ...(user.extra as UserExtra),
//         stripeCustomerId,
//       },
//     },
//   });
//   return stripeCustomerId;
// }

export async function availableCoupons({
  userId,
  userProfileExtra,
}: {
  userId: number; // 不是 personalUser, 而是当前用户
  userProfileExtra: UserProfileExtra;
}) {
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined = undefined;
  try {
    if (userProfileExtra.tolt?.via) {
      // 通过 affiliate 项目进来的用户首次付款享受九折
      const successfulPayment = await prisma.paymentRecord.findFirst({
        where: { userId, status: "succeeded" },
        select: { id: true },
      });
      if (!successfulPayment) {
        rootLogger.info(`User ${userId} eligible for affiliate discount`);
        discounts = [{ coupon: "AFFILIATE10" }];
      } else {
        rootLogger.info(
          `User ${userId} eligible for affiliate discount but already has a successful payment`,
        );
      }
    }
  } catch (error) {
    rootLogger.error({
      msg: "Error fetching available coupons",
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
  return discounts;
}
