import { generateImpersonationLoginUrl } from "@/app/(auth)/impersonationLogin";
import { verifyDomainWhitelist } from "@/app/(open)/api/team/members/utils";
import { withTeamApiKey } from "@/app/(open)/lib/withApiKey";
import { rootLogger } from "@/lib/logging";
import { getRequestOrigin } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

const logger = rootLogger.child({ api: "/api/team/members/[userId]/impersonation" });

/**
 * POST /api/team/members/:userId/impersonation
 * Generate impersonation login URL for a team member
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const userIdNumber = parseInt(userId, 10);

    if (isNaN(userIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    // Parse request body for expiry hours and callback URL (both optional)
    let expiryHours = 24; // default
    let callbackUrl: string | undefined;
    try {
      const body = await request.json();
      if (body.expiryHours && typeof body.expiryHours === "number") {
        expiryHours = body.expiryHours;
      }
      if (body.callbackUrl && typeof body.callbackUrl === "string") {
        callbackUrl = body.callbackUrl;
      }
    } catch {
      // If body parsing fails, use defaults
    }

    return await withTeamApiKey(async (team) => {

      // Verify the member belongs to this team
      const member = await prisma.user.findUnique({
        where: { id: userIdNumber },
        include: {
          personalUser: true,
        },
      });

      if (!member || member.teamIdAsMember !== team.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Member not found in this team",
          },
          { status: 404 },
        );
      }

      if (!member.personalUserId || !member.personalUser) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot generate impersonation URL for removed member",
          },
          { status: 400 },
        );
      }

      if (!member.personalUser.email || !member.personalUser.emailVerified) {
        return NextResponse.json(
          {
            success: false,
            error: "Member email not found or not verified",
          },
          { status: 400 },
        );
      }

      // Verify email domain is in team's whitelist
      const domainCheck = await verifyDomainWhitelist(team.id, member.personalUser.email);
      if (!domainCheck.success) {
        return NextResponse.json(
          {
            success: false,
            error: domainCheck.message || "Email domain is not verified in team whitelist",
          },
          { status: 403 },
        );
      }

      // Generate impersonation URL for the team user
      const siteOrigin = await getRequestOrigin();
      const loginUrl = generateImpersonationLoginUrl(
        member.id,
        siteOrigin,
        expiryHours,
        callbackUrl,
      );

      logger.info({
        msg: "Generated impersonation URL",
        teamId: team.id,
        teamUserId: member.id,
        personalUserId: member.personalUserId,
        email: member.personalUser.email,
        expiryHours,
        callbackUrl,
      });

      return NextResponse.json({
        success: true,
        data: {
          loginUrl,
          expiryHours,
          expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
          callbackUrl,
        },
      });
    });
  } catch (error) {
    logger.error({
      msg: "Failed to generate impersonation URL",
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const statusCode = errorMessage.includes("Unauthorized") ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode },
    );
  }
}
