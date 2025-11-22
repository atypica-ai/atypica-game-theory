import { generateImpersonationLoginUrl } from "@/app/(auth)/impersonationLogin";
import { rootLogger } from "@/lib/logging";
import { getRequestOrigin } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/app/(open)/lib/withApiKey";

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

    // Parse request body for expiry hours (optional)
    let expiryHours = 24; // default
    try {
      const body = await request.json();
      if (body.expiryHours && typeof body.expiryHours === "number") {
        expiryHours = body.expiryHours;
      }
    } catch {
      // If body parsing fails, use default
    }

    return await withApiKey(async ({ team }) => {
      // Verify the member belongs to this team
      const member = await prisma.user.findUnique({
        where: { id: userIdNumber },
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

      if (!member.personalUserId) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot generate impersonation URL for removed member",
          },
          { status: 400 },
        );
      }

      // Get personal user
      const personalUser = await prisma.user.findUnique({
        where: { id: member.personalUserId },
      });

      if (!personalUser || !personalUser.emailVerified) {
        return NextResponse.json(
          {
            success: false,
            error: "Personal user not found or email not verified",
          },
          { status: 400 },
        );
      }

      // Generate impersonation URL for the personal user
      const siteOrigin = await getRequestOrigin();
      const loginUrl = generateImpersonationLoginUrl(
        personalUser.id,
        siteOrigin,
        expiryHours,
      );

      rootLogger.info({
        msg: "Generated impersonation URL",
        teamId: team.id,
        userId: member.id,
        personalUserId: personalUser.id,
        expiryHours,
      });

      return NextResponse.json({
        success: true,
        data: {
          loginUrl,
          expiryHours,
          expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
        },
      });
    });
  } catch (error) {
    rootLogger.error({ msg: "Failed to generate impersonation URL", error });

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
