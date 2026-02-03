import { llm } from "@/ai/provider";
import { toolCallError } from "@/ai/tools/error";
import { reasoningThinkingTool, webFetchTool, webSearchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { UserChatContext } from "@/app/(study)/context/types";
import { studySystem } from "@/app/(study)/prompt/study";
import {
  buildPersonaTool,
  discussionChatTool,
  generatePodcastTool,
  generateReportTool,
  interviewChatTool,
  planStudyTool,
  requestInteractionTool,
  scoutTaskChatTool,
  searchPersonasTool,
} from "@/app/(study)/tools";
import { StudyToolName } from "@/app/(study)/tools/types";
import type { Analyst, ChatMessageAttachment } from "@/prisma/client";
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
  userChatContext: UserChatContext;
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
    analyst,
    userId,
    locale,
    logger,
    userChatContext,
    statReport,
    toolAbortController,
  } = params;

  // =============================================================================
  // 1. Determine brief status
  // =============================================================================

  const briefStatus: "CLARIFIED" | "DRAFT" =
    userChatContext?.briefUserChatId || userChatContext?.referenceUserChats?.length
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
    analyst,
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
    modelName: "claude-sonnet-4-5",
    // model: "minimax-m2.1",
    systemPrompt,
    tools,
    maxTokens: 1500, // 限制输出长度（约 500-750 字），工具输出会自动展示

    specialHandlers: {
      /**
       * customPrepareStep: Dynamic tool control
       * - Restrict tools after report/podcast generation
       * - Limit webSearch usage (max 3 times, or 1 time if planStudy not called)
       */
      customPrepareStep: async ({ messages, model: _model }) => {
        const toolUseCount = calculateToolUsage(messages);
        let activeTools: (keyof TOOLS)[] | undefined = undefined;
        let model = _model;

        // After report/podcast generation, only allow specific tools
        if (
          (toolUseCount[StudyToolName.generateReport] ?? 0) > 0 ||
          (toolUseCount[StudyToolName.generatePodcast] ?? 0) > 0
        ) {
          activeTools = [
            StudyToolName.generateReport,
            StudyToolName.generatePodcast,
            StudyToolName.reasoningThinking,
            StudyToolName.toolCallError,
          ];
          // 报告生成以后，就换成 minimax 模型，以减少消耗
          model = llm("minimax-m2.1");
        } else {
          // Limit webSearch usage
          if (
            ((toolUseCount[StudyToolName.planStudy] ?? 0) < 1 &&
              (toolUseCount[StudyToolName.webSearch] ?? 0) >= 1) ||
            (toolUseCount[StudyToolName.webSearch] ?? 0) >= 3
          ) {
            activeTools = (Object.keys(tools) as (keyof TOOLS)[]).filter(
              (toolName) => toolName !== StudyToolName.webSearch,
            );
          }
        }

        return { messages, activeTools, model };
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
  analyst: Pick<Analyst, "id" | "attachments">;
  studyUserChatId: number;
  userId: number;
  agentToolArgs: AgentToolConfigArgs;
}) {
  const { studyUserChatId, analyst, userId, agentToolArgs } = params;

  return {
    [StudyToolName.requestInteraction]: requestInteractionTool,
    [StudyToolName.webFetch]: webFetchTool({ locale: agentToolArgs.locale }),
    [StudyToolName.webSearch]: webSearchTool({
      provider: "tavily",
      studyUserChatId,
      ...agentToolArgs,
    }),
    [StudyToolName.reasoningThinking]: reasoningThinkingTool({ ...agentToolArgs }),
    [StudyToolName.searchPersonas]: searchPersonasTool({ userId, ...agentToolArgs }),
    [StudyToolName.scoutTaskChat]: scoutTaskChatTool({ userId, ...agentToolArgs }),
    [StudyToolName.buildPersona]: buildPersonaTool({ userId, ...agentToolArgs }),
    [StudyToolName.interviewChat]: interviewChatTool({
      userId,
      userChatId: studyUserChatId,
      attachments: analyst.attachments as ChatMessageAttachment[],
      ...agentToolArgs,
    }),
    [StudyToolName.discussionChat]: discussionChatTool({ userId, ...agentToolArgs }),
    [StudyToolName.generateReport]: generateReportTool({
      userId,
      userChatId: studyUserChatId,
      ...agentToolArgs,
    }),
    [StudyToolName.generatePodcast]: generatePodcastTool({
      userId,
      userChatId: studyUserChatId,
      ...agentToolArgs,
    }),
    [StudyToolName.planStudy]: planStudyTool({ studyUserChatId, ...agentToolArgs }),
    [StudyToolName.toolCallError]: toolCallError,
  };
}

/**
 * Remove requestInteraction tool from tools
 */
function removeRequestInteraction(tools: ReturnType<typeof buildStudyTools>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [StudyToolName.requestInteraction]: _removed, ...rest } = tools;
  return rest;
}
