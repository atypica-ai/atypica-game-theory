import "server-only";

import { toolCallError } from "@/ai/tools/error";
import { webFetchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { planModeSystem } from "@/app/(study)/prompt/planMode";
import { makeStudyPlanTool, requestInteractionTool } from "@/app/(study)/tools";
import { StudyToolName } from "@/app/(study)/tools/types";
import { BedrockProviderOptions } from "@ai-sdk/amazon-bedrock";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { AgentRequestConfig } from "../baseAgentRequest";

/**
 * Parameters for creating plan mode agent configuration
 */
export interface PlanModeAgentConfigParams {
  userId: number;
  studyUserChatId: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortSignal: AbortSignal;
}

// Tools available in Plan Mode
type TOOLS = ReturnType<typeof buildPlanModeTools>;

/**
 * Create plan mode agent configuration
 *
 * Plan Mode (Intent Layer) features:
 * - Conversational intent clarification (flexible rounds)
 * - Background research (webFetch for intelligent search/URL fetching)
 * - Auto-judge research kind and framework
 * - Cost estimation
 * - User confirmation via requestInteraction
 * - Save intent via saveAnalyst (unified tool)
 */
export async function createPlanModeAgentConfig(
  params: PlanModeAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const { locale, logger, statReport, toolAbortSignal } = params;

  // Build tools
  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortSignal,
    statReport,
    logger,
  };

  const tools = buildPlanModeTools(agentToolArgs);

  return {
    modelName: "claude-sonnet-4-5",
    providerOptions: {
      bedrock: {
        reasoningConfig: {
          type: "enabled",
          maxReasoningEffort: "medium",
          budgetTokens: 1024,
        },
      } satisfies BedrockProviderOptions,
    },
    systemPrompt: planModeSystem({ locale }),
    tools,
    maxSteps: 5, // Plan mode may need more steps for thorough clarification
    maxTokens: 1500, // 限制输出长度（约 500-750 字），对话需要自然但简洁

    specialHandlers: {
      // No customPrepareStep needed - tools are freely available
      // No custom onStepFinish needed - saveAnalyst tool handles the transition to execution phase
    },
  };
}

function buildPlanModeTools(params: AgentToolConfigArgs) {
  return {
    [StudyToolName.requestInteraction]: requestInteractionTool,
    [StudyToolName.makeStudyPlan]: makeStudyPlanTool,
    [StudyToolName.webFetch]: webFetchTool(params),
    // [StudyToolName.reasoningThinking]: reasoningThinkingTool(params),  // 这个不需要了，因为开启了 reasoningConfig
    [StudyToolName.toolCallError]: toolCallError,
  };
}
