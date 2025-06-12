import { StripeMetadata } from "@/app/payment/data";
import { handlePaymentSuccess } from "@/app/payment/lib";
import { rootLogger } from "@/lib/logging";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
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
  if (metadata?.project !== "atypica" || metadata.deployRegion !== getDeployRegion()) {
    rootLogger.info(`project or deployRegion not belong to this app, ignore invoice`);
    return null;
  }
  return metadata;
}

async function cycleNewPaymentRecord(invoiceData: Stripe.Invoice, metadata: StripeMetadata) {
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
      amount: initial.amount, // Convert cents to yuan
      currency: initial.currency,
      paymentMethod: initial.paymentMethod,
      chargeId: initial.chargeId + uniqueIdSuffix,
      credential: {},
      description: initial.description,
      status: "succeeded",
      paidAt: new Date(),
      charge: {
        invoice: invoiceData as unknown as InputJsonValue,
      },
    },
  });
  await prisma.paymentLine.createMany({
    data: initial.paymentLines.map(
      ({ productId, productName, quantity, price, currency, description }) => ({
        paymentRecordId: paymentRecord.id,
        productId,
        productName,
        quantity,
        price,
        currency,
        description,
      }),
    ),
  });
  return paymentRecord;
}

export async function POST(req: Request) {
  const payloadStr = await req.text();
  // rootLogger.info(`Stripe Webhook Received: ${payloadStr}`);
  const sig = req.headers.get("stripe-signature") || "";
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
      const metadata = checkInvoiceMetadata(invoiceData);
      if (!metadata) {
        return NextResponse.json({ received: true }, { status: 200 }); // ignore this event
      }
      let paymentRecord;
      if (invoiceData.billing_reason === "subscription_cycle") {
        paymentRecord = await cycleNewPaymentRecord(invoiceData, metadata);
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
              charge: {
                invoice: invoiceData as unknown as InputJsonValue,
              },
            },
          });
        } catch (error) {
          rootLogger.error(
            `Duplicate webhook detected for payment record ${metadata.orderNo} with session ${invoiceData.id}: ${(error as Error).message}`,
          );
          return new Response("Duplicate webhook received", { status: 400 });
        }
      }
      await handlePaymentSuccess({
        paymentRecord,
        productName: metadata.productName,
        invoiceData,
      });
      return NextResponse.json({ received: true }, { status: 200 });
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
