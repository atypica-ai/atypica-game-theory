import { getMcpClientManager } from "@/ai/tools/mcp/client";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { loadMemoryForAgent } from "@/app/(memory)/lib/loadMemory";
import { buildMemoryUsagePrompt } from "@/app/(memory)/prompt/memoryUsage";
import { createSubAgentTool, StudyToolSet } from "@/app/(study)/tools";
import { StudyToolName } from "@/app/(study)/tools/types";
import { getTeamConfigWithDefault } from "@/app/team/teamConfig/lib";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { ModelMessage } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { UserChatContext } from "../context/types";
import { buildReferenceStudyContext } from "./referenceContext";

interface PrepareMessagesParams {
  userId: number;
  teamId: number | null;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  userChatContext: UserChatContext;
  modelMessages: ModelMessage[];
  systemPrompt: string;
  tools: StudyToolSet;
  toolAbortSignal: AbortSignal;
}

interface PrepareMessagesResult {
  finalSystemPrompt: string;
  finalTools: StudyToolSet;
  modelMessages: ModelMessage[];
}

/**
 * Prepare messages, tools, and system prompt for agent execution.
 *
 * Handles:
 * - MCP client loading and createSubAgent tool injection
 * - Team system prompt appending
 * - Reference study context injection
 * - User memory loading
 */
export async function prepareMessages({
  userId,
  teamId,
  locale,
  logger,
  statReport,
  userChatContext,
  modelMessages: inputMessages,
  systemPrompt,
  tools,
  toolAbortSignal,
}: PrepareMessagesParams): Promise<PrepareMessagesResult> {
  let modelMessages = [...inputMessages];

  // =============================================================================
  // MCP and Team System Prompt
  // =============================================================================

  const manager = getMcpClientManager();
  const mcpClients = teamId ? await manager.getClientsForTeam(teamId) : [];
  logger.info({
    msg: "Loaded MCP clients",
    mcpClients: mcpClients.length,
    teamId,
  });

  const teamSystemPrompt = teamId
    ? await getTeamConfigWithDefault(teamId, TeamConfigName.studySystemPrompt, {
        "zh-CN": "",
        "en-US": "",
      })
    : null;

  let finalSystemPrompt = systemPrompt;
  if (teamSystemPrompt && typeof teamSystemPrompt === "object" && locale in teamSystemPrompt) {
    const prompt = teamSystemPrompt[locale];
    if (prompt) {
      finalSystemPrompt = `${systemPrompt}\n\n${prompt}`;
    }
  }

  const finalTools: StudyToolSet = { ...tools };
  if (mcpClients.length > 0) {
    const agentToolArgs: AgentToolConfigArgs = {
      locale,
      abortSignal: toolAbortSignal,
      statReport,
      logger,
    };
    finalTools[StudyToolName.createSubAgent] = createSubAgentTool({
      userId,
      clients: mcpClients,
      ...agentToolArgs,
    });
    logger.info({ msg: "Added createSubAgent tool", mcpClientsCount: mcpClients.length });
  }

  // =============================================================================
  // Reference Study Context
  // =============================================================================

  if (userChatContext?.referenceUserChats) {
    const referenceStudyContext = await buildReferenceStudyContext({
      referenceTokens: userChatContext.referenceUserChats,
      userId,
      locale,
    });
    if (referenceStudyContext) {
      modelMessages = [
        {
          role: "user",
          content: referenceStudyContext,
        },
        ...modelMessages,
      ];
    }
  }

  // =============================================================================
  // User Memory
  // =============================================================================

  const userMemory = await loadMemoryForAgent({ userId });
  if (userMemory) {
    const text = buildMemoryUsagePrompt({ userMemory, locale });
    modelMessages = [{ role: "user", content: [{ type: "text", text }] }, ...modelMessages];
  }

  return { finalSystemPrompt, finalTools, modelMessages };
}
