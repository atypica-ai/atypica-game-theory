import { fastInsightSystem } from "@/ai/prompt";
import {
  generatePodcastTool,
  generateReportTool,
  planPodcastTool,
  toolCallError,
  webFetchTool,
  webSearchTool,
} from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter, ToolName } from "@/ai/tools/types";
import { deepResearchTool } from "@/app/(deepResearch)/deepResearch";
import type { Analyst, UserChatExtra } from "@/prisma/client";
import { AnalystKind } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { TypedToolResult } from "ai";
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
  analyst: Analyst;
  userChatExtra: UserChatExtra;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortController: AbortController;
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
 * - planPodcast result saved to analyst
 * - Optional report generation
 * - Universal attachment processing (handled in base)
 */
export async function createFastInsightAgentConfig(
  params: FastInsightAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const { studyUserChatId, userId, locale, statReport, toolAbortController } = params;

  // =============================================================================
  // 1. Build tools
  // =============================================================================

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortController.signal,
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
    model: "claude-sonnet-4",
    systemPrompt,
    tools,
    maxSteps: 10, // Fast execution - override default

    specialHandlers: {
      // Note: beforeStreamText removed - attachment processing handled universally in base

      /**
       * customPrepareStep: Dynamic tool control
       * - Restrict tools after report/podcast generation
       * - Limit webSearch usage (max 3 times)
       */
      customPrepareStep: async ({ messages }) => {
        const toolUseCount = calculateToolUsage(messages);
        let activeTools: (keyof TOOLS)[] | undefined = undefined;

        // After report/podcast generation, only allow specific tools
        if (
          (toolUseCount[ToolName.generateReport] ?? 0) > 0 ||
          (toolUseCount[ToolName.generatePodcast] ?? 0) > 0
        ) {
          activeTools = [ToolName.generateReport, ToolName.generatePodcast, ToolName.toolCallError];
        }
        // Limit webSearch usage (fast insight doesn't have planStudy)
        else {
          if ((toolUseCount[ToolName.webSearch] ?? 0) >= 3) {
            activeTools = (Object.keys(tools) as (keyof TOOLS)[]).filter(
              (toolName) => toolName !== ToolName.webSearch,
            );
          }
        }

        return { messages, activeTools };
      },

      /**
       * customOnStepFinish: Handle planPodcast result saving to analyst
       * - Save planPodcast result to analyst (topic, kind, locale)
       * Note: Universal notifications (completion, title) handled in base
       */
      customOnStepFinish: async (step) => {
        // Handle planPodcast result (fast insight specific)
        const planPodcastTool = step.toolResults.find(
          (tool) => tool?.toolName === ToolName.planPodcast,
        ) as Extract<TypedToolResult<typeof tools>, { toolName: ToolName.planPodcast }>;

        if (planPodcastTool && planPodcastTool.output?.text) {
          const { analyst: analystRecord } = await prisma.userChat.findUniqueOrThrow({
            where: { id: studyUserChatId, kind: "study" },
            select: { analyst: { select: { id: true } } },
          });

          if (analystRecord) {
            await prisma.analyst.update({
              where: { id: analystRecord.id },
              data: {
                role: "Podcast Researcher",
                topic: planPodcastTool.output.text,
                kind: AnalystKind.fastInsight,
                locale: locale,
              },
            });

            // Note: generateChatTitle is already called in base for planPodcast
          }
        }

        // Note: generateReport/generatePodcast completion notifications handled in base
      },
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
    [ToolName.webFetch]: webFetchTool({ locale: agentToolArgs.locale }),
    [ToolName.webSearch]: webSearchTool({ provider: "perplexity", ...agentToolArgs }), // Use perplexity
    [ToolName.planPodcast]: planPodcastTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.generatePodcast]: generatePodcastTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.generateReport]: generateReportTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.deepResearch]: deepResearchTool({ userId, ...agentToolArgs }),
    [ToolName.toolCallError]: toolCallError,
  };
}
