import { MCPConfigs } from "@/ai/tools/mcp/client";
import { Locale } from "next-intl";

export enum TeamConfigName {
  mcp = "mcp",
  studySystemPrompt = "studySystemPrompt",
  emailDomainWhitelist = "emailDomainWhitelist",
}

/**
 * @todo 需要实现一下 zod schema，并在 upsertTeamConfig 方法里校验
 */
export type TeamConfigValue = {
  [TeamConfigName.studySystemPrompt]: Record<Locale, string>;
  // mcp: Record<string, MCPTransportConfig>;
  [TeamConfigName.mcp]: MCPConfigs;
  [TeamConfigName.emailDomainWhitelist]: {
    domains: Array<{
      domain: string;
      verificationToken: string;
      status: "pending" | "verified";
      verifiedAt?: string;
      addedBy: number;
      addedAt: string;
    }>;
  };
};
