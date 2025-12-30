import { NextRequest, NextResponse } from "next/server";
import { MarketplaceMetering } from "@aws-sdk/client-marketplace-metering";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { createAWSMarketplaceUserWithTeam, recordLastLogin } from "@/app/(auth)/lib";
import { SignJWT } from "jose";

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
      // Existing customer - log in and redirect to home
      logger.info({
        msg: "Existing AWS customer found, logging in",
        userId: awsCustomer.userId,
        customerIdentifier: CustomerIdentifier,
      });

      // Check subscription status
      if (awsCustomer.status !== "active") {
        logger.warn({
          msg: "AWS subscription not active",
          customerIdentifier: CustomerIdentifier,
          status: awsCustomer.status,
        });
        return NextResponse.redirect(
          new URL(`/error?code=aws_subscription_inactive&status=${awsCustomer.status}`, req.url)
        );
      }

      // Check if subscription expired
      if (awsCustomer.expiresAt && awsCustomer.expiresAt < new Date()) {
        logger.warn({
          msg: "AWS subscription expired",
          customerIdentifier: CustomerIdentifier,
          expiresAt: awsCustomer.expiresAt,
        });
        return NextResponse.redirect(
          new URL("/error?code=aws_subscription_expired", req.url)
        );
      }

      // Subscription is valid, set session and redirect
      const redirectResponse = NextResponse.redirect(new URL("/", req.url));

      // Create JWT token for session
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");
      const sessionToken = await new SignJWT({
        sub: awsCustomer.user.id.toString(),
        userType: "Personal",
        _ut: 0,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .setIssuedAt()
        .sign(secret);

      redirectResponse.cookies.set("next-auth.session-token", sessionToken, {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      });

      recordLastLogin({ userId: awsCustomer.user.id, provider: "aws-marketplace" });

      return redirectResponse;
    }

    // 3. New customer - create user and team
    logger.info({
      msg: "New AWS customer, creating user and team",
      customerIdentifier: CustomerIdentifier,
    });

    const { user, team } = await createAWSMarketplaceUserWithTeam({
      customerIdentifier: CustomerIdentifier,
      productCode: ProductCode,
    });

    // 4. Set session and redirect to home
    const redirectResponse = NextResponse.redirect(new URL("/", req.url));

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");
    const sessionToken = await new SignJWT({
      sub: user.id.toString(),
      userType: "Personal",
      _ut: 0,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .setIssuedAt()
      .sign(secret);

    redirectResponse.cookies.set("next-auth.session-token", sessionToken, {
      httpOnly: true,
      sameSite: "none",
      path: "/",
      secure: true,
    });

    logger.info({
      msg: "AWS user registered and logged in",
      userId: user.id,
      customerIdentifier: CustomerIdentifier,
      teamId: team?.id,
    });

    return redirectResponse;
  } catch (error) {
    logger.error({
      msg: "AWS Marketplace registration error",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
