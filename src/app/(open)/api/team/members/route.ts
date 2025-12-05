import { withApiKey } from "@/app/(open)/lib/withApiKey";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/team/members
 * List all team members
 */
export async function GET() {
  try {
    return await withApiKey(async (owner) => {
      // This API is team-only
      if (owner.type !== "team") {
        return NextResponse.json(
          {
            success: false,
            error: "This API endpoint is only available for team API keys",
          },
          { status: 403 },
        );
      }

      const { team } = owner;

      // Fetch all team members (only active members with personalUserId)
      const members = await prisma.user.findMany({
        where: {
          teamIdAsMember: team.id,
          personalUserId: { not: null },
        },
        select: {
          id: true,
          name: true,
          // email: true,
          createdAt: true,
          personalUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        success: true,
        data: members.map((member) => ({
          id: member.id,
          email: member.personalUser?.email ?? null,
          name: member.name,
          createdAt: member.createdAt.toISOString(),
        })),
      });
    });
  } catch (error) {
    rootLogger.error({ msg: "Failed to fetch team members", error });

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
