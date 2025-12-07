import { createPersonalUser, createTeamMemberUser } from "@/app/(auth)/lib";
import { generateRandomPassword, verifyDomainWhitelist } from "@/app/(open)/api/team/members/utils";
import { withTeamApiKey } from "@/app/(open)/lib/withApiKey";
import { rootLogger } from "@/lib/logging";
import { TeamExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

const logger = rootLogger.child({ api: "/api/team/members/create" });

/**
 * POST /api/team/members/create
 * Create a new user and add them to the team
 */
export async function POST(request: NextRequest) {
  try {
    return await withTeamApiKey(async (team) => {
      // 1. 解析请求体
      const body = await request.json();
      const { email, password } = body;

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

      // 3. 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: "User with this email already exists. Use /api/team/members/invite instead.",
          },
          { status: 409 },
        );
      }

      // 4. 检查团队座位限制
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

      // 5. 创建个人用户（不赠送 tokens，email 已验证）
      const userPassword = password || generateRandomPassword();
      const personalUser = await createPersonalUser({
        email: normalizedEmail,
        password: userPassword,
        emailVerified: new Date(), // API 创建的用户 email 默认已验证
        grantSignupTokens: false, // 不赠送 signup tokens
      });

      // 6. 创建团队成员用户
      const teamMemberUser = await createTeamMemberUser({
        personalUser: { id: personalUser.id, name: personalUser.name },
        teamAsMember: { id: team.id },
      });

      logger.info({
        msg: "User created via API",
        teamId: team.id,
        email: normalizedEmail,
        personalUserId: personalUser.id,
        teamMemberUserId: teamMemberUser.id,
      });

      // 7. 返回成功响应
      return NextResponse.json({
        success: true,
        data: {
          id: teamMemberUser.id,
          email: personalUser.email,
          name: personalUser.name,
          personalUserId: personalUser.id,
          teamUserId: teamMemberUser.id,
          createdAt: personalUser.createdAt.toISOString(),
        },
      });
    });
  } catch (error) {
    logger.error({
      msg: "Failed to create user via API",
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
