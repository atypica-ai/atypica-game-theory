import { stripeClient } from "@/app/payment/(stripe)/lib";
import {
  handleRechargePaymentSuccess,
  handleTeamSubscriptionPaymentSuccess,
  handleUserSubscriptionPaymentSuccess,
} from "@/app/payment/(stripe)/success";
import { ProductName, StripeMetadata } from "@/app/payment/data";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { InputJsonValue } from "@prisma/client/runtime/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function checkInvoiceMetadata(invoiceData: Stripe.Invoice) {
  const metadata = (
    invoiceData.billing_reason === "manual"
      ? (invoiceData.metadata ?? null)
      : invoiceData.billing_reason === "subscription_create" ||
          invoiceData.billing_reason === "subscription_cycle"
        ? (invoiceData.parent?.subscription_details?.metadata ?? null)
        : null
  ) as StripeMetadata | null;
  // if (metadata?.project !== "atypica" || metadata.deployRegion !== getDeployRegion()) {
  //   rootLogger.info(`project or deployRegion not belong to this app, ignore invoice`);
  //   return null;
  // }
  // 不再判断 deployRegion，现在只有 us 区接收 webhook，不会重复
  if (metadata?.project !== "atypica") {
    rootLogger.info(`project not belong to this app, ignore invoice`);
    return null;
  }
  return metadata;
}

async function cycleNewPaymentRecord(
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
  await prisma.paymentLine.createMany({
    data: invoiceData.lines.data
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
      .filter((item): item is NonNullable<typeof item> => item !== null),
    // initial.paymentLines.map(
    //   ({ productId, productName, quantity, price, currency, description }) => ({
    //     paymentRecordId: paymentRecord.id,
    //     productId, productName, quantity, price, currency, description,
    //   }),
    // ),
  });
  return paymentRecord;
}

export async function POST(req: Request) {
  const payloadStr = await req.text();
  // rootLogger.info(`Stripe Webhook Received: ${payloadStr}`);
  const sig = req.headers.get("stripe-signature") || "";
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const stripe = stripeClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(payloadStr, sig, endpointSecret);
  } catch (error) {
    rootLogger.warn(`Stripe Webhook Error: ${error}`);
    return new Response("Webhook Error", { status: 400 });
  }
  switch (event.type) {
    case "invoice.payment_succeeded": {
      const invoiceData = event.data.object;
      const invoiceId = invoiceData.id; // This property is always present unless the invoice is an upcoming invoice.
      if (!invoiceId) {
        rootLogger.error(`Stripe Webhook Error: Invoice ID is missing`);
        return new Response("Invoice ID is missing", { status: 400 });
      }
      const metadata = checkInvoiceMetadata(invoiceData);
      if (!metadata) {
        return NextResponse.json({ received: true }, { status: 200 }); // ignore this event
      }
      if (metadata.invoiceType === "ProToMaxUpgrade") {
        // 创建 invoice 的时候自动扣费了，这里可以直接忽略
        // 没法通过 voiceData.billing_reason === "manual" 来判断，因为购买 TOKENS1M 的时候，也是 manual
        return NextResponse.json({ received: true }, { status: 200 });
      }
      let paymentRecord;
      if (invoiceData.billing_reason === "subscription_cycle") {
        if (await prisma.paymentRecord.findUnique({ where: { stripeInvoiceId: invoiceId } })) {
          rootLogger.error(`Payment record with chargeId/invoiceId ${invoiceId} already exists`);
          return new Response(`Duplicate webhook received for chargeId/invoiceId ${invoiceId}`, {
            status: 400,
          });
        }
        paymentRecord = await cycleNewPaymentRecord({ ...invoiceData, id: invoiceId }, metadata);
      } else {
        try {
          paymentRecord = await prisma.paymentRecord.update({
            where: {
              orderNo: metadata.orderNo,
              status: "pending", // 确保 pending -> succeeded 只更新一次
            },
            data: {
              status: "succeeded",
              paidAt: new Date(),
              stripeInvoiceId: invoiceId,
              stripeInvoice: invoiceData as unknown as InputJsonValue,
            },
          });
        } catch (error) {
          rootLogger.error(
            `Duplicate webhook detected for payment record ${metadata.orderNo} with session ${invoiceData.id}: ${(error as Error).message}`,
          );
          return new Response(`Duplicate webhook received for orderNo ${metadata.orderNo}`, {
            status: 400,
          });
        }
      }
      try {
        if (
          metadata.productName === ProductName.TEAMSEAT1MONTH ||
          metadata.productName === ProductName.SUPERTEAMSEAT1MONTH
        ) {
          await handleTeamSubscriptionPaymentSuccess({
            paymentRecord,
            productName: metadata.productName,
            invoiceData,
          });
        } else if (
          metadata.productName === ProductName.PRO1MONTH ||
          metadata.productName === ProductName.MAX1MONTH ||
          metadata.productName === ProductName.SUPER1MONTH
        ) {
          await handleUserSubscriptionPaymentSuccess({
            paymentRecord,
            productName: metadata.productName,
            invoiceData,
          });
        } else {
          await handleRechargePaymentSuccess({
            paymentRecord,
            productName: metadata.productName,
          });
        }
        return NextResponse.json({ received: true }, { status: 200 });
      } catch (error) {
        const errorMsg = `Failed to handle payment success: ${(error as Error).message}`;
        rootLogger.error(errorMsg);
        return new Response(errorMsg, { status: 500 });
      }
    }
    // case "checkout.session.completed": {
    //   const sessionData = event.data.object;
    //   const orderNo = sessionData.client_reference_id;
    //   if (!orderNo) {
    //     rootLogger.error(`Missing client_reference_id in Stripe webhook`);
    //     return new Response("Missing client_reference_id in webhook", { status: 400 });
    //   }
    //   try {
    //     // where status: "pending" 确保只更新一次
    //     await prisma.paymentRecord.update({
    //       where: { orderNo, status: "pending" },
    //       data: {
    //         status: "succeeded",
    //         paidAt: new Date(),
    //       },
    //     });
    //   } catch (error) {
    //     rootLogger.error(
    //       `Duplicate webhook detected for payment record ${orderNo} with session ${sessionData.id}`,
    //     );
    //     return new Response("Duplicate webhook received", { status: 400 });
    //   }
    //   await handlePaymentSuccess({ orderNo });
    //   return NextResponse.json({ received: true }, { status: 200 });
    // }
    default: {
      rootLogger.debug(`Unhandled event type ${event.type}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }
  }
}
