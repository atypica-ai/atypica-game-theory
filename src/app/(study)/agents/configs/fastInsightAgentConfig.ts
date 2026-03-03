import { toolCallError } from "@/ai/tools/error";
import { fetchAttachmentFileTool } from "@/ai/tools/fetchAttachmentFile";
import { webFetchTool, webSearchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { deepResearchTool } from "@/app/(deepResearch)/deepResearch";
import { UserChatContext } from "@/app/(study)/context/types";
import { fastInsightSystem } from "@/app/(study)/prompt/fastInsight";
import { generatePodcastTool, generateReportTool, planPodcastTool } from "@/app/(study)/tools";
import { StudyToolName } from "@/app/(study)/tools/types";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { AgentRequestConfig } from "../baseAgentRequest";
import { calculateToolUsage } from "../utils";

/**
 * Parameters for creating fast insight agent configuration
 */
export interface FastInsightAgentConfigParams {
  userId: number;
  studyUserChatId: number;
  userChatContext: UserChatContext;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortSignal: AbortSignal;
}

// 只是当前 agent 需要的 tools
type TOOLS = ReturnType<typeof buildFastInsightTools>;

/**
 * Create fast insight agent configuration
 *
 * Fast Insight Agent features:
 * - Podcast-first research workflow
 * - 7 specialized tools (minimal set)
 * - Uses perplexity for webSearch
 * - Fast execution (max 10 steps)
 * - Intent and metadata set in Plan Mode
 * - Optional report generation
 * - Universal attachment processing (handled in base)
 */
export async function createFastInsightAgentConfig(
  params: FastInsightAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const { studyUserChatId, userId, locale, statReport, toolAbortSignal } = params;

  // =============================================================================
  // 1. Build tools
  // =============================================================================

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortSignal,
    statReport,
    logger: params.logger,
  };

  const tools = buildFastInsightTools({
    studyUserChatId,
    userId,
    agentToolArgs,
  });

  // =============================================================================
  // 2. Build system prompt
  // =============================================================================

  const systemPrompt = fastInsightSystem({ locale });

  // =============================================================================
  // 3. Return configuration
  // =============================================================================

  return {
    modelName: "claude-sonnet-4-5",
    systemPrompt,
    tools,
    maxSteps: 10, // Fast execution - override default
    maxTokens: 1200, // 限制输出长度（约 400-600 字），Fast Insight 最简洁

    specialHandlers: {
      // Note: beforeStreamText removed - attachment processing handled universally in base

      /**
       * customPrepareStep: Dynamic tool control
       * - Restrict tools after report/podcast generation
       * - Limit webSearch usage (max 3 times)
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
            StudyToolName.fetchAttachmentFile,
            StudyToolName.toolCallError,
          ];
        } else {
          // Limit webSearch usage (fast insight doesn't have planStudy)
          if ((toolUseCount[StudyToolName.webSearch] ?? 0) >= 3) {
            activeTools = (Object.keys(tools) as (keyof TOOLS)[]).filter(
              (toolName) => toolName !== StudyToolName.webSearch,
            );
          }
        }

        return { messages: modelMessages, activeTools, model };
      },

      // Note: customOnStepFinish removed - all notifications handled universally in base
      // - generateReport/generatePodcast completion → notifyReportCompletion + trackEvent (in base)
      // - planPodcast completion → generateChatTitle (in base)
    },
  };
}

/**
 * Build fast insight tools with minimal podcast-focused set
 */
function buildFastInsightTools(params: {
  studyUserChatId: number;
  userId: number;
  agentToolArgs: AgentToolConfigArgs;
}) {
  const { studyUserChatId, userId, agentToolArgs } = params;

  return {
    [StudyToolName.webFetch]: webFetchTool({ locale: agentToolArgs.locale }),
    [StudyToolName.webSearch]: webSearchTool({ provider: "perplexity", ...agentToolArgs }), // Use perplexity
    [StudyToolName.planPodcast]: planPodcastTool({ studyUserChatId, ...agentToolArgs }),
    [StudyToolName.generatePodcast]: generatePodcastTool({
      userId,
      userChatId: studyUserChatId,
      ...agentToolArgs,
    }),
    [StudyToolName.generateReport]: generateReportTool({
      userId,
      userChatId: studyUserChatId,
      ...agentToolArgs,
    }),
    [StudyToolName.deepResearch]: deepResearchTool({ userId, ...agentToolArgs }),
    [StudyToolName.fetchAttachmentFile]: fetchAttachmentFileTool({
      userId,
      userChatId: studyUserChatId,
      ...agentToolArgs,
    }),
    [StudyToolName.toolCallError]: toolCallError,
  };
}
