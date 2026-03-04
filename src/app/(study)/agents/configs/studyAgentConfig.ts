import { toolCallError } from "@/ai/tools/error";
import { readAttachmentTool } from "@/ai/tools/readAttachment";
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
  userChatContext: UserChatContext;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortSignal: AbortSignal;
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
  const { studyUserChatId, userId, locale, logger, userChatContext, statReport, toolAbortSignal } =
    params;

  // =============================================================================
  // 1. Determine brief status
  // =============================================================================

  const briefStatus: "CLARIFIED" | "DRAFT" =
    userChatContext?.briefUserChatToken || userChatContext?.referenceUserChats?.length
      ? "CLARIFIED"
      : "DRAFT";

  // =============================================================================
  // 2. Build tools
  // =============================================================================

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortSignal,
    statReport,
    logger: logger,
  };

  const allTools = buildStudyTools({
    studyUserChatId,
    userChatContext,
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
      customPrepareStep: async ({ messages: _messages, model: _model }) => {
        const modelMessages = _messages;
        const model = _model;

        const toolUseCount = calculateToolUsage(modelMessages);
        let activeTools: (keyof TOOLS)[] | undefined = undefined;

        // After report/podcast generation, only allow specific tools
        if (
          (toolUseCount[StudyToolName.generateReport] ?? 0) > 0 ||
          (toolUseCount[StudyToolName.generatePodcast] ?? 0) > 0
        ) {
          activeTools = [
            StudyToolName.generateReport,
            StudyToolName.generatePodcast,
            StudyToolName.reasoningThinking,
            StudyToolName.readAttachment,
            StudyToolName.toolCallError,
          ];
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

        return { messages: modelMessages, activeTools, model };
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
function buildStudyTools({
  studyUserChatId,
  // userChatContext,
  userId,
  agentToolArgs,
}: {
  studyUserChatId: number;
  userChatContext: UserChatContext;
  userId: number;
  agentToolArgs: AgentToolConfigArgs;
}) {
  const contextfulAgentToolArgs = {
    userId,
    userChatId: studyUserChatId,
    ...agentToolArgs,
  };

  return {
    [StudyToolName.requestInteraction]: requestInteractionTool,
    [StudyToolName.webFetch]: webFetchTool({ locale: agentToolArgs.locale }),
    [StudyToolName.webSearch]: webSearchTool({ provider: "tavily", ...agentToolArgs }),
    [StudyToolName.reasoningThinking]: reasoningThinkingTool({ ...agentToolArgs }),
    [StudyToolName.searchPersonas]: searchPersonasTool({ ...contextfulAgentToolArgs }),
    [StudyToolName.scoutTaskChat]: scoutTaskChatTool({ ...contextfulAgentToolArgs }),
    [StudyToolName.buildPersona]: buildPersonaTool({ ...contextfulAgentToolArgs }),
    [StudyToolName.readAttachment]: readAttachmentTool({ ...contextfulAgentToolArgs }),
    [StudyToolName.interviewChat]: interviewChatTool({ ...contextfulAgentToolArgs }),
    [StudyToolName.discussionChat]: discussionChatTool({ ...contextfulAgentToolArgs }),
    [StudyToolName.generateReport]: generateReportTool({ ...contextfulAgentToolArgs }),
    [StudyToolName.generatePodcast]: generatePodcastTool({ ...contextfulAgentToolArgs }),
    [StudyToolName.planStudy]: planStudyTool({ ...contextfulAgentToolArgs }),
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
