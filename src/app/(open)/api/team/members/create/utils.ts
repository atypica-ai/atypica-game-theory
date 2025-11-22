import "server-only";

import { getTeamConfig } from "@/app/team/teamConfig/lib";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { rootLogger } from "@/lib/logging";
import { randomBytes } from "crypto";

const apiLogger = rootLogger.child({ api: "team-api-lib" });

/**
 * 从邮箱提取域名
 */
export function extractDomain(email: string): string {
  const parts = email.toLowerCase().split("@");
  if (parts.length !== 2) {
    throw new Error("Invalid email format");
  }
  return parts[1];
}

/**
 * 验证邮箱域名是否在团队的已验证白名单中
 */
export async function verifyDomainWhitelist(
  teamId: number,
  email: string,
): Promise<{ success: boolean; message?: string; domain?: string }> {
  try {
    const domain = extractDomain(email);

    // 使用 getTeamConfig 获取域名白名单
    const whitelistConfig = await getTeamConfig(teamId, TeamConfigName.emailDomainWhitelist);

    const domainWhitelist = whitelistConfig?.domains || [];

    const domainEntry = domainWhitelist.find((entry) => entry.domain === domain);

    if (!domainEntry) {
      return {
        success: false,
        message: `Domain ${domain} is not in the team's whitelist`,
        domain,
      };
    }

    if (domainEntry.status !== "verified") {
      return {
        success: false,
        message: `Domain ${domain} has not been verified yet`,
        domain,
      };
    }

    return { success: true, domain };
  } catch (error) {
    apiLogger.error({ msg: "Failed to verify domain whitelist", error: (error as Error).message });
    return { success: false, message: "Failed to verify domain" };
  }
}

/**
 * 生成随机强密码
 */
export function generateRandomPassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const bytes = randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }

  return password;
}
