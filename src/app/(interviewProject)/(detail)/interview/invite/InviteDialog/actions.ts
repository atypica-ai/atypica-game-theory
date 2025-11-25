"use server";

import { generateInterviewShareToken } from "@/app/(interviewProject)/lib";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { generateToken } from "@/lib/utils";
import { InterviewProjectExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { notFound } from "next/navigation";

/**
 * Generate temporary project share token with expiration
 */
export async function generateInterviewShareTokenAction(
  projectId: number,
  expiryHours: number = 24,
): Promise<ServerActionResult<{ shareToken: string; expiryHours: number }>> {
  return withAuth(async (user) => {
    // ensure project belongs to user
    const project = await prisma.interviewProject
      .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
      .catch(() => notFound());

    const shareToken = generateInterviewShareToken(project.id, expiryHours);
    return {
      success: true,
      data: {
        shareToken,
        expiryHours,
      },
    };
  });
}

/**
 * Generate permanent project share token
 */
export async function generatePermanentInterviewShareTokenAction(
  projectId: number,
): Promise<ServerActionResult<{ shareToken: string; permanent: true }>> {
  return withAuth(async (user) => {
    // ensure project belongs to user
    const project = await prisma.interviewProject
      .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
      .catch(() => notFound());

    // 获取或创建永久分享令牌
    const projectExtra = (project.extra as InterviewProjectExtra) || {};
    let permanentToken = projectExtra.permanentShareToken;

    if (!permanentToken) {
      // 生成新的永久令牌
      permanentToken = generateToken(); // 使用 generateToken 工具函数生成随机令牌

      // 使用原始SQL更新 extra 字段，确保不覆盖现有数据
      await prisma.$executeRaw`
        UPDATE "InterviewProject"
        SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ permanentShareToken: permanentToken })}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${projectId}
      `;
    }

    // 生成永久链接
    const shareToken = generateInterviewShareToken(project.id, permanentToken);

    return {
      success: true,
      data: {
        shareToken,
        permanent: true,
      },
    };
  });
}

/**
 * Disable permanent invite link for a project
 */
export async function disablePermanentInviteLinkAction(
  projectId: number,
): Promise<ServerActionResult<{ success: boolean }>> {
  return withAuth(async (user) => {
    // ensure project belongs to user
    await prisma.interviewProject
      .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
      .catch(() => notFound());

    // 使用原始SQL从 extra 字段中移除 permanentShareToken
    await prisma.$executeRaw`
      UPDATE "InterviewProject"
      SET "extra" = "extra" - 'permanentShareToken',
          "updatedAt" = NOW()
      WHERE "id" = ${projectId}
    `;

    return {
      success: true,
      data: { success: true },
    };
  });
}
