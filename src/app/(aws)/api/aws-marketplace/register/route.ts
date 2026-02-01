import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { AWS_MARKETPLACE_CONFIG } from "@/app/(aws)/config";
import { createAWSMarketplaceUserWithTeam } from "@/app/(aws)/lib/auth";
import {
  resolveCustomer,
  validateExistingCustomer,
  createSessionToken,
  setSessionAndRedirect,
  handleTokenError,
  isNetworkError,
} from "@/app/(aws)/lib/register";

const logger = rootLogger.child({ module: "aws-marketplace-register" });

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
  return req.cookies.get(AWS_MARKETPLACE_CONFIG.COOKIE_NAME)?.value || null;
}

/**
 * Set customerIdentifier cache in response (returns a response clone with the cookie set)
 */
function setCustomerIdentifierCookie(response: NextResponse, customerIdentifier: string): NextResponse {
  response.cookies.set(AWS_MARKETPLACE_CONFIG.COOKIE_NAME, customerIdentifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/aws-marketplace/register",
    maxAge: AWS_MARKETPLACE_CONFIG.COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

/**
 * Clear customerIdentifier cache from response
 */
function clearCustomerIdentifierCookie(response: NextResponse): NextResponse {
  response.cookies.delete(AWS_MARKETPLACE_CONFIG.COOKIE_NAME);
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
        const result = await resolveCustomer(token);
        customerIdentifier = result.customerIdentifier;
        productCode = result.productCode;
      } catch (error) {
        const { isTokenError, errorCode } = handleTokenError(error);
        if (isTokenError) {
          return NextResponse.redirect(new URL(`/error?code=${errorCode}`, getBaseUrl(req)));
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
      // Existing customer - validate and log in
      logger.info({
        msg: "Existing AWS customer found, logging in",
        userId: awsCustomer.userId,
        customerIdentifier,
      });

      const validation = await validateExistingCustomer({ awsCustomer, customerIdentifier });

      if ("error" in validation) {
        const errorUrl = validation.status
          ? `/error?code=${validation.error}&status=${validation.status}`
          : `/error?code=${validation.error}`;
        const errorResponse = NextResponse.redirect(new URL(errorUrl, getBaseUrl(req)));
        return clearCustomerIdentifierCookie(errorResponse);
      }

      const { team, teamUser } = validation;

      // Create session and redirect
      const sessionToken = await createSessionToken(teamUser, team);
      const response = setSessionAndRedirect({
        redirectUrl: "/account",
        sessionToken,
        teamUserId: teamUser.id,
        provider: "aws-marketplace",
        baseUrl: getBaseUrl(req),
      });

      // Clear the temporary cache since user is now logged in
      return clearCustomerIdentifierCookie(response);
    }

    // Step 4: New customer - create user and team
    logger.info({
      msg: "New AWS customer, creating user and team",
      customerIdentifier,
    });

    // Ensure we have productCode for new customer
    if (!productCode) {
      if (!token) {
        logger.error({
          msg: "Cannot create new user: no productCode and no token available",
          customerIdentifier,
        });
        return NextResponse.redirect(
          new URL("/error?code=aws_registration_error", getBaseUrl(req))
        );
      }

      try {
        const result = await resolveCustomer(token);
        productCode = result.productCode;
      } catch (error) {
        logger.error({ msg: "Failed to resolve productCode for new customer", error });
        return NextResponse.redirect(
          new URL("/error?code=aws_registration_error", getBaseUrl(req))
        );
      }
    }

    // Step 4: Create new user and team
    const { personalUser, team, teamUser } = await createAWSMarketplaceUserWithTeam({
      customerIdentifier,
      productCode,
    });

    logger.info({
      msg: "AWS user registered successfully",
      userId: personalUser.id,
      teamUserId: teamUser.id,
      customerIdentifier,
      teamId: team.id,
    });

    // Step 5: Set session and redirect to account
    const sessionToken = await createSessionToken(teamUser, team);
    let response = setSessionAndRedirect({
      redirectUrl: "/account",
      sessionToken,
      teamUserId: teamUser.id,
      provider: "aws-marketplace",
      baseUrl: getBaseUrl(req),
    });

    // Cache customerIdentifier temporarily in case user refreshes
    response = setCustomerIdentifierCookie(response, customerIdentifier);

    // Clear the temporary cache since registration is complete
    return clearCustomerIdentifierCookie(response);
  } catch (error) {
    logger.error({
      msg: "AWS Marketplace registration error",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check for network errors
    if (isNetworkError(error)) {
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
