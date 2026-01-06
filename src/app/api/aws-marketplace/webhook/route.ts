import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { checkCustomerSubscription } from "@/lib/aws-marketplace/entitlement";
import { parseAndVerifySNSBody, type ValidatedSNSMessage } from "@/lib/aws-marketplace/sns-validator";
import { rootLogger } from "@/lib/logging";
import { isActiveSubscription } from "@/lib/aws-marketplace/types";

const logger = rootLogger.child({ module: "aws-marketplace-webhook" });

export async function POST(req: NextRequest) {
  // Get raw body for signature verification
  const rawBody = await req.text();

  logger.info({ msg: "SNS webhook received" });

  // Verify SNS message signature
  let message: ValidatedSNSMessage;
  try {
    message = await parseAndVerifySNSBody(rawBody);
    logger.info({
      msg: "SNS message signature verified",
      messageType: message.Type,
      messageId: message.MessageId,
    });
  } catch (error) {
    logger.error({
      msg: "SNS message signature verification failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Invalid SNS message signature" },
      { status: 403 }
    );
  }

  // Handle SNS subscription confirmation
  if (message.Type === "SubscriptionConfirmation") {
    logger.info({
      msg: "Processing subscription confirmation",
      subscribeURL: message.SubscribeURL,
    });

    try {
      await fetch(message.SubscribeURL!);
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

  // Handle subscription event notifications
  if (message.Type === "Notification") {
    const notification = JSON.parse(message.Message);
    const customerIdentifier = notification["customer-identifier"];
    const productCode = notification["product-code"];
    const action = notification.action;

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
              expiresAt: subscription.expiresAt || null,
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

          // Update customer record
          await prisma.aWSMarketplaceCustomer.update({
            where: { id: awsCustomer.id },
            data: {
              dimension: updatedSubscription.plan,
              quantity: updatedSubscription.quantity,
              expiresAt: updatedSubscription.expiresAt || null,
            },
          });

          // Find team and active subscriptions
          const team = await prisma.team.findFirst({
            where: { ownerUserId: awsCustomer.userId },
            include: {
              subscriptions: {
                where: {
                  plan: { in: ["team", "superteam"] },
                  endsAt: { gt: new Date() },
                },
                orderBy: { endsAt: "desc" },
              },
            },
          });

          // Only process if subscription is active and has expiration date
          if (isActiveSubscription(updatedSubscription) && team && team.subscriptions.length > 0) {
            // Update subscription end date
            const currentSubscription = team.subscriptions[0];
            await prisma.subscription.update({
              where: { id: currentSubscription.id },
              data: { endsAt: updatedSubscription.expiresAt },
            });

            // Reset team monthly tokens
            const { resetTeamMonthlyTokens } = await import("@/app/payment/monthlyTokens");
            await resetTeamMonthlyTokens({
              teamId: team.id,
              forceReset: true, // Force reset since subscription renewed
            });

            logger.info({
              msg: "AWS subscription renewed and tokens reset",
              customerIdentifier,
              teamId: team.id,
              newEndsAt: updatedSubscription.expiresAt,
            });
          } else {
            logger.warn({
              msg: "AWS subscription renewal: team or active subscription not found",
              customerIdentifier,
              teamId: team?.id,
              subscriptionsCount: team?.subscriptions.length ?? 0,
              isActive: isActiveSubscription(updatedSubscription),
            });
          }

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
          eventData: notification,
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

  logger.warn({ msg: "Unknown message type, ignored", type: message.Type });
  return NextResponse.json({ status: "ignored" });
}
