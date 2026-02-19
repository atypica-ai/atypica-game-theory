import {
  appendChunkToStreamingMessage,
  createDebouncePersistentMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { defaultProviderOptions, llm, type LLMModelName } from "@/ai/provider";
import { handleToolCallError } from "@/ai/tools/error";
import { getMcpClientManager } from "@/ai/tools/mcp/client";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { loadUserMemory } from "@/app/(memory)/lib/loadMemory";
import { buildMemoryUsagePrompt } from "@/app/(memory)/prompt/memoryUsage";
import { createSubAgentTool, StudyToolSet } from "@/app/(study)/tools";
import { StudyToolName } from "@/app/(study)/tools/types";
import { formatContentCore } from "@/app/api/format-content";
import { getTeamConfigWithDefault } from "@/app/team/teamConfig/lib";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { trackEventServerSide } from "@/lib/analytics/server";
import { generateChatTitle } from "@/lib/userChat/lib";
import { failUserChatRun, startManagedRun } from "@/lib/userChat/runtime";
import { safeAbort } from "@/lib/utils";
import {
  ImagePart,
  JSONValue,
  ModelMessage,
  PrepareStepFunction,
  ReasoningUIPart,
  smoothStream,
  StaticToolResult,
  stepCountIs,
  StepResult,
  streamText,
  TextPart,
  TextStreamPart,
  ToolChoice,
  UIMessageStreamWriter,
} from "ai";
import { Locale } from "next-intl";
import { after } from "next/server";
import { Logger } from "pino";
import { UserChatContext } from "../context/types";
import { notifyStudyInterruption } from "./notify";
import { buildReferenceStudyContext } from "./referenceContext";
import {
  fixReasoningPartsInModelMessages,
  outOfBalance,
  setBedrockCache,
  waitUntilAttachmentsProcessed,
} from "./utils";

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

// /**
//  * Prepare step result with optional active tools restriction
//  */
// export interface PrepareStepResult {
//   messages: ModelMessage[];
//   activeTools?: string[];
// }

/**
 * Agent configuration for unified execution
 *
 * Defaults:
 * - maxSteps: 30
 * - maxTokens: undefined
 * - toolChoice: "auto"
 */
export interface AgentRequestConfig<TOOLS extends StudyToolSet = StudyToolSet> {
  // Core streaming configuration
  modelName: LLMModelName;
  providerOptions?: Record<string, Record<string, JSONValue>>;
  systemPrompt: string;
  tools: TOOLS;
  maxSteps?: number; // Default: 30
  maxTokens?: number; // Default: undefined
  toolChoice?: ToolChoice<TOOLS>; // Default: "auto"

  // Special handlers for customization
  specialHandlers?: {
    /**
     * Custom prepareStep logic for dynamic tool control
     * Called by streamText's prepareStep, receives current messages
     * Should return activeTools to restrict available tools
     */
    customPrepareStep?: PrepareStepFunction<NoInfer<TOOLS>> | undefined;

    /**
     * Custom onStepFinish logic for agent-specific processing
     * Called after base onStepFinish completes
     * Note: Universal notifications (report/podcast completion, chat title) are handled in base
     */
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
 * Extracts common infrastructure (85% code duplication) from:
 * - studyAgentRequest
 * - fastInsightAgentRequest
 * - productRnDAgentRequest
 *
 * Design principles:
 * - Extract common patterns, preserve business differences
 * - Plugin-based lifecycle hooks for customization
 * - Type-safe tool configuration
 * - Universal attachment processing
 * - Universal completion notifications
 */
export async function executeBaseAgentRequest<TOOLS extends StudyToolSet = StudyToolSet>(
  baseContext: BaseAgentContext,
  createAgentConfig: (toolAbortSignal: AbortSignal) => Promise<AgentRequestConfig<TOOLS>>,
  streamWriter?: UIMessageStreamWriter,
) {
  const { userId, studyUserChatId, userChatContext, locale, logger, statReport } = baseContext;

  // Create debounced message persistence (5s debounce)
  // ⚠️ 现在改用 onStepFinish 保存
  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    studyUserChatId,
    5000,
    logger,
  );

  // =============================================================================
  // Phase 1: Managed Run + Abort Controllers
  // =============================================================================

  // Start managed run — writes runId to DB (also clears previous error), starts watcher, returns abort signal.
  const {
    runId,
    abortSignal: managedAbortSignal,
    cleanup: cleanupRun,
  } = await startManagedRun({
    userChatId: studyUserChatId,
    logger,
  });

  // Create abort controllers. Both are internal — callers never see them.
  const toolAbortController = new AbortController();
  const studyAbortController = new AbortController();

  managedAbortSignal.addEventListener("abort", () => {
    setTimeout(() => safeAbort(toolAbortController), 0);
    setTimeout(() => safeAbort(studyAbortController), 1000);
  });

  // =============================================================================
  // Phase 2: Build Config + Prepare Messages
  // =============================================================================

  // Build agent config. The config factory receives toolAbortSignal so tools can observe it.
  const agentConfig = await createAgentConfig(toolAbortController.signal);

  // Prepare streaming messages
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
    // 报告生成以后，就换成 minimax 模型，以减少消耗
    modelName = "minimax-m2.1";
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
  // Phase 3: Universal Attachment Processing
  // =============================================================================

  // Process attachments if analyst is provided (universal for all agents)
  const parsedAttachments = await waitUntilAttachmentsProcessed({
    userId,
    userChatContext,
    locale,
    streamWriter,
    streamingMessage,
  });

  // =============================================================================
  // Phase 4: Universal MCP and Team System Prompt
  // =============================================================================

  // Load MCP clients (universal, if team-specific)
  const manager = getMcpClientManager();
  const mcpClients = baseContext.teamId ? await manager.getClientsForTeam(baseContext.teamId) : [];
  logger.info({
    msg: "Loaded MCP clients",
    mcpClients: mcpClients.length,
    teamId: baseContext.teamId,
  });

  // Load team system prompt (universal, if team-specific)
  const teamSystemPrompt = baseContext.teamId
    ? await getTeamConfigWithDefault(baseContext.teamId, TeamConfigName.studySystemPrompt, {
        "zh-CN": "",
        "en-US": "",
      })
    : null;

  // Build final system prompt (append team system prompt if available)
  let finalSystemPrompt = agentConfig.systemPrompt;
  if (teamSystemPrompt && typeof teamSystemPrompt === "object" && locale in teamSystemPrompt) {
    const prompt = teamSystemPrompt[locale];
    if (prompt) {
      finalSystemPrompt = `${agentConfig.systemPrompt}\n\n${prompt}`;
    }
  }

  // Build final tools (add createSubAgent if MCP clients available)
  const finalTools = { ...agentConfig.tools };
  if (mcpClients.length > 0) {
    const agentToolArgs: AgentToolConfigArgs = {
      locale,
      abortSignal: toolAbortController.signal,
      statReport,
      logger,
    };
    finalTools[StudyToolName.createSubAgent] = createSubAgentTool({
      userId,
      clients: mcpClients,
      ...agentToolArgs,
    });
    logger.info({ msg: "Added createSubAgent tool", mcpClientsCount: mcpClients.length });
  }

  // =============================================================================
  // Phase 5: Universal Persona Tier Decision (for first-time users)
  // =============================================================================
  //
  // DEPRECATED: Moved to Study Agent prompt control
  // Now Study Agent will use requestInteraction tool to ask about private persona usage
  // when appropriate, rather than forcing it at the start of every study.
  //
  // // Check persona tier decision for first-time users (only if this is the first message)
  // if (modelMessages.length === 1 && modelMessages[0].role === "user") {
  //   const shouldDecide = await shouldDecidePersonaTier({
  //     locale,
  //     userId,
  //     studyUserChatId,
  //     streamWriter,
  //     streamingMessage,
  //   });
  //
  //   if (shouldDecide) {
  //     // Persona tier decision UI already sent, exit early
  //     return;
  //   }
  // }

  // =============================================================================
  // Phase 5: Build Model Messages
  // =============================================================================

  // Prepend attachments (universal)
  if (parsedAttachments.length) {
    modelMessages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              locale === "zh-CN"
                ? "用户上传的参考资料（请作为研究背景参考，无需直接回复）："
                : "User-uploaded reference materials (for research context, no direct response needed):",
          },
          ...parsedAttachments
            .map((parsedAttachment) => {
              if (parsedAttachment.type === "image") {
                return {
                  type: "image",
                  image: parsedAttachment.dataUrl,
                  mediaType: parsedAttachment.mimeType,
                } as ImagePart;
              } else {
                return {
                  type: "text",
                  text: parsedAttachment.text,
                } as TextPart;
              }
            })
            .filter(Boolean),
        ],
      },
      ...modelMessages,
    ];
  }

  // Prepend reference study context (universal)
  if (userChatContext?.referenceUserChats) {
    const referenceStudyContext = await buildReferenceStudyContext({
      referenceTokens: userChatContext.referenceUserChats,
      userId,
      locale,
    });
    if (referenceStudyContext) {
      modelMessages = [
        {
          role: "user",
          content: referenceStudyContext,
        },
        ...modelMessages,
      ];
    }
  }

  // =============================================================================
  // Phase 6: Update and Load User Memories
  // =============================================================================

  const userMemory = await loadUserMemory(userId);
  if (userMemory) {
    const text = buildMemoryUsagePrompt({ userMemory, locale });
    modelMessages = [{ role: "user", content: [{ type: "text", text }] }, ...modelMessages];
  }

  // =============================================================================
  // Phase 7: streamText Configuration
  // =============================================================================

  let streamStartTime = Date.now();
  const streamTextResult = streamText<TOOLS>({
    // Core configuration
    model: llm(modelName),
    providerOptions,
    system: finalSystemPrompt, // Use final system prompt (with team prompt appended)
    messages: modelMessages,
    tools: finalTools, // Use final tools (with createSubAgent if MCP available)
    toolChoice: agentConfig.toolChoice ?? "auto",
    experimental_repairToolCall: handleToolCallError,
    maxOutputTokens: agentConfig.maxTokens,

    // Stop conditions
    stopWhen: [
      stepCountIs(agentConfig.maxSteps ?? 30),
      ({ steps }) => {
        // Stop after report or podcast generation
        return steps.some((step) =>
          step.toolResults?.some(
            (toolResult) =>
              toolResult?.toolName === "generatePodcast" ||
              toolResult?.toolName === "generateReport",
          ),
        );
      },
    ],

    // Dynamic tool control via prepareStep
    prepareStep: async (options) => {
      const { messages: currentMessages } = options;
      logger.info({ msg: "baseAgentRequest prepareStep", messagesLength: currentMessages.length });

      // Execute custom prepareStep logic (if provided)
      const customResult = agentConfig.specialHandlers?.customPrepareStep
        ? await agentConfig.specialHandlers.customPrepareStep(options)
        : undefined;

      // Determine which model to use (custom model or default config model)
      const effectiveModel = customResult?.model ?? llm(modelName);
      // Apply Bedrock cache for prompt caching (only for claude models)
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

    // Smooth streaming for Chinese characters
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    // =============================================================================
    // Lifecycle Hooks
    // =============================================================================

    /**
     * onChunk: Incremental message persistence with debouncing
     * 为了能够在刷新以后，background 运行的时候也能看到 tool 正在被执行，需要 onChunk 的时候保存而不只是 onStepFinish 时候保存
     *   而且不能只处理 tool，一个 step 可能是 reasoning + text + tool,
     *   如果 onChunk 只是保存 tool 而 onStepFinish 保存别的，这样混用会有问题
     *   会导致 reasoning part 被保存在 tool part 后面
     * 然而，chunk 里拿不到 claude reasoning part 的 signature (在 providerMetadata 里), 只需要在 onStepFinish 里修复
     */
    onChunk: async ({ chunk }: { chunk: TextStreamPart<TOOLS> }) => {
      appendChunkToStreamingMessage(streamingMessage, chunk);
      await debouncePersistentMessage(streamingMessage, {
        immediate:
          chunk.type !== "text-delta" &&
          chunk.type !== "reasoning-delta" &&
          chunk.type !== "tool-input-delta",
      });
    },

    /**
     * onStepFinish: Immediate persistence + stats reporting + balance check + universal notifications + custom logic
     */
    onStepFinish: async (step: StepResult<TOOLS>) => {
      // Provider's raw model ID (e.g., "global.anthropic.claude-sonnet-4-5-xxx")
      const modelId = step.response.modelId;

      // Immediate persistence (critical for message consistency)
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

      // appendStepToStreamingMessage(streamingMessage, step);
      // if (streamingMessage.parts?.length) {
      //   await persistentAIMessageToDB({
      //     mode: "override",
      //     userChatId: studyUserChatId,
      //     message: streamingMessage,
      //   });
      // }

      // Extract tool calls and usage stats
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

      // Report statistics
      if (statReport) {
        const reportedBy = "agent chat";
        const seconds = Math.floor((Date.now() - streamStartTime) / 1000);
        streamStartTime = Date.now(); // Reset for next step
        await Promise.all([
          statReport("duration", seconds, { reportedBy }),
          statReport("steps", toolCalls.length, { reportedBy, toolCalls }),
          statReport("tokens", tokens, { reportedBy, ...extra }),
        ]);
      }

      // =============================================================================
      // Universal Tool Completion Handlers
      // =============================================================================

      // Handle generateReport completion (universal)
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
          // notifyReportCompletion({
          //   reportToken,
          //   studyUserChatId,
          //   logger,
          // }).catch(() => {}); // Don't await, don't block
          // 通过 intercom 发送邮件
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

      // Handle generatePodcast completion (universal)
      const generatePodcastTool = step.toolResults.find(
        (tool) =>
          !tool.dynamic &&
          tool.type === "tool-result" &&
          tool.toolName === StudyToolName.generatePodcast,
      ) as StaticToolResult<Pick<StudyToolSet, StudyToolName.generatePodcast>> | undefined;
      if (generatePodcastTool) {
        const podcastToken =
          generatePodcastTool.output.podcastToken ?? generatePodcastTool.input.podcastToken;
        // notifyPodcastReady({
        //   analystId: analyst.id,
        //   podcast: { token: podcastToken },
        //   logger,
        // }).catch(() => {}); // Don't await, don't block
        // 通过 intercom 发送邮件
        trackEventServerSide({
          userId,
          event: "Study Session Completed",
          properties: {
            userChatId: studyUserChatId,
            podcastToken,
          },
        });
      }

      // Handle saveAnalyst/makeStudyPlan completion (universal - generate chat title)
      const saveAnalystOrMakeStudyPlanTool = step.toolResults.find(
        (tool) =>
          !tool.dynamic &&
          tool.type === "tool-result" &&
          (tool.toolName === StudyToolName.saveAnalyst ||
            tool.toolName === StudyToolName.makeStudyPlan),
      ) as
        | StaticToolResult<
            Pick<StudyToolSet, StudyToolName.saveAnalyst | StudyToolName.makeStudyPlan>
          >
        | undefined;
      // 因为 makeStudyPlan 是没有 execute 的，所以不会出现在 step.toolResults 里，所以，其实这里是不会执行的 ...
      // 现在改到了 saveAnalystFromPlan 里面再执行一次
      if (saveAnalystOrMakeStudyPlanTool) {
        after(
          generateChatTitle(studyUserChatId).catch((error) => {
            logger.error(`Failed to generate chat title: ${error.message}`);
          }),
        );
      }

      // Execute custom onStepFinish logic
      if (agentConfig.specialHandlers?.customOnStepFinish) {
        await agentConfig.specialHandlers.customOnStepFinish(step, {
          studyUserChatId,
          userId,
          logger,
          streamStartTime,
        });
      }

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

      // Check user balance and abort if necessary
      if (await outOfBalance({ userId })) {
        logger.warn("User out of balance, aborting agent");
        safeAbort(studyAbortController);
      }
    },

    /**
     * onFinish: Cleanup managed run
     */
    onFinish: async ({ usage, providerMetadata }) => {
      const cache = providerMetadata?.bedrock?.usage;
      logger.info({ msg: "baseAgentRequest onFinish", usage, cache });
      await cleanupRun();
    },

    /**
     * onError: Handle errors, abort tools, cleanup, notify interruption
     */
    onError: async ({ error }) => {
      // Handle tool abort gracefully (not an error)
      if (/Error executing tool.*abortSignal received/.test((error as Error).message)) {
        logger.warn(`baseAgentRequest tool call aborted: ${(error as Error).message}`);
        return;
      }

      logger.error({ msg: "baseAgentRequest onError", error: (error as Error).message });

      // Abort all running tools
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

      // Notify user of interruption
      notifyStudyInterruption({
        userChatId: studyUserChatId,
        logger,
      }).catch(() => {}); // Don't await
    },

    abortSignal: studyAbortController.signal,
  });

  // =============================================================================
  // Phase 9: Return Stream (Universal: always use merge)
  // =============================================================================

  // Only merge if streamWriter is provided (for non-MCP scenarios)
  streamWriter?.merge(
    streamTextResult.toUIMessageStream({
      generateMessageId: () => streamingMessage.id,
    }),
  );
}
