import { MCPConfigs } from "@/ai/tools/mcp/client";
import { Locale } from "next-intl";

export enum TeamConfigName {
  mcp = "mcp",
  studySystemPrompt = "studySystemPrompt",
}

/**
 * @todo 需要实现一下 zod schema，并在 upsertTeamConfig 方法里校验
 */
export type TeamConfigValue = {
  studySystemPrompt: Record<Locale, string>;
  // mcp: Record<string, MCPTransportConfig>;
  mcp: MCPConfigs;
};
