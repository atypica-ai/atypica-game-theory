import { NextRequest, NextResponse } from "next/server";
import { MarketplaceMetering } from "@aws-sdk/client-marketplace-metering";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { createAWSMarketplaceUserWithTeam, recordLastLogin } from "@/app/(auth)/lib";
import { encode } from "next-auth/jwt";

const logger = rootLogger.child({ module: "aws-marketplace-register" });

const marketplaceClient = new MarketplaceMetering({
  region: "us-east-1", // AWS Marketplace fixed region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // 增加超时时间以应对网络不稳定
  requestHandler: {
    requestTimeout: 30000, // 30秒
    connectionTimeout: 10000, // 10秒
  },
  // 最多重试2次
  maxAttempts: 2,
});

/**
 * Get the base URL from the request (preserving the original host from frp/proxy)
 */
function getBaseUrl(req: NextRequest): string {
  // Try to get the original host from forwarded headers (frp, proxy, etc.)
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback to host header
  const host = req.headers.get("host");
  if (host) {
    // Determine protocol from x-forwarded-proto or default to https for production-like setups
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }

  // Ultimate fallback to request URL
  return req.url;
}

// Cookie name for temporary customerIdentifier cache
const AWS_CUSTOMER_COOKIE = "aws-marketplace-customer";
const CACHE_MAX_AGE = 300; // 5 minutes

/**
 * Extract token from request (query param or POST body)
 */
async function extractToken(req: NextRequest): Promise<string | null> {
  // Try query parameter first (for GET requests)
  const searchParams = req.nextUrl.searchParams;
  let token = searchParams.get("x-amzn-marketplace-token");

  if (token) {
    return token;
  }

  // Try POST body form data (AWS sends POST with form data)
  if (req.method === "POST") {
    try {
      const formData = await req.formData();
      token = formData.get("x-amzn-marketplace-token") as string;
      return token;
    } catch {
      // If formData parsing fails, return null
      return null;
    }
  }

  return null;
}

/**
 * Get cached customerIdentifier from cookie
 */
function getCachedCustomerIdentifier(req: NextRequest): string | null {
  return req.cookies.get(AWS_CUSTOMER_COOKIE)?.value || null;
}

/**
 * Set customerIdentifier cache in response (returns a response clone with the cookie set)
 */
function setCustomerIdentifierCookie(response: NextResponse, customerIdentifier: string): NextResponse {
  response.cookies.set(AWS_CUSTOMER_COOKIE, customerIdentifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/aws-marketplace/register",
    maxAge: CACHE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

/**
 * Clear customerIdentifier cache from response
 */
function clearCustomerIdentifierCookie(response: NextResponse): NextResponse {
  response.cookies.delete(AWS_CUSTOMER_COOKIE);
  return response;
}

/**
 * Handle registration logic (shared by GET and POST)
 */
async function handleRegister(req: NextRequest): Promise<NextResponse> {
  try {
    const token = await extractToken(req);

    // Step 1: Try to get customerIdentifier from cache first
    let customerIdentifier: string | null = getCachedCustomerIdentifier(req);
    let productCode: string | null = null;

    if (customerIdentifier) {
      logger.info({
        msg: "Found cached customerIdentifier",
        customerIdentifier,
      });
    }

    // Step 2: If no cache and we have a token, call resolveCustomer
    if (!customerIdentifier) {
      if (!token) {
        logger.error({ msg: "Missing marketplace token in registration request" });
        return NextResponse.json({ error: "Missing marketplace token" }, { status: 400 });
      }

      try {
        logger.info({ msg: "Resolving AWS Marketplace customer", token });
        const response = await marketplaceClient.resolveCustomer({
          RegistrationToken: token,
        });

        customerIdentifier = response.CustomerIdentifier || null;
        productCode = response.ProductCode || null;

        if (!customerIdentifier || !productCode) {
          logger.error({ msg: "Invalid AWS response", response });
          throw new Error("Invalid AWS response");
        }

        logger.info({
          msg: "AWS customer resolved",
          customerIdentifier,
          productCode,
        });
      } catch (error) {
        // resolveCustomer failed - check if token was already used
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("Token is not valid") ||
            errorMessage.includes("Expired") ||
            errorMessage.includes("InvalidRegistrationToken")) {
          logger.warn({
            msg: "Registration token already used or expired",
            error: errorMessage,
          });
          return NextResponse.redirect(
            new URL("/error?code=aws_token_used", getBaseUrl(req))
          );
        }

        throw error; // Re-throw other errors
      }
    }

    // Step 3: Check if customer already exists (using cached or resolved customerIdentifier)
    const awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { customerIdentifier },
      include: { user: true },
    });

    if (awsCustomer) {
      // Existing customer - log in and redirect to home
      logger.info({
        msg: "Existing AWS customer found, logging in",
        userId: awsCustomer.userId,
        customerIdentifier,
      });

      // Check subscription status
      if (awsCustomer.status !== "active") {
        logger.warn({
          msg: "AWS subscription not active",
          customerIdentifier,
          status: awsCustomer.status,
        });
        const errorResponse = NextResponse.redirect(
          new URL(`/error?code=aws_subscription_inactive&status=${awsCustomer.status}`, getBaseUrl(req))
        );
        return clearCustomerIdentifierCookie(errorResponse);
      }

      // Check if subscription expired
      if (awsCustomer.expiresAt && awsCustomer.expiresAt < new Date()) {
        logger.warn({
          msg: "AWS subscription expired",
          customerIdentifier,
          expiresAt: awsCustomer.expiresAt,
        });
        const errorResponse = NextResponse.redirect(
          new URL("/error?code=aws_subscription_expired", getBaseUrl(req))
        );
        return clearCustomerIdentifierCookie(errorResponse);
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
        const errorResponse = NextResponse.redirect(
          new URL("/error?code=aws_data_inconsistency", getBaseUrl(req))
        );
        return clearCustomerIdentifierCookie(errorResponse);
      }

      // Subscription is valid, set session and redirect to account
      const redirectResponse = NextResponse.redirect(new URL("/account", getBaseUrl(req)));

      // Create JWT token for TEAM USER (not personal user)
      const sessionToken = await encode({
        token: {
          sub: teamUser.id.toString(), // Use teamUser.id
          _ut: 1, // 1 = TeamMember
          _tid: team.id, // Team ID
        },
        secret: process.env.AUTH_SECRET || "",
      });

      redirectResponse.cookies.set("next-auth.session-token", sessionToken, {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      });

      recordLastLogin({ userId: teamUser.id, provider: "aws-marketplace" });

      // Clear the temporary cache since user is now logged in
      return clearCustomerIdentifierCookie(redirectResponse);
    }

    // Step 4: New customer - create user and team
    logger.info({
      msg: "New AWS customer, creating user and team",
      customerIdentifier,
    });

    // productCode might be null if using cached customerIdentifier
    // If null, we need to get it from the token
    if (!productCode && !token) {
      logger.error({
        msg: "Cannot create new user: no productCode and no token available",
        customerIdentifier,
      });
      return NextResponse.redirect(
        new URL("/error?code=aws_registration_error", getBaseUrl(req))
      );
    }

    if (!productCode) {
      // Try to get productCode from token
      try {
        const response = await marketplaceClient.resolveCustomer({
          RegistrationToken: token,
        });
        productCode = response.ProductCode || null;
      } catch {
        // If we can't get productCode, use a default or error
        logger.error({ msg: "Failed to resolve productCode for new customer" });
        return NextResponse.redirect(
          new URL("/error?code=aws_registration_error", getBaseUrl(req))
        );
      }
    }

    const { personalUser, team, teamUser } = await createAWSMarketplaceUserWithTeam({
      customerIdentifier,
      productCode,
    });

    // Step 5: Set session and redirect to account
    const redirectResponse = NextResponse.redirect(new URL("/account", getBaseUrl(req)));

    // Cache customerIdentifier in case user refreshes before session is fully established
    setCustomerIdentifierCookie(redirectResponse, customerIdentifier);

    // Create JWT token for TEAM USER (not personal user)
    const sessionToken = await encode({
      token: {
        sub: teamUser.id.toString(), // Use teamUser.id
        _ut: 1, // 1 = TeamMember
        _tid: team.id, // Team ID
      },
      secret: process.env.AUTH_SECRET || "",
    });

    redirectResponse.cookies.set("next-auth.session-token", sessionToken, {
      httpOnly: true,
      sameSite: "none",
      path: "/",
      secure: true,
    });

    logger.info({
      msg: "AWS user registered and logged in",
      userId: personalUser.id,
      teamUserId: teamUser.id,
      customerIdentifier,
      teamId: team.id,
    });

    // Clear the temporary cache since registration is complete
    return clearCustomerIdentifierCookie(redirectResponse);
  } catch (error) {
    logger.error({
      msg: "AWS Marketplace registration error",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // 检测网络连接错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError =
      errorMessage.includes("socket disconnected") ||
      errorMessage.includes("TLS") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("timeout");

    if (isNetworkError) {
      // 网络错误，重定向到友好错误页面
      return NextResponse.redirect(
        new URL("/error?code=aws_network_error", getBaseUrl(req))
      );
    }

    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

// AWS Marketplace sends POST request with token in form data
export async function POST(req: NextRequest) {
  return handleRegister(req);
}

// Also support GET for backward compatibility/testing
export async function GET(req: NextRequest) {
  return handleRegister(req);
}
