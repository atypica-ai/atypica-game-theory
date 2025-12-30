import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { checkCustomerSubscription } from "@/lib/aws-marketplace/entitlement";
import { rootLogger } from "@/lib/logging";

const logger = rootLogger.child({ module: "aws-marketplace-webhook" });

export async function POST(req: NextRequest) {
  const body = await req.json();

  logger.info({ msg: "SNS webhook received", type: body.Type });

  // 1. TODO: Verify SNS message signature (important for production!)
  // Use @aws-sdk/sns-validator or similar library to verify signature

  // 2. Handle SNS subscription confirmation
  if (body.Type === "SubscriptionConfirmation") {
    logger.info({ msg: "Processing subscription confirmation", subscribeURL: body.SubscribeURL });

    try {
      await fetch(body.SubscribeURL);
      logger.info({ msg: "SNS subscription confirmed" });
      return NextResponse.json({ status: "confirmed" });
    } catch (error) {
      logger.error({
        msg: "Failed to confirm SNS subscription",
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: "Failed to confirm subscription" }, { status: 500 });
    }
  }

  // 3. Handle subscription event notifications
  if (body.Type === "Notification") {
    const message = JSON.parse(body.Message);
    const customerIdentifier = message["customer-identifier"];
    const productCode = message["product-code"];
    const action = message.action;

    logger.info({
      msg: "Processing notification",
      customerIdentifier,
      productCode,
      action,
    });

    // Find customer
    const awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { customerIdentifier },
    });

    if (!awsCustomer) {
      logger.error({ msg: "Customer not found", customerIdentifier });
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Handle different event types
    try {
      switch (action) {
        case "subscribe-success": {
          // Subscription succeeded - get entitlement info
          logger.info({ msg: "Processing subscribe-success", customerIdentifier });
          const subscription = await checkCustomerSubscription(customerIdentifier);

          await prisma.aWSMarketplaceCustomer.update({
            where: { id: awsCustomer.id },
            data: {
              status: "active",
              subscribedAt: new Date(),
              dimension: subscription.plan,
              quantity: subscription.quantity,
              expiresAt: (subscription as { expiresAt?: Date | null }).expiresAt,
            },
          });

          logger.info({ msg: "Subscribe-success processed", customerIdentifier });
          break;
        }

        case "unsubscribe-pending": {
          // Unsubscribe pending
          logger.info({ msg: "Processing unsubscribe-pending", customerIdentifier });
          await prisma.aWSMarketplaceCustomer.update({
            where: { id: awsCustomer.id },
            data: {
              status: "cancelling",
            },
          });

          logger.info({ msg: "Unsubscribe-pending processed", customerIdentifier });
          break;
        }

        case "unsubscribe-success": {
          // Unsubscribe succeeded
          logger.info({ msg: "Processing unsubscribe-success", customerIdentifier });
          await prisma.aWSMarketplaceCustomer.update({
            where: { id: awsCustomer.id },
            data: {
              status: "cancelled",
              cancelledAt: new Date(),
            },
          });

          logger.info({ msg: "Unsubscribe-success processed", customerIdentifier });
          break;
        }

        case "entitlement-updated": {
          // Entitlement updated (renewal, upgrade, etc.)
          logger.info({ msg: "Processing entitlement-updated", customerIdentifier });
          const updatedSubscription = await checkCustomerSubscription(customerIdentifier);

          await prisma.aWSMarketplaceCustomer.update({
            where: { id: awsCustomer.id },
            data: {
              dimension: updatedSubscription.plan,
              quantity: updatedSubscription.quantity,
              expiresAt: (updatedSubscription as { expiresAt?: Date | null }).expiresAt,
            },
          });

          logger.info({ msg: "Entitlement-updated processed", customerIdentifier });
          break;
        }

        default:
          logger.warn({ msg: "Unknown action type", action, customerIdentifier });
      }

      // Record event log
      await prisma.aWSMarketplaceEvent.create({
        data: {
          customerId: awsCustomer.id,
          eventType: action,
          eventData: message,
        },
      });

      logger.info({ msg: "Event logged", customerIdentifier, action });

      return NextResponse.json({ status: "processed" });
    } catch (error) {
      logger.error({
        msg: "Failed to process notification",
        customerIdentifier,
        action,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json({ error: "Failed to process notification" }, { status: 500 });
    }
  }

  logger.warn({ msg: "Unknown message type, ignored", type: body.Type });
  return NextResponse.json({ status: "ignored" });
}
