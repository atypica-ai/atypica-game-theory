import { createTeamMemberUser } from "@/app/(auth)/lib";
import { withApiKey } from "@/app/(open)/lib/withApiKey";
import { rootLogger } from "@/lib/logging";
import { TeamExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyDomainWhitelist } from "../create/utils";

const logger = rootLogger.child({ api: "/api/team/members/invite" });

/**
 * POST /api/team/members/invite
 * Invite an existing user to join the team
 */
export async function POST(request: NextRequest) {
  try {
    return await withApiKey(async ({ team }) => {
      // 1. 解析请求体
      const body = await request.json();
      const { email } = body;

      if (!email || typeof email !== "string") {
        return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // 2. 验证域名白名单
      const domainCheck = await verifyDomainWhitelist(team.id, normalizedEmail);
      if (!domainCheck.success) {
        return NextResponse.json(
          {
            success: false,
            error: domainCheck.message || "Email domain is not verified",
          },
          { status: 403 },
        );
      }

      // 3. 查找目标用户（必须是已注册的个人用户）
      const targetUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found. Use /api/team/members/create to create a new user.",
          },
          { status: 404 },
        );
      }

      // 4. 验证是个人用户
      if (!targetUser.email || targetUser.teamIdAsMember) {
        return NextResponse.json(
          {
            success: false,
            error: "Target user is not a personal account",
          },
          { status: 400 },
        );
      }

      // 5. 检查用户是否已经在团队中
      const existingMember = await prisma.user.findUnique({
        where: {
          teamIdAsMember_personalUserId: {
            personalUserId: targetUser.id,
            teamIdAsMember: team.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          {
            success: false,
            error: "User is already a member of this team",
          },
          { status: 409 },
        );
      }

      // 6. 检查团队座位限制
      const teamExtra = team.extra as TeamExtra | null;
      const hasUnlimitedSeats = teamExtra?.unlimitedSeats === true;

      if (!hasUnlimitedSeats) {
        const activeMembersCount = await prisma.user.count({
          where: {
            teamIdAsMember: team.id,
            personalUserId: { not: null },
          },
        });

        if (activeMembersCount >= team.seats) {
          return NextResponse.json(
            {
              success: false,
              error: `Team has reached its seat limit (${team.seats} seats)`,
            },
            { status: 403 },
          );
        }
      }

      // 7. 创建团队成员用户
      const teamMemberUser = await createTeamMemberUser({
        personalUser: { id: targetUser.id, name: targetUser.name },
        teamAsMember: { id: team.id },
      });

      logger.info({
        msg: "User invited to team via API",
        teamId: team.id,
        email: normalizedEmail,
        personalUserId: targetUser.id,
        teamMemberUserId: teamMemberUser.id,
      });

      // 8. 返回成功响应
      return NextResponse.json({
        success: true,
        data: {
          id: teamMemberUser.id,
          personalUserId: targetUser.id,
          teamIdAsMember: team.id,
          name: targetUser.name,
          createdAt: teamMemberUser.createdAt.toISOString(),
        },
      });
    });
  } catch (error) {
    logger.error({
      msg: "Failed to invite user via API",
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
