import {
  appendChunkToStreamingMessage,
  createDebouncePersistentMessage,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { defaultProviderOptions, llm, type LLMModelName } from "@/ai/provider";
import { getMcpClientManager } from "@/ai/tools/mcp/client";
import { createSubAgentTool, handleToolCallError } from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter, ToolName } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { StudyToolSet } from "@/app/(study)/tools";
import { getTeamConfigWithDefault } from "@/app/team/teamConfig/lib";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { trackEventServerSide } from "@/lib/analytics/server";
import { generateChatTitle, setUserChatError } from "@/lib/userChat/lib";
import { safeAbort } from "@/lib/utils";
import type { Analyst, UserChatExtra } from "@/prisma/client";
import { waitUntil } from "@vercel/functions";
import {
  ImagePart,
  ModelMessage,
  PrepareStepFunction,
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
import { Logger } from "pino";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";
import { notifyReportCompletion, notifyStudyInterruption } from "./notify";
import { buildReferenceStudyContext } from "./referenceContext";
import {
  outOfBalance,
  setBedrockCache,
  shouldDecidePersonaTier,
  waitUntilAttachmentsProcessed,
} from "./utils";

/**
 * Base context shared by all agent types
 *
 * IMPORTANT: toolAbortController and studyAbortController must be created
 * at the call site and passed through this context to ensure the same instances
 * are used both in config creation (for tools) and in baseAgentRequest (for abort logic).
 */
export interface BaseAgentContext {
  userId: number;
  teamId: number | null;
  studyUserChatId: number;
  analyst: Analyst;
  userChatExtra: UserChatExtra;

  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortController: AbortController; // Shared instance for aborting tool execution
  studyAbortController: AbortController; // Shared instance for aborting study execution
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
  model: LLMModelName;
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
  config: AgentRequestConfig<TOOLS>,
  streamWriter: UIMessageStreamWriter,
) {
  const {
    userId,
    studyUserChatId,
    userChatExtra,
    analyst,
    locale,
    logger,
    statReport,
    toolAbortController,
    studyAbortController,
  } = baseContext;

  // =============================================================================
  // Phase 1: Initialization
  // =============================================================================

  // Clear previous error messages
  await setUserChatError(studyUserChatId, null);

  // Create debounced message persistence (5s debounce)
  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    studyUserChatId,
    5000,
    logger,
  );

  // Note: toolAbortController and studyAbortController are received from baseContext.
  // They must be created at the call site to ensure the same instances are shared
  // between config creation (for tools) and this function (for abort logic).

  // =============================================================================
  // Phase 2: Prepare Messages
  // =============================================================================

  // Prepare streaming messages
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(studyUserChatId, {
    tools: config.tools,
  });

  // =============================================================================
  // Phase 3: Universal Attachment Processing
  // =============================================================================

  // Process attachments if analyst is provided (universal for all agents)
  const parsedAttachments = analyst
    ? await waitUntilAttachmentsProcessed({
        analyst,
        locale,
        streamWriter,
        streamingMessage,
      })
    : [];

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
  let finalSystemPrompt = config.systemPrompt;
  if (teamSystemPrompt && typeof teamSystemPrompt === "object" && locale in teamSystemPrompt) {
    const prompt = teamSystemPrompt[locale];
    if (prompt) {
      finalSystemPrompt = `${config.systemPrompt}\n\n${prompt}`;
    }
  }

  // Build final tools (add createSubAgent if MCP clients available)
  const finalTools = { ...config.tools };
  if (mcpClients.length > 0) {
    const agentToolArgs: AgentToolConfigArgs = {
      locale,
      abortSignal: toolAbortController.signal,
      statReport,
      logger,
    };
    finalTools[ToolName.createSubAgent] = createSubAgentTool({
      userId,
      clients: mcpClients,
      ...agentToolArgs,
    });
    logger.info({ msg: "Added createSubAgent tool", mcpClientsCount: mcpClients.length });
  }

  // =============================================================================
  // Phase 5: Universal Persona Tier Decision (for first-time users)
  // =============================================================================

  // Check persona tier decision for first-time users (only if this is the first message)
  if (coreMessages.length === 1 && coreMessages[0].role === "user") {
    const shouldDecide = await shouldDecidePersonaTier({
      locale,
      userId,
      studyUserChatId,
      streamWriter,
      streamingMessage,
    });

    if (shouldDecide) {
      // Persona tier decision UI already sent, exit early
      return;
    }
  }

  // =============================================================================
  // Phase 6: Build Model Messages
  // =============================================================================

  let modelMessages: ModelMessage[] = [...coreMessages];

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
  if (userChatExtra?.referenceUserChats) {
    const referenceStudyContext = await buildReferenceStudyContext({
      referenceTokens: userChatExtra.referenceUserChats,
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
  // Phase 7: Background Execution Setup
  // =============================================================================

  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);

  // =============================================================================
  // Phase 8: streamText Configuration
  // =============================================================================

  let streamStartTime = Date.now();
  const streamTextResult = streamText<TOOLS>({
    // Core configuration
    model: llm(config.model),
    providerOptions: defaultProviderOptions,
    system: finalSystemPrompt, // Use final system prompt (with team prompt appended)
    messages: modelMessages,
    tools: finalTools, // Use final tools (with createSubAgent if MCP available)
    toolChoice: config.toolChoice ?? "auto",
    experimental_repairToolCall: handleToolCallError,
    maxOutputTokens: config.maxTokens,

    // Stop conditions
    stopWhen: [
      stepCountIs(config.maxSteps ?? 30),
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
      const customResult = config.specialHandlers?.customPrepareStep
        ? await config.specialHandlers.customPrepareStep(options)
        : undefined;

      // Apply Bedrock cache for prompt caching
      const messages = config.model.startsWith("claude-")
        ? setBedrockCache(config.model as `claude-${string}`, [...currentMessages])
        : [...currentMessages];

      return {
        messages,
        activeTools: customResult?.activeTools,
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
      // Immediate persistence (critical for message consistency)
      await immediatePersistentMessage();

      // Extract tool calls and usage stats
      const toolCalls = step.toolCalls.map((call) => call?.toolName ?? "unknown");
      const { tokens, extra } = calculateStepTokensUsage(step);

      logger.info({
        msg: "baseAgentRequest onStepFinish",
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

      // Check user balance and abort if necessary
      if (await outOfBalance({ userId })) {
        logger.warn("User out of balance, aborting agent");
        safeAbort(studyAbortController);
      }

      // =============================================================================
      // Universal Tool Completion Handlers
      // =============================================================================

      // Handle generateReport completion (universal)
      const generateReportTool = step.toolResults.find(
        (tool) =>
          !tool.dynamic && tool.type === "tool-result" && tool.toolName === ToolName.generateReport,
      ) as StaticToolResult<Pick<StudyToolSet, ToolName.generateReport>> | undefined;

      if (generateReportTool && "output" in generateReportTool && generateReportTool.output) {
        const reportToken =
          generateReportTool.output.reportToken ?? generateReportTool.input.reportToken;
        if (reportToken) {
          notifyReportCompletion({
            reportToken,
            studyUserChatId,
            logger,
          }).catch(() => {}); // Don't await, don't block
          trackEventServerSide({
            userId,
            event: "Study Session Completed",
            properties: { userChatId: studyUserChatId },
          });
        }
      }

      // Handle generatePodcast completion (universal)
      const generatePodcastTool = step.toolResults.find(
        (tool) =>
          !tool.dynamic &&
          tool.type === "tool-result" &&
          tool.toolName === ToolName.generatePodcast,
      ) as StaticToolResult<Pick<StudyToolSet, ToolName.generatePodcast>> | undefined;
      if (generatePodcastTool) {
        trackEventServerSide({
          userId,
          event: "Study Session Completed",
          properties: { userChatId: studyUserChatId },
        });
      }

      // Handle saveAnalyst completion (universal - generate chat title)
      const saveAnalystTool = step.toolResults.find(
        (tool) =>
          !tool.dynamic && tool.type === "tool-result" && tool.toolName === ToolName.saveAnalyst,
      ) as StaticToolResult<Pick<StudyToolSet, ToolName.saveAnalyst>> | undefined;
      if (saveAnalystTool) {
        waitUntil(generateChatTitle(studyUserChatId));
      }

      // Handle planPodcast completion (universal - generate chat title)
      const planPodcastTool = step.toolResults.find(
        (tool) =>
          !tool.dynamic && tool.type === "tool-result" && tool.toolName === ToolName.planPodcast,
      ) as StaticToolResult<Pick<StudyToolSet, ToolName.planPodcast>> | undefined;
      if (planPodcastTool) {
        waitUntil(generateChatTitle(studyUserChatId));
      }

      // Execute custom onStepFinish logic
      if (config.specialHandlers?.customOnStepFinish) {
        await config.specialHandlers.customOnStepFinish(step, {
          studyUserChatId,
          userId,
          logger,
          streamStartTime,
        });
      }
    },

    /**
     * onFinish: Cleanup background token
     */
    onFinish: async ({ usage, providerMetadata }) => {
      const cache = providerMetadata?.bedrock?.usage;
      logger.info({ msg: "baseAgentRequest onFinish", usage, cache });
      await clearBackgroundToken();
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
      await clearBackgroundToken();

      try {
        // Save error message to database
        await setUserChatError(studyUserChatId, (error as Error).message);
      } catch (dbError) {
        logger.error({ msg: "Error saving error to database", error: (dbError as Error).message });
      }

      // Notify user of interruption
      notifyStudyInterruption({
        studyUserChatId,
        logger,
      }).catch(() => {}); // Don't await
    },

    abortSignal: studyAbortController.signal,
  });

  // =============================================================================
  // Phase 9: Background Execution
  // =============================================================================

  // Clear background token on abort
  studyAbortController.signal.addEventListener("abort", async () => {
    await clearBackgroundToken();
  });

  // Start background execution until canceled
  backgroundChatUntilCancel({
    logger,
    studyUserChatId,
    backgroundToken,
    streamTextResult,
    toolAbortController,
    studyAbortController,
  });

  // =============================================================================
  // Phase 10: Return Stream (Universal: always use merge)
  // =============================================================================

  streamWriter.merge(
    streamTextResult.toUIMessageStream({
      generateMessageId: () => streamingMessage.id,
    }),
  );
}
