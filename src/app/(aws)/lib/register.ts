import "server-only";

import { NextResponse } from "next/server";
import { MarketplaceMetering } from "@aws-sdk/client-marketplace-metering";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { encode } from "next-auth/jwt";
import { getAwsCredentials, AWS_MARKETPLACE_CONFIG } from "../config";
import { recordAndTrackLastLogin } from "@/app/(auth)/lib";
import type { User, Team } from "@/prisma/client";

const logger = rootLogger.child({ module: "aws-marketplace-register" });

/**
 * Lazy initialization of AWS Marketplace Metering client
 * Only creates the client when first accessed, avoiding env var validation during build
 */
let marketplaceClientInstance: MarketplaceMetering | null = null;

function getMarketplaceClient(): MarketplaceMetering {
  if (!marketplaceClientInstance) {
    marketplaceClientInstance = new MarketplaceMetering({
      region: AWS_MARKETPLACE_CONFIG.REGION,
      credentials: getAwsCredentials(),
      requestHandler: {
        requestTimeout: AWS_MARKETPLACE_CONFIG.REQUEST_TIMEOUT,
        connectionTimeout: AWS_MARKETPLACE_CONFIG.CONNECTION_TIMEOUT,
      },
      maxAttempts: AWS_MARKETPLACE_CONFIG.MAX_RETRIES,
    });
  }
  return marketplaceClientInstance;
}

/**
 * Resolve customer identifier from AWS registration token
 */
export async function resolveCustomer(token: string): Promise<{
  customerIdentifier: string;
  productCode: string;
}> {
  logger.info({ msg: "Resolving AWS Marketplace customer", token });

  const response = await getMarketplaceClient().resolveCustomer({
    RegistrationToken: token,
  });

  const customerIdentifier = response.CustomerIdentifier || null;
  const productCode = response.ProductCode || null;

  if (!customerIdentifier || !productCode) {
    logger.error({ msg: "Invalid AWS response", response });
    throw new Error("Invalid AWS response");
  }

  logger.info({
    msg: "AWS customer resolved",
    customerIdentifier,
    productCode,
  });

  return { customerIdentifier, productCode };
}

/**
 * Validate existing customer subscription status
 */
export async function validateExistingCustomer({
  awsCustomer,
  customerIdentifier,
}: {
  awsCustomer: NonNullable<
    Awaited<ReturnType<typeof prisma.aWSMarketplaceCustomer.findUnique>>
  > & {
    user: User;
  };
  customerIdentifier: string;
}): Promise<
  { personalUser: Pick<User, "id">; team: Team; teamUser: User } | { error: string; status?: string }
> {
  // Check subscription status
  if (awsCustomer.status !== "active") {
    logger.warn({
      msg: "AWS subscription not active",
      customerIdentifier,
      status: awsCustomer.status,
    });
    return { error: "aws_subscription_inactive", status: awsCustomer.status };
  }

  // Check if subscription expired
  if (awsCustomer.expiresAt && awsCustomer.expiresAt < new Date()) {
    logger.warn({
      msg: "AWS subscription expired",
      customerIdentifier,
      expiresAt: awsCustomer.expiresAt,
    });
    return { error: "aws_subscription_expired" };
  }

  // Find the team owned by this AWS customer
  const team = await prisma.team.findFirst({
    where: { ownerUserId: awsCustomer.user.id },
  });

  // Find the team member user linked to the personal user and team
  const teamUser = await prisma.user.findFirst({
    where: {
      personalUserId: awsCustomer.user.id,
      teamIdAsMember: team?.id,
    },
  });

  if (!team || !teamUser) {
    logger.error({
      msg: "AWS customer exists but team/teamUser not found",
      customerIdentifier,
      userId: awsCustomer.user.id,
      team,
      teamUser,
    });
    return { error: "aws_data_inconsistency" };
  }

  return { personalUser: awsCustomer.user, team, teamUser };
}

/**
 * Create session token for AWS Personal User
 * AWS users login as Personal User (not Team Member)
 */
export async function createSessionToken(
  personalUser: Pick<User, "id">,
): Promise<string> {
  return encode({
    token: {
      id: personalUser.id,
      _ut: 0, // 0 = Personal User
      _tid: undefined,
    },
    secret: process.env.AUTH_SECRET || "",
  });
}

/**
 * Set session cookie and redirect
 */
export function setSessionAndRedirect({
  redirectUrl,
  sessionToken,
  userId,
  baseUrl,
}: {
  redirectUrl: string;
  sessionToken: string;
  userId: number;
  baseUrl: string;
}): NextResponse {
  const response = NextResponse.redirect(new URL(redirectUrl, baseUrl));

  response.cookies.set("next-auth.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "none",
    path: "/",
    secure: true,
  });

  recordAndTrackLastLogin({ userId, provider: "aws-marketplace" });

  return response;
}

/**
 * Handle AWS registration token errors
 */
export function handleTokenError(error: unknown): { isTokenError: boolean; errorCode?: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (
    errorMessage.includes("Token is not valid") ||
    errorMessage.includes("Expired") ||
    errorMessage.includes("InvalidRegistrationToken")
  ) {
    logger.warn({
      msg: "Registration token already used or expired",
      error: errorMessage,
    });
    return { isTokenError: true, errorCode: "aws_token_used" };
  }

  return { isTokenError: false };
}

/**
 * Handle network errors
 */
export function isNetworkError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    errorMessage.includes("socket disconnected") ||
    errorMessage.includes("TLS") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("ETIMEDOUT") ||
    errorMessage.includes("timeout")
  );
}
