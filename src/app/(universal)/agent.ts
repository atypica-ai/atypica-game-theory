import {
  appendChunkToStreamingMessage,
  createDebouncePersistentMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { handleToolCallError, toolCallError } from "@/ai/tools/error";
import { reasoningThinkingTool, webFetchTool, webSearchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { deepResearchTool } from "@/app/(deepResearch)/deepResearch";
import { loadMemoryForAgent } from "@/app/(memory)/lib/loadMemory";
import { buildMemoryUsagePrompt } from "@/app/(memory)/prompt/memoryUsage";
import { confirmPanelResearchPlanTool } from "@/app/(panel)/tools/confirmPanelResearchPlan";
import { createPanelTool } from "@/app/(panel)/tools/createPanel";
import { listPanelsTool } from "@/app/(panel)/tools/listPanels";
import { requestSelectPersonasTool } from "@/app/(panel)/tools/requestSelectPersonas";
import { updatePanelTool } from "@/app/(panel)/tools/updatePanel";
import { setBedrockCache } from "@/app/(study)/agents/utils";
import {
  discussionChatTool,
  generatePodcastTool,
  generateReportTool,
  interviewChatTool,
  searchPersonasTool,
} from "@/app/(study)/tools";
import { buildUniversalSystemPrompt } from "@/app/(universal)/prompt";
import { buildUniversalSkillCatalog } from "@/app/(universal)/skills/catalog";
import { listSkillsTool, UniversalToolSet } from "@/app/(universal)/tools";
import { createSubAgentTool } from "@/app/(universal)/tools/createSubAgent";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { failUserChatRun, startManagedRun } from "@/lib/userChat/runtime";
import { UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { createAgentSandbox, SANDBOX_SESSIONS_DIR, sandboxSystemPrompt } from "@/sandbox";
import { getUserTokens } from "@/tokens/lib";
import {
  ReasoningUIPart,
  smoothStream,
  stepCountIs,
  streamText,
  TextStreamPart,
  UIMessageStreamWriter,
} from "ai";
import type { Locale } from "next-intl";
import { after, NextResponse } from "next/server";
import { Logger } from "pino";

export async function executeUniversalAgent /*<TOOLS extends UniversalToolSet = UniversalToolSet>*/(
  {
    userId,
    userChat,
    statReport,
    logger,
    locale,
    requestAbortSignal,
  }: {
    userId: number;
    userChat: Pick<UserChat, "id" | "token" | "extra" | "context">;
    statReport: StatReporter;
    logger: Logger;
    locale: Locale;
    /** When provided (e.g. executionMode:"sync"), aborting this signal also stops the agent. */
    requestAbortSignal?: AbortSignal;
  },
  streamWriter?: UIMessageStreamWriter,
) {
  const universalChatId = userChat.id;
  const isPanelProject = typeof userChat.context?.personaPanelId === "number";

  // Create debounced message persistence (5s debounce)
  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    universalChatId,
    5000,
    logger,
  );

  // Start managed run — writes runId to DB, starts watcher, returns abort signal
  const {
    runId,
    abortSignal: managedRunAbortSignal,
    cleanup: cleanupRun,
  } = await startManagedRun({
    userChatId: universalChatId,
    logger,
  });

  // Combine managed-run signal with optional request signal (executionMode:"sync").
  // Either signal aborting will stop the agent.
  const abortSignal = requestAbortSignal
    ? AbortSignal.any([managedRunAbortSignal, requestAbortSignal])
    : managedRunAbortSignal;

  // Get user and team info
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const teamId = user.teamIdAsMember;

  // Check token balance
  const { balance } = await getUserTokens({ userId });
  if (balance !== "Unlimited" && balance <= 0) {
    return NextResponse.json(
      { error: "Insufficient tokens. Please purchase more tokens to continue." },
      { status: 402 },
    );
  }

  // Build system prompt with memory (team + user personal when both exist)
  const memory = await loadMemoryForAgent({ userId });
  const skillCatalog = await buildUniversalSkillCatalog({ userId });
  const baseSystemPrompt = await buildUniversalSystemPrompt({ userId, locale, userMemory: memory });
  const memoryUsagePrompt = buildMemoryUsagePrompt({ userMemory: memory, locale });

  // Create bash-tool sandbox with ReadWriteFs (workspace) + OverlayFs (skills)
  const sessionDir = `${SANDBOX_SESSIONS_DIR}/${userChat.token}`;
  const { tools: bashTools } = await createAgentSandbox({
    userId,
    skills: skillCatalog.uploadedSkills,
    builtinSkills: skillCatalog.builtinSkills,
    sessionDir,
    onBeforeBashCall: ({ command }) => {
      if (command.match(/python|node|php|ruby|perl|java|go run|\.\/[\w-]+\.sh/i)) {
        logger.warn({ msg: "Blocked script execution attempt", command });
        return {
          command:
            "echo 'Error: Script execution is not supported. Use bash commands only (ls, cat, grep, find, head, tail, etc.)'",
        };
      }
      logger.debug({ msg: "Executing bash command", command });
    },
  });

  const sandboxPrompt = sandboxSystemPrompt({
    locale,
    sessionDir,
    hasSkills: skillCatalog.skills.length > 0,
  });

  const systemPrompt = [
    baseSystemPrompt, // 角色定义 + skills + 对话指南
    sandboxPrompt, // 文件系统说明（目录结构、CWD、命令限制）
    memoryUsagePrompt, // 记忆使用指南
    isPanelProject
      ? locale === "zh-CN"
        ? "## Panel 项目执行规则\n当前对话绑定了一个 panel 项目。涉及该项目的 research 执行时，必须由当前主 agent 直接调用 discussionChat、interviewChat、generateReport 等工具；不要调用 createSubAgent，也不要把 panel research 下放到子代理。"
        : "## Panel Project Execution Rule\nThis chat is attached to a panel project. For panel research execution, the lead agent must call discussionChat, interviewChat, generateReport, and related tools directly. Do not call createSubAgent or delegate panel research to a sub-agent."
      : "",
  ].join("\n\n");

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal,
    statReport,
    logger,
  };

  // Merge tools
  const tools: UniversalToolSet = {
    [UniversalToolName.reasoningThinking]: reasoningThinkingTool(agentToolArgs),
    [UniversalToolName.webSearch]: webSearchTool({
      provider: "tavily",
      studyUserChatId: universalChatId,
      ...agentToolArgs,
    }),
    [UniversalToolName.webFetch]: webFetchTool({ locale }),

    // bash and skills
    [UniversalToolName.listSkills]: listSkillsTool({ userId }),
    [UniversalToolName.bash]: bashTools.bash,
    [UniversalToolName.readFile]: bashTools.readFile,
    [UniversalToolName.writeFile]: bashTools.writeFile,

    // study agent
    [UniversalToolName.searchPersonas]: searchPersonasTool({
      userId,
      userChatId: universalChatId,
      ...agentToolArgs,
    }),
    [UniversalToolName.discussionChat]: discussionChatTool({
      userId,
      userChatId: universalChatId,
      ...agentToolArgs,
    }),
    [UniversalToolName.interviewChat]: interviewChatTool({
      userId,
      userChatId: universalChatId,
      ...agentToolArgs,
    }),
    [UniversalToolName.generateReport]: generateReportTool({
      userId,
      userChatId: universalChatId,
      ...agentToolArgs,
    }),
    [UniversalToolName.generatePodcast]: generatePodcastTool({
      userId,
      userChatId: universalChatId,
      ...agentToolArgs,
    }),
    [UniversalToolName.deepResearch]: deepResearchTool({ userId, ...agentToolArgs }),
    // panel
    [UniversalToolName.listPanels]: listPanelsTool({ userId }),
    [UniversalToolName.createPanel]: createPanelTool({ userId, logger }),
    [UniversalToolName.requestSelectPersonas]: requestSelectPersonasTool,
    [UniversalToolName.updatePanel]: updatePanelTool({
      userId,
      userChatId: universalChatId,
      ...agentToolArgs,
    }),
    [UniversalToolName.confirmPanelResearchPlan]: confirmPanelResearchPlanTool,

    [UniversalToolName.toolCallError]: toolCallError,
  };

  // Panel project detail pages derive discussion/interview state from the lead
  // universal chat's tool calls, so panel research must stay on the lead agent.
  if (!isPanelProject) {
    tools[UniversalToolName.createSubAgent] = createSubAgentTool({
      userId,
      teamId,
      ...agentToolArgs,
    });
  }

  // Load messages
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(universalChatId, {
    tools,
  });

  // Stream text
  const streamTextResult = streamText<UniversalToolSet>({
    model: llm("claude-sonnet-4-5"),
    providerOptions: defaultProviderOptions(),
    system: systemPrompt,
    messages: coreMessages,
    tools,
    stopWhen: stepCountIs(15),
    prepareStep: async (options) => {
      const { messages: currentMessages } = options;
      const messages = setBedrockCache("claude-sonnet-4-5", [...currentMessages]);
      return {
        messages,
      };
    },
    experimental_repairToolCall: handleToolCallError,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    /**
     * onChunk: Incremental message persistence with debouncing
     * Save tool call inputs to DB BEFORE tool execution starts, so frontend polling can see them.
     * Text/reasoning/tool-input deltas are debounced (5s); other chunk types trigger immediate save.
     */
    onChunk: async ({ chunk }: { chunk: TextStreamPart<UniversalToolSet> }) => {
      appendChunkToStreamingMessage(streamingMessage, chunk);
      await debouncePersistentMessage(streamingMessage, {
        immediate:
          chunk.type !== "text-delta" &&
          chunk.type !== "reasoning-delta" &&
          chunk.type !== "tool-input-delta",
      });
    },

    onStepFinish: async (step) => {
      // Flush any pending debounced messages
      await immediatePersistentMessage();

      // Fix reasoning parts — chunk-level reasoning lacks providerMetadata (signature),
      // only available at step level. Replace the last reasoning part with the complete version.
      {
        const reasoning = step.content.find((part) => part.type === "reasoning");
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
              userChatId: universalChatId,
              message: streamingMessage,
            });
          }
        }
      }

      // Old pattern — replaced by onChunk incremental persistence
      // appendStepToStreamingMessage(streamingMessage, step);
      // if (streamingMessage.parts?.length) {
      //   await persistentAIMessageToDB({
      //     mode: "override",
      //     userChatId: universalChatId,
      //     message: streamingMessage,
      //   });
      // }

      // Track token usage
      const { tokens, extra } = calculateStepTokensUsage(step);
      statReport("tokens", tokens, {
        reportedBy: "universal",
        userId,
        ...extra,
      });
    },
    onFinish: async () => {
      await cleanupRun();
    },
    onError: async ({ error }) => {
      logger.error({
        msg: "Universal agent stream error",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      try {
        await failUserChatRun({
          userChatId: universalChatId,
          runId,
          error: error instanceof Error ? error.message : String(error),
        });
      } catch {
        await cleanupRun();
      }
    },
    onAbort: async () => {
      // abortSignal 被触发，用来做一些清理
    },
    abortSignal,
  });

  after(
    streamTextResult
      .consumeStream()
      .then(() => logger.info("universal consumeStream completed"))
      .catch((error) =>
        logger.error({ msg: "universal consumeStream error", error: (error as Error).message }),
      ),
  );

  streamWriter?.merge(
    streamTextResult.toUIMessageStream({
      generateMessageId: () => streamingMessage.id,
    }),
  );
}
