import "server-only";

import { createTeamMemberUser } from "@/app/(auth)/lib";
import { decryptText, encryptText } from "@/lib/cipher";
import { Team, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export async function createTeam({
  name,
  ownerUser,
}: {
  name: string;
  ownerUser: Pick<User, "id" | "name">;
}): Promise<{
  team: Team;
  teamUser: Omit<User, "teamIdAsMember" | "personalUserId"> & {
    teamIdAsMember: number;
    personalUserId: number;
  };
}> {
  const team = await prisma.team.create({
    data: {
      name,
      seats: 1,
      ownerUserId: ownerUser.id,
    },
  });

  await prisma.tokensAccount.create({
    data: {
      teamId: team.id,
      permanentBalance: 0,
      monthlyBalance: 0,
    },
  });

  // 创建团队拥有者的团队用户身份
  const teamUser = await createTeamMemberUser({
    personalUser: ownerUser,
    teamAsMember: team,
  });

  return { team, teamUser };
}

// 用户切换token的数据结构
interface UserSwitchPayload {
  currentUserId: number;
  targetUserId: number;
  timestamp: number;
  expiresAt: number;
}

/**
 * 生成用户切换token（使用与impersonation-login相同的加密算法）
 */
export function generateUserSwitchToken(currentUserId: number, targetUserId: number): string {
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5分钟有效期

  const payload: UserSwitchPayload = {
    currentUserId,
    targetUserId,
    timestamp: now,
    expiresAt,
  };

  return encryptText(JSON.stringify(payload));
}

/**
 * 验证用户切换token
 */
export function verifyUserSwitchToken(token: string): UserSwitchPayload | null {
  try {
    const decryptedText = decryptText(token);
    const payload: UserSwitchPayload = JSON.parse(decryptedText);

    // 检查token是否过期
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    // 验证payload结构
    if (
      typeof payload.currentUserId !== "number" ||
      typeof payload.targetUserId !== "number" ||
      typeof payload.timestamp !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    return payload;
  } catch (error) {
    // 解密失败或无效JSON
    console.error("Failed to verify user switch token:", error);
    return null;
  }
}
