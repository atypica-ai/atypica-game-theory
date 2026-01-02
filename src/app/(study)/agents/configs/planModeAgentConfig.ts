import "server-only";

import { planModeSystem } from "@/ai/prompt/study/planMode";
import {
  reasoningThinkingTool,
  requestInteractionTool,
  saveAnalystTool,
  toolCallError,
  webFetchTool,
  webSearchTool,
} from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter, ToolName } from "@/ai/tools/types";
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
  toolAbortController: AbortController;
}

// Tools available in Plan Mode
type TOOLS = ReturnType<typeof buildPlanModeTools>;

/**
 * Create plan mode agent configuration
 *
 * Plan Mode (Intent Layer) features:
 * - Conversational intent clarification (flexible rounds)
 * - Background research (flexible webSearch/webFetch usage)
 * - Auto-judge research kind and framework
 * - Cost estimation
 * - User confirmation via requestInteraction
 * - Save intent via saveAnalyst (unified tool)
 */
export async function createPlanModeAgentConfig(
  params: PlanModeAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const { studyUserChatId, locale, logger, statReport, toolAbortController } = params;

  // Build tools
  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortController.signal,
    statReport,
    logger,
  };

  const tools = buildPlanModeTools({ studyUserChatId, ...agentToolArgs });

  return {
    model: "claude-sonnet-4",
    systemPrompt: planModeSystem({ locale }),
    tools,
    maxSteps: 15, // Plan mode may need more steps for thorough clarification

    specialHandlers: {
      // No customPrepareStep needed - tools are freely available
      // No custom onStepFinish needed - saveAnalyst tool handles the transition to execution phase
    },
  };
}

function buildPlanModeTools(params: {
  studyUserChatId: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}) {
  const { studyUserChatId, ...agentToolArgs } = params;

  return {
    [ToolName.requestInteraction]: requestInteractionTool,
    [ToolName.webSearch]: webSearchTool(agentToolArgs),
    [ToolName.webFetch]: webFetchTool(agentToolArgs),
    [ToolName.reasoningThinking]: reasoningThinkingTool(agentToolArgs),
    [ToolName.saveAnalyst]: saveAnalystTool({ studyUserChatId }),
    [ToolName.toolCallError]: toolCallError,
  };
}
