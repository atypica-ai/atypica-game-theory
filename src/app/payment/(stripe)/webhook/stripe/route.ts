import { stripeClient } from "@/app/payment/(stripe)/lib";
import {
  handleRechargePaymentSuccess,
  handleTeamSubscriptionPaymentSuccess,
  handleUserSubscriptionPaymentSuccess,
} from "@/app/payment/(stripe)/success";
import { cycleNewPaymentRecord, succeedPaymentRecord } from "@/app/payment/(stripe)/utils";
import { ProductName, StripeMetadata } from "@/app/payment/data";
import { rootLogger } from "@/lib/logging";
import { PaymentRecord } from "@/prisma/client";
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
      if (metadata.invoiceType === "ProToMaxUpgrade" || metadata.invoiceType === "PlanUpgrade") {
        // 升级 invoice 在创建时已经直接扣费了，这里跳过避免重复处理
        return NextResponse.json({ received: true }, { status: 200 });
      }
      let paymentRecord: PaymentRecord;
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
          paymentRecord = await succeedPaymentRecord({
            orderNo: metadata.orderNo,
            invoiceId,
            invoiceData,
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
            invoiceData,
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
