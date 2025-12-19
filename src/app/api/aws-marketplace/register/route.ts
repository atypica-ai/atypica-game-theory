import { NextRequest, NextResponse } from "next/server";
import { MarketplaceMetering } from "@aws-sdk/client-marketplace-metering";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";

const logger = rootLogger.child({ module: "aws-marketplace-register" });

const marketplaceClient = new MarketplaceMetering({
  region: "us-east-1", // AWS Marketplace fixed region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("x-amzn-marketplace-token");

  if (!token) {
    logger.error({ msg: "Missing marketplace token in registration request" });
    return NextResponse.json({ error: "Missing marketplace token" }, { status: 400 });
  }

  try {
    // 1. Call AWS ResolveCustomer API to verify token
    logger.info({ msg: "Resolving AWS Marketplace customer", token });
    const response = await marketplaceClient.resolveCustomer({
      RegistrationToken: token,
    });

    const { CustomerIdentifier, ProductCode } = response;

    if (!CustomerIdentifier || !ProductCode) {
      logger.error({ msg: "Invalid AWS response", response });
      throw new Error("Invalid AWS response");
    }

    logger.info({
      msg: "AWS customer resolved",
      customerIdentifier: CustomerIdentifier,
      productCode: ProductCode,
    });

    // 2. Check if customer already exists
    const awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { customerIdentifier: CustomerIdentifier },
      include: { user: true },
    });

    if (awsCustomer) {
      // Existing customer - redirect to signin page with customer info
      logger.info({
        msg: "Existing AWS customer found",
        userId: awsCustomer.userId,
        customerIdentifier: CustomerIdentifier,
      });

      const signinUrl = new URL("/auth/signin", req.url);
      signinUrl.searchParams.set("awsCustomer", "true");
      signinUrl.searchParams.set("email", awsCustomer.user.email || "");
      signinUrl.searchParams.set("redirect", "/");

      return NextResponse.redirect(signinUrl);
    }

    // 3. New customer - redirect to AWS Marketplace signup page
    logger.info({
      msg: "New AWS customer, redirecting to signup",
      customerIdentifier: CustomerIdentifier,
    });

    const signupUrl = new URL("/auth/aws-marketplace-signup", req.url);
    signupUrl.searchParams.set("customerIdentifier", CustomerIdentifier);
    signupUrl.searchParams.set("productCode", ProductCode);

    return NextResponse.redirect(signupUrl);
  } catch (error) {
    logger.error({
      msg: "AWS Marketplace registration error",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
