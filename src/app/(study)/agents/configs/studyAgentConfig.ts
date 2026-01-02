import { studySystem } from "@/ai/prompt";
import {
  buildPersonaTool,
  discussionChatTool,
  generatePodcastTool,
  generateReportTool,
  interviewChatTool,
  planStudyTool,
  reasoningThinkingTool,
  requestInteractionTool,
  scoutTaskChatTool,
  searchPersonasTool,
  toolCallError,
  webFetchTool,
  webSearchTool,
} from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter, ToolName } from "@/ai/tools/types";
import type { Analyst, UserChatExtra } from "@/prisma/client";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { AgentRequestConfig } from "../baseAgentRequest";
import { calculateToolUsage } from "../utils";

/**
 * Parameters for creating study agent configuration
 */
export interface StudyAgentConfigParams {
  userId: number;
  studyUserChatId: number;
  analyst: Analyst;
  userChatExtra: UserChatExtra;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortController: AbortController;
}

// 只是当前 agent 需要的 tools
type TOOLS = ReturnType<typeof buildStudyTools> | ReturnType<typeof removeRequestInteraction>;

/**
 * Create study agent configuration
 *
 * Study Agent features:
 * - Complete research workflow with 16+ tools
 * - MCP client integration (team-specific)
 * - Universal attachment processing (handled in base)
 * - Persona tier decision for first-time users
 * - Reference study context injection
 * - Team custom system prompts
 * - Brief status management (CLARIFIED vs DRAFT)
 */
export async function createStudyAgentConfig(
  params: StudyAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const {
    studyUserChatId,
    userId,
    locale,
    logger,
    userChatExtra,
    statReport,
    toolAbortController,
  } = params;

  // =============================================================================
  // 1. Determine brief status
  // =============================================================================

  const briefStatus: "CLARIFIED" | "DRAFT" =
    userChatExtra?.briefUserChatId || userChatExtra?.referenceUserChats?.length
      ? "CLARIFIED"
      : "DRAFT";

  // =============================================================================
  // 2. Build tools
  // =============================================================================

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortController.signal,
    statReport,
    logger: logger,
  };

  const allTools = buildStudyTools({
    studyUserChatId,
    userId,
    agentToolArgs,
  });

  // Remove requestInteraction if brief is clarified
  const tools = briefStatus === "CLARIFIED" ? removeRequestInteraction(allTools) : allTools;

  // =============================================================================
  // 3. Build system prompt
  // =============================================================================

  const systemPrompt = studySystem({
    locale,
    briefStatus,
  });

  // =============================================================================
  // 4. Return configuration
  // =============================================================================

  return {
    model: "claude-sonnet-4",
    systemPrompt,
    tools,

    specialHandlers: {
      /**
       * customPrepareStep: Dynamic tool control
       * - Restrict tools after report/podcast generation
       * - Limit webSearch usage (max 3 times, or 1 time if planStudy not called)
       */
      customPrepareStep: async ({ messages }) => {
        const toolUseCount = calculateToolUsage(messages);
        let activeTools: (keyof TOOLS)[] | undefined = undefined;

        // After report/podcast generation, only allow specific tools
        if (
          (toolUseCount[ToolName.generateReport] ?? 0) > 0 ||
          (toolUseCount[ToolName.generatePodcast] ?? 0) > 0
        ) {
          activeTools = [
            ToolName.generateReport,
            ToolName.generatePodcast,
            ToolName.reasoningThinking,
            ToolName.toolCallError,
          ];
        }
        // Limit webSearch usage
        else {
          if (
            ((toolUseCount[ToolName.planStudy] ?? 0) < 1 &&
              (toolUseCount[ToolName.webSearch] ?? 0) >= 1) ||
            (toolUseCount[ToolName.webSearch] ?? 0) >= 3
          ) {
            activeTools = (Object.keys(tools) as (keyof TOOLS)[]).filter(
              (toolName) => toolName !== ToolName.webSearch,
            );
          }
        }

        return { messages, activeTools };
      },

      // Note: customOnStepFinish removed - all notifications handled universally in base
      // - generateReport completion → notifyReportCompletion + trackEvent (in base)
      // - generatePodcast completion → trackEvent (in base)
      // - planPodcast completion → generateChatTitle (in base)
    },
  };
}

/**
 * Build study tools with all research capabilities
 * Note: createSubAgent tool is added dynamically in base if MCP clients are available
 */
function buildStudyTools(params: {
  studyUserChatId: number;
  userId: number;
  agentToolArgs: AgentToolConfigArgs;
}) {
  const { studyUserChatId, userId, agentToolArgs } = params;

  return {
    [ToolName.requestInteraction]: requestInteractionTool,
    [ToolName.webFetch]: webFetchTool({ locale: agentToolArgs.locale }),
    [ToolName.webSearch]: webSearchTool({ provider: "tavily", studyUserChatId, ...agentToolArgs }),
    [ToolName.reasoningThinking]: reasoningThinkingTool({ ...agentToolArgs }),
    [ToolName.searchPersonas]: searchPersonasTool({ userId, ...agentToolArgs }),
    [ToolName.scoutTaskChat]: scoutTaskChatTool({ userId, ...agentToolArgs }),
    [ToolName.buildPersona]: buildPersonaTool({ userId, ...agentToolArgs }),
    [ToolName.interviewChat]: interviewChatTool({ userId, studyUserChatId, ...agentToolArgs }),
    [ToolName.discussionChat]: discussionChatTool({ userId, ...agentToolArgs }),
    [ToolName.generateReport]: generateReportTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.generatePodcast]: generatePodcastTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.planStudy]: planStudyTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.toolCallError]: toolCallError,
  };
}

/**
 * Remove requestInteraction tool from tools
 */
function removeRequestInteraction(tools: ReturnType<typeof buildStudyTools>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [ToolName.requestInteraction]: _removed, ...rest } = tools;
  return rest;
}
