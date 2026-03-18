import {
  appendChunkToStreamingMessage,
  createDebouncePersistentMessage,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { defaultProviderOptions, llm, type LLMModelName } from "@/ai/provider";
import { handleToolCallError } from "@/ai/tools/error";
import { StatReporter } from "@/ai/tools/types";
import { StudyToolSet } from "@/app/(study)/tools";
import { StudyToolName } from "@/app/(study)/tools/types";
import { failUserChatRun, startManagedRun } from "@/lib/userChat/runtime";
import { safeAbort } from "@/lib/utils";
import {
  JSONValue,
  ModelMessage,
  PrepareStepFunction,
  smoothStream,
  stepCountIs,
  StepResult,
  streamText,
  TextStreamPart,
  ToolChoice,
  UIMessageStreamWriter,
} from "ai";
import { Locale } from "next-intl";
import { after } from "next/server";
import { Logger } from "pino";
import { UserChatContext } from "../context/types";
import { handleStepFinish } from "./hooks/onStepFinish";
import { notifyStudyInterruption } from "./notify";
import { prepareMessages } from "./prepareMessages";
import { fixReasoningPartsInModelMessages, setBedrockCache } from "./utils";

/**
 * Base context shared by all agent types.
 */
export interface BaseAgentContext {
  userId: number;
  teamId: number | null;
  studyUserChatId: number;
  userChatContext: UserChatContext;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
}

/**
 * Agent configuration for unified execution
 *
 * Defaults:
 * - maxSteps: 30
 * - maxTokens: undefined
 * - toolChoice: "auto"
 */
export interface AgentRequestConfig<TOOLS extends StudyToolSet = StudyToolSet> {
  modelName: LLMModelName;
  providerOptions?: Record<string, Record<string, JSONValue>>;
  systemPrompt: string;
  tools: TOOLS;
  maxSteps?: number;
  maxTokens?: number;
  toolChoice?: ToolChoice<TOOLS>;

  specialHandlers?: {
    customPrepareStep?: PrepareStepFunction<NoInfer<TOOLS>> | undefined;
    customOnStepFinish?: (step: StepResult<TOOLS>, context: BaseStepContext) => Promise<void>;
  };
}

/**
 * Context passed to custom onStepFinish
 */
export interface BaseStepContext {
  studyUserChatId: number;
  userId: number;
  logger: Logger;
  streamStartTime: number;
}

/**
 * Unified agent request executor
 *
 * Extracts common infrastructure from study, fastInsight, and productRnD agents.
 */
export async function executeBaseAgentRequest<TOOLS extends StudyToolSet = StudyToolSet>(
  baseContext: BaseAgentContext,
  createAgentConfig: (toolAbortSignal: AbortSignal) => Promise<AgentRequestConfig<TOOLS>>,
  options?: {
    // 和 ClientMessagePayload 的 executionMode 对齐
    // TODO: 如果是 sync 还需要 abortSignal 和 req.signal 关联, 之后再加
    executionMode?: "sync" | "background";
    streamWriter?: UIMessageStreamWriter;
  },
) {
  const { userId, studyUserChatId, userChatContext, locale, logger, statReport } = baseContext;

  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    studyUserChatId,
    5000,
    logger,
  );

  // =============================================================================
  // Phase 1: Managed Run + Abort Controllers
  // =============================================================================

  const {
    runId,
    abortSignal: managedAbortSignal,
    cleanup: cleanupRun,
  } = await startManagedRun({
    userChatId: studyUserChatId,
    logger,
  });

  const toolAbortController = new AbortController();
  const studyAbortController = new AbortController();

  managedAbortSignal.addEventListener("abort", () => {
    setTimeout(() => safeAbort(toolAbortController), 0);
    setTimeout(() => safeAbort(studyAbortController), 1000);
  });

  // =============================================================================
  // Phase 2: Build Config + Prepare Messages
  // =============================================================================

  const agentConfig = await createAgentConfig(toolAbortController.signal);

  const { coreMessages, streamingMessage, toolUseCount } = await prepareMessagesForStreaming(
    studyUserChatId,
    { tools: agentConfig.tools },
  );

  let modelName = agentConfig.modelName;
  let modelMessages: ModelMessage[] = [...coreMessages];
  if (
    (toolUseCount[StudyToolName.generateReport] ?? 0) > 0 ||
    (toolUseCount[StudyToolName.generatePodcast] ?? 0) > 0
  ) {
    // 报告生成以后，换成更轻量的模型
    modelName = "gemini-3-flash";
  }
  let providerOptions: NonNullable<typeof agentConfig.providerOptions> =
    agentConfig.providerOptions ?? defaultProviderOptions();

  {
    const fixed = fixReasoningPartsInModelMessages({
      providerOptions,
      modelMessages,
      modelName,
      streamingMessage,
    });
    modelMessages = fixed.modelMessages;
    providerOptions = fixed.providerOptions;
  }

  // =============================================================================
  // Phase 3: Prepare Messages (MCP, Team Prompt, Reference Context, Memory)
  // =============================================================================

  const prepared = await prepareMessages({
    userId,
    teamId: baseContext.teamId,
    locale,
    logger,
    statReport,
    userChatContext,
    modelMessages,
    systemPrompt: agentConfig.systemPrompt,
    tools: agentConfig.tools,
    toolAbortSignal: toolAbortController.signal,
  });

  const finalSystemPrompt = prepared.finalSystemPrompt;
  const finalTools = { ...agentConfig.tools, ...prepared.finalTools };
  modelMessages = prepared.modelMessages;

  // =============================================================================
  // Phase 4: streamText
  // =============================================================================

  let streamStartTime = Date.now();
  const streamTextResult = streamText<TOOLS>({
    model: llm(modelName),
    providerOptions,
    system: finalSystemPrompt,
    messages: modelMessages,
    tools: finalTools as TOOLS,
    toolChoice: agentConfig.toolChoice ?? "auto",
    experimental_repairToolCall: handleToolCallError,
    maxOutputTokens: agentConfig.maxTokens,

    stopWhen: [
      stepCountIs(agentConfig.maxSteps ?? 30),
      ({ steps }) =>
        steps.some((step) =>
          step.toolResults?.some(
            (toolResult) =>
              toolResult?.toolName === "generatePodcast" ||
              toolResult?.toolName === "generateReport",
          ),
        ),
    ],

    prepareStep: async (options) => {
      const { messages: currentMessages } = options;
      logger.info({ msg: "baseAgentRequest prepareStep", messagesLength: currentMessages.length });

      const customResult = agentConfig.specialHandlers?.customPrepareStep
        ? await agentConfig.specialHandlers.customPrepareStep(options)
        : undefined;

      const effectiveModel = customResult?.model ?? llm(modelName);
      const messages = (typeof effectiveModel === "string"
        ? effectiveModel
        : effectiveModel.modelId
      )?.includes("claude")
        ? setBedrockCache("claude-xxx", [...currentMessages])
        : [...currentMessages];

      return {
        messages,
        activeTools: customResult?.activeTools,
        model: customResult?.model,
      };
    },

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    // =============================================================================
    // Lifecycle Hooks
    // =============================================================================

    onChunk: async ({ chunk }: { chunk: TextStreamPart<TOOLS> }) => {
      appendChunkToStreamingMessage(streamingMessage, chunk);
      await debouncePersistentMessage(streamingMessage, {
        immediate:
          chunk.type !== "text-delta" &&
          chunk.type !== "reasoning-delta" &&
          chunk.type !== "tool-input-delta",
      });
    },

    onStepFinish: async (step: StepResult<TOOLS>) => {
      await handleStepFinish(step, {
        studyUserChatId,
        userId,
        locale,
        logger,
        statReport,
        streamingMessage,
        agentConfig,
        immediatePersistentMessage,
        studyAbortController,
        getStreamStartTime: () => streamStartTime,
        resetStreamStartTime: () => {
          streamStartTime = Date.now();
        },
      });
    },

    onFinish: async ({ usage, providerMetadata, finishReason, steps }) => {
      const cache = providerMetadata?.bedrock?.usage;
      const maxStepsConfig = agentConfig.maxSteps ?? 30;
      const hitMaxSteps = steps.length >= maxStepsConfig;
      const hasReportOrPodcast = steps.some((step) =>
        step.toolResults?.some(
          (toolResult) =>
            toolResult?.toolName === "generatePodcast" || toolResult?.toolName === "generateReport",
        ),
      );

      logger.info({
        msg: "baseAgentRequest onFinish",
        finishReason,
        totalSteps: steps.length,
        maxStepsConfig,
        hitMaxSteps,
        hasReportOrPodcast,
        usage,
        cache,
      });

      if (finishReason === "length") {
        logger.warn({
          msg: "⚠️ AGENT CONVERSATION TRUNCATED: Hit maxTokens limit",
          maxTokens: agentConfig.maxTokens,
          totalSteps: steps.length,
          usage,
        });
      }

      if (hitMaxSteps && !hasReportOrPodcast) {
        logger.warn({
          msg: "⚠️ AGENT STOPPED: Hit maxSteps limit without completing report/podcast",
          maxSteps: maxStepsConfig,
          totalSteps: steps.length,
        });
      }

      if (hasReportOrPodcast) {
        logger.info({
          msg: "Agent stopped after report/podcast generation (expected)",
          totalSteps: steps.length,
        });
      }

      await cleanupRun();
    },

    onError: async ({ error }) => {
      if (/Error executing tool.*abortSignal received/.test((error as Error).message)) {
        logger.warn(`baseAgentRequest tool call aborted: ${(error as Error).message}`);
        return;
      }

      logger.error({ msg: "baseAgentRequest onError", error: (error as Error).message });
      safeAbort(toolAbortController);

      try {
        await failUserChatRun({
          userChatId: studyUserChatId,
          runId,
          error: (error as Error).message,
        });
      } catch (dbError) {
        logger.error({ msg: "Error saving run state", error: (dbError as Error).message });
        await cleanupRun();
      }

      notifyStudyInterruption({
        userChatId: studyUserChatId,
        logger,
      }).catch(() => {});
    },

    abortSignal: studyAbortController.signal,
  });

  // =============================================================================
  // Phase 5: Consume Stream, Forward Stream
  // =============================================================================

  options?.streamWriter?.merge(
    streamTextResult.toUIMessageStream({
      generateMessageId: () => streamingMessage.id,
    }),
  );

  // 这里不再使用 after，而是在调用的地方使用，以自行决定是要 sync 还是 background
  const streamTextResultPromise = streamTextResult
    .consumeStream()
    .then(() => logger.info("study consumeStream completed"))
    .catch((error) =>
      logger.error({ msg: "study consumeStream error", error: (error as Error).message }),
    );
  if (options?.executionMode === "sync") {
    await streamTextResultPromise;
  } else {
    after(streamTextResultPromise);
  }
}
