import "server-only";

import { stripeClient } from "@/app/payment/(stripe)/lib";
import { PaymentMethod } from "@/app/payment/data";
import { PaymentRecord, PaymentStatus, Product } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import Stripe from "stripe";

export async function requirePersonalUser(userId: number) {
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

export async function requireTeamlUser(userId: number) {
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

  return paymentRecord;
}

export async function retrievePlanStartEnd({ invoice }: { invoice: Stripe.Invoice }): Promise<{
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
