import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { checkCustomerSubscription } from "@/lib/aws-marketplace/entitlement";
import { rootLogger } from "@/lib/logging";

const logger = rootLogger.child({ module: "aws-marketplace-link-customer" });

export async function POST(req: NextRequest) {
  try {
    const { userId, customerIdentifier, productCode } = await req.json();

    if (!userId || !customerIdentifier || !productCode) {
      logger.error({ msg: "Missing required parameters", userId, customerIdentifier, productCode });
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    logger.info({
      msg: "Linking AWS customer to user",
      userId,
      customerIdentifier,
      productCode,
    });

    // Check if customer already exists
    const existingCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { customerIdentifier },
    });

    if (existingCustomer) {
      logger.error({
        msg: "Customer already linked",
        customerIdentifier,
        existingUserId: existingCustomer.userId,
      });
      return NextResponse.json(
        { error: "This AWS customer is already linked to another account" },
        { status: 409 },
      );
    }

    // Check if user already has AWS customer
    const existingUserCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { userId },
    });

    if (existingUserCustomer) {
      logger.error({
        msg: "User already has AWS customer",
        userId,
        existingCustomerIdentifier: existingUserCustomer.customerIdentifier,
      });
      return NextResponse.json(
        { error: "User already has an AWS Marketplace subscription" },
        { status: 409 },
      );
    }

    // Get subscription information
    const subscription = await checkCustomerSubscription(customerIdentifier);

    // Create AWS Marketplace customer record
    await prisma.aWSMarketplaceCustomer.create({
      data: {
        userId,
        customerIdentifier,
        productCode,
        status: subscription.active ? "active" : "pending",
        dimension: subscription.plan,
        quantity: subscription.quantity,
        subscribedAt: subscription.active ? new Date() : null,
        expiresAt: subscription.expiresAt,
      },
    });

    logger.info({
      msg: "AWS customer linked successfully",
      userId,
      customerIdentifier,
      status: subscription.active ? "active" : "pending",
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    logger.error({
      msg: "Failed to link AWS customer",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ error: "Failed to link customer" }, { status: 500 });
  }
}
