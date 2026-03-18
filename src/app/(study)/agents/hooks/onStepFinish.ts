import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { StudyToolSet } from "@/app/(study)/tools";
import { StudyToolName } from "@/app/(study)/tools/types";
import { formatContentCore } from "@/app/api/format-content";
import { trackEventServerSide } from "@/lib/analytics/server";
import { generateChatTitle } from "@/lib/userChat/lib";
import { safeAbort } from "@/lib/utils";
import { ReasoningUIPart, StaticToolResult, StepResult, UIMessage } from "ai";
import { Locale } from "next-intl";
import { after } from "next/server";
import { Logger } from "pino";
import { AgentRequestConfig } from "../baseAgentRequest";
import { outOfBalance } from "../utils";

export interface StepFinishContext<TOOLS extends StudyToolSet> {
  studyUserChatId: number;
  userId: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  streamingMessage: UIMessage;
  agentConfig: AgentRequestConfig<TOOLS>;
  immediatePersistentMessage: () => Promise<void>;
  studyAbortController: AbortController;
  getStreamStartTime: () => number;
  resetStreamStartTime: () => void;
}

/**
 * Unified onStepFinish handler for all study agents.
 *
 * Handles:
 * - Immediate message persistence with reasoning signature fix
 * - Token usage stats reporting
 * - Tool completion events (report, podcast, saveAnalyst)
 * - Content formatting for tool outputs
 * - Balance check and abort
 * - Custom agent-specific handlers
 */
export async function handleStepFinish<TOOLS extends StudyToolSet>(
  step: StepResult<TOOLS>,
  ctx: StepFinishContext<TOOLS>,
) {
  const {
    studyUserChatId,
    userId,
    locale,
    logger,
    statReport,
    streamingMessage,
    agentConfig,
    immediatePersistentMessage,
    studyAbortController,
    getStreamStartTime,
    resetStreamStartTime,
  } = ctx;

  const modelId = step.response.modelId;

  logger.info({
    msg: "baseAgentRequest onStepFinish",
    finishReason: step.finishReason,
  });

  if (step.finishReason === "length") {
    logger.warn({
      msg: "⚠️ AGENT OUTPUT TRUNCATED: Hit maxTokens limit for this step",
      maxTokens: agentConfig.maxTokens,
      usage: step.usage,
    });
  }

  // =============================================================================
  // Immediate persistence with reasoning signature fix
  // =============================================================================

  await immediatePersistentMessage();
  {
    const reasoning = step.content.find((step) => step.type === "reasoning");
    if (reasoning) {
      const lastReasoningPartIndex = streamingMessage.parts.findLastIndex(
        (part) => part.type === "reasoning",
      );
      if (lastReasoningPartIndex !== -1) {
        streamingMessage.parts[lastReasoningPartIndex] = {
          ...streamingMessage.parts[lastReasoningPartIndex],
          text: reasoning.text,
          providerMetadata: reasoning.providerMetadata,
        } as ReasoningUIPart;
        await persistentAIMessageToDB({
          mode: "override",
          userChatId: studyUserChatId,
          message: streamingMessage,
        });
      }
    }
  }

  // =============================================================================
  // Stats reporting
  // =============================================================================

  const toolCalls = step.toolCalls.map((call) => call?.toolName ?? "unknown");
  const { tokens, extra } = calculateStepTokensUsage(step, { modelId });

  logger.info({
    msg: "baseAgentRequest onStepFinish",
    reasoning: step.reasoning.length,
    text: step.text.length,
    toolCalls,
    usage: extra.usage,
    cache: extra.cache,
  });

  if (statReport) {
    const reportedBy = "agent chat";
    const seconds = Math.floor((Date.now() - getStreamStartTime()) / 1000);
    resetStreamStartTime();
    await Promise.all([
      statReport("duration", seconds, { reportedBy }),
      statReport("steps", toolCalls.length, { reportedBy, toolCalls }),
      statReport("tokens", tokens, { reportedBy, ...extra }),
    ]);
  }

  // =============================================================================
  // Tool Completion Handlers
  // =============================================================================

  // Handle generateReport completion
  const generateReportTool = step.toolResults.find(
    (tool) =>
      !tool.dynamic &&
      tool.type === "tool-result" &&
      tool.toolName === StudyToolName.generateReport,
  ) as StaticToolResult<Pick<StudyToolSet, StudyToolName.generateReport>> | undefined;

  if (generateReportTool && "output" in generateReportTool && generateReportTool.output) {
    const reportToken =
      generateReportTool.output.reportToken ?? generateReportTool.input.reportToken;
    if (reportToken) {
      trackEventServerSide({
        userId,
        event: "Study Session Completed",
        properties: {
          userChatId: studyUserChatId,
          reportToken: reportToken,
        },
      });
    }
  }

  // Handle generatePodcast completion
  const generatePodcastTool = step.toolResults.find(
    (tool) =>
      !tool.dynamic &&
      tool.type === "tool-result" &&
      tool.toolName === StudyToolName.generatePodcast,
  ) as StaticToolResult<Pick<StudyToolSet, StudyToolName.generatePodcast>> | undefined;
  if (generatePodcastTool) {
    const podcastToken =
      generatePodcastTool.output.podcastToken ?? generatePodcastTool.input.podcastToken;
    trackEventServerSide({
      userId,
      event: "Study Session Completed",
      properties: {
        userChatId: studyUserChatId,
        podcastToken,
      },
    });
  }

  // Handle saveAnalyst/makeStudyPlan completion → generate chat title
  const saveAnalystOrMakeStudyPlanTool = step.toolResults.find(
    (tool) =>
      !tool.dynamic &&
      tool.type === "tool-result" &&
      (tool.toolName === StudyToolName.saveAnalyst ||
        tool.toolName === StudyToolName.makeStudyPlan),
  ) as
    | StaticToolResult<Pick<StudyToolSet, StudyToolName.saveAnalyst | StudyToolName.makeStudyPlan>>
    | undefined;
  // makeStudyPlan 没有 execute，不会出现在 step.toolResults 里
  // 现在改到了 saveAnalystFromPlan 里面再执行一次
  if (saveAnalystOrMakeStudyPlanTool) {
    after(
      generateChatTitle(studyUserChatId).catch((error) => {
        logger.error(`Failed to generate chat title: ${error.message}`);
      }),
    );
  }

  // =============================================================================
  // Custom agent-specific handler
  // =============================================================================

  if (agentConfig.specialHandlers?.customOnStepFinish) {
    await agentConfig.specialHandlers.customOnStepFinish(step, {
      studyUserChatId,
      userId,
      logger,
      streamStartTime: getStreamStartTime(),
    });
  }

  // =============================================================================
  // Content formatting for tool outputs
  // =============================================================================

  const promises = step.toolResults.map(async (toolResult) => {
    let text: string | undefined = undefined;
    if (
      toolResult.toolName === StudyToolName.audienceCall ||
      toolResult.toolName === StudyToolName.scoutSocialTrends ||
      toolResult.toolName === StudyToolName.discussionChat ||
      toolResult.toolName === StudyToolName.interviewChat ||
      toolResult.toolName === StudyToolName.planPodcast ||
      toolResult.toolName === StudyToolName.planStudy ||
      toolResult.toolName === StudyToolName.deepResearch
    ) {
      text = (toolResult as StaticToolResult<StudyToolSet>)?.output?.plainText;
    }
    if (text) {
      await formatContentCore({
        content: text,
        locale,
        userId,
        triggeredBy: "backend",
        live: true,
      });
    }
  });

  after(
    Promise.allSettled(promises).catch((error) => {
      logger.error(`Failed to format content, ${error.message}`);
    }),
  );

  // =============================================================================
  // Balance check
  // =============================================================================

  if (await outOfBalance({ userId })) {
    logger.warn("User out of balance, aborting agent");
    safeAbort(studyAbortController);
  }
}
