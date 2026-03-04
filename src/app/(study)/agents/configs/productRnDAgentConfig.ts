import { toolCallError } from "@/ai/tools/error";
import { readAttachmentTool } from "@/ai/tools/readAttachment";
import { webFetchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { UserChatContext } from "@/app/(study)/context/types";
import { productRnDSystem } from "@/app/(study)/prompt/productRnD";
import {
  audienceCallTool,
  generatePodcastTool,
  generateReportTool,
  scoutSocialTrendsTool,
} from "@/app/(study)/tools";
import { StudyToolName } from "@/app/(study)/tools/types";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { AgentRequestConfig } from "../baseAgentRequest";
import { calculateToolUsage } from "../utils";

/**
 * Parameters for creating product R&D agent configuration
 */
export interface ProductRnDAgentConfigParams {
  userId: number;
  studyUserChatId: number;
  userChatContext: UserChatContext;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortSignal: AbortSignal;
}

// 只是当前 agent 需要的 tools
type TOOLS = ReturnType<typeof buildProductRnDTools>;

/**
 * Create product R&D agent configuration
 *
 * Product R&D Agent features:
 * - Product innovation opportunity discovery
 * - 6 specialized tools focused on social trends and audience feedback
 * - Uses scoutSocialTrends instead of webSearch
 * - Emphasizes cross-domain inspiration (avoiding filter bubbles)
 * - User feedback driven (audienceCall) for validation
 * - Uses advanced model (claude-3-7-sonnet)
 */
export async function createProductRnDAgentConfig(
  params: ProductRnDAgentConfigParams,
): Promise<AgentRequestConfig<ReturnType<typeof buildProductRnDTools>>> {
  const { studyUserChatId, userId, locale, logger, statReport, toolAbortSignal } = params;

  // =============================================================================
  // 1. Build tools
  // =============================================================================

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortSignal,
    statReport,
    logger: logger,
  };

  const tools = buildProductRnDTools({
    studyUserChatId,
    userId,
    agentToolArgs,
  });

  // =============================================================================
  // 2. Build system prompt
  // =============================================================================

  const systemPrompt = productRnDSystem({ locale });

  // =============================================================================
  // 3. Return configuration
  // =============================================================================

  return {
    // model: "claude-sonnet-4-5",
    modelName: "minimax-m2.1",
    systemPrompt,
    tools,
    maxTokens: 1500, // 限制输出长度（约 500-750 字），工具输出会自动展示

    specialHandlers: {
      /**
       * customPrepareStep: Dynamic tool control
       * - Restrict tools after report/podcast generation
       */
      customPrepareStep: async ({ messages, model: _model }) => {
        const toolUseCount = calculateToolUsage(messages);
        let activeTools: (keyof TOOLS)[] | undefined = undefined;
        const model = _model;

        // After report/podcast generation, only allow specific tools
        if (
          (toolUseCount[StudyToolName.generateReport] ?? 0) > 0 ||
          (toolUseCount[StudyToolName.generatePodcast] ?? 0) > 0
        ) {
          activeTools = [
            StudyToolName.generateReport,
            StudyToolName.generatePodcast,
            StudyToolName.readAttachment,
            StudyToolName.toolCallError,
          ];
        }

        return { messages, activeTools, model };
      },

      // Note: customOnStepFinish removed - all notifications handled universally in base
      // - generateReport completion → notifyReportCompletion + trackEvent (in base)
      // - generatePodcast completion → trackEvent (in base)
    },
  };
}

/**
 * Build product R&D tools focused on innovation discovery
 */
function buildProductRnDTools(params: {
  studyUserChatId: number;
  userId: number;
  agentToolArgs: AgentToolConfigArgs;
}) {
  const { studyUserChatId, userId, agentToolArgs } = params;

  return {
    [StudyToolName.webFetch]: webFetchTool({ locale: agentToolArgs.locale }),
    [StudyToolName.audienceCall]: audienceCallTool({ ...agentToolArgs }),
    [StudyToolName.scoutSocialTrends]: scoutSocialTrendsTool({ userId, ...agentToolArgs }),
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
    [StudyToolName.readAttachment]: readAttachmentTool({
      userId,
      userChatId: studyUserChatId,
      ...agentToolArgs,
    }),
    [StudyToolName.toolCallError]: toolCallError,
  };
}
