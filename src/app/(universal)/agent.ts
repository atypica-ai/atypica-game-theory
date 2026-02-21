import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { handleToolCallError, toolCallError } from "@/ai/tools/error";
import { reasoningThinkingTool, webFetchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { loadTeamMemory, loadUserMemory } from "@/app/(memory)/lib/loadMemory";
import { buildMemoryUsagePrompt } from "@/app/(memory)/prompt/memoryUsage";
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
import { listSkillsTool, UniversalToolSet } from "@/app/(universal)/tools";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { loadAllSkillsToMemory } from "@/lib/skill/loadToMemory";
import { loadUserWorkspace, saveUserWorkspace } from "@/lib/skill/workspace";
import { failUserChatRun, startManagedRun } from "@/lib/userChat/runtime";
import { UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import { smoothStream, stepCountIs, streamText, UIMessageStreamWriter } from "ai";
import { createBashTool } from "bash-tool";
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
  }: {
    userId: number;
    userChat: Pick<UserChat, "id" | "token" | "extra">;
    statReport: StatReporter;
    logger: Logger;
    locale: Locale;
  },
  streamWriter?: UIMessageStreamWriter,
) {
  const universalChatId = userChat.id;

  // Start managed run — writes runId to DB, starts watcher, returns abort signal
  const {
    runId,
    abortSignal,
    cleanup: cleanupRun,
  } = await startManagedRun({
    userChatId: universalChatId,
    logger,
  });

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

  // Build system prompt with memory
  const memory = teamId ? await loadTeamMemory(teamId) : await loadUserMemory(userId);
  const baseSystemPrompt = await buildUniversalSystemPrompt({
    userId,
    locale,
    userMemory: memory,
  });
  const memoryUsagePrompt = buildMemoryUsagePrompt({ userMemory: memory, locale });
  const systemPrompt = `${baseSystemPrompt}\n\n${memoryUsagePrompt}`;

  // Load all skills to memory and create bash-tool sandbox
  const skills = await prisma.agentSkill.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  // Load both skills and user workspace
  const skillFiles = await loadAllSkillsToMemory(skills);
  const workspaceFiles = await loadUserWorkspace(userId);

  // Add "workspace/" prefix to workspace files and "skills/" prefix to skill files
  const workspaceFilesWithPrefix: Record<string, string> = {};
  for (const [path, content] of Object.entries(workspaceFiles)) {
    workspaceFilesWithPrefix[`workspace/${path}`] = content;
  }

  const skillFilesWithPrefix: Record<string, string> = {};
  for (const [path, content] of Object.entries(skillFiles)) {
    skillFilesWithPrefix[`skills/${path}`] = content;
  }

  const { tools: bashTools, sandbox } = await createBashTool({
    files: {
      ...workspaceFilesWithPrefix, // Workspace files in workspace/ subdirectory
      ...skillFilesWithPrefix, // Skills in skills/ subdirectory
    },
    destination: "/home/agent", // Set working directory and file destination
    onBeforeBashCall: ({ command }) => {
      // Block script execution - just-bash already doesn't support it, but add extra safeguard
      if (command.match(/python|node|php|ruby|perl|java|go run|\.\/[\w-]+\.sh/i)) {
        logger.warn({
          msg: "Blocked script execution attempt",
          command,
        });
        return {
          command:
            "echo 'Error: Script execution is not supported. Use bash commands only (ls, cat, grep, find, head, tail, etc.)'",
        };
      }
      // Log bash commands for debugging
      logger.debug({ msg: "Executing bash command", command });
    },
  });

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal,
    statReport,
    logger,
  };

  // Merge tools
  const tools: UniversalToolSet = {
    [UniversalToolName.reasoningThinking]: reasoningThinkingTool(agentToolArgs),
    // [UniversalToolName.webSearch]: webSearchTool({ ...agentToolArgs }),
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
    // [UniversalToolName.deepResearch]: deepResearchTool({ userId, ...agentToolArgs }),

    // panel
    [UniversalToolName.requestSelectPersonas]: requestSelectPersonasTool,
    [UniversalToolName.updatePanel]: updatePanelTool({
      userId,
      userChatId: universalChatId,
      ...agentToolArgs,
    }),

    [UniversalToolName.toolCallError]: toolCallError,
  };

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
    onStepFinish: async (step) => {
      // Save AI response to database
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length) {
        await persistentAIMessageToDB({
          mode: "override",
          userChatId: universalChatId,
          message: streamingMessage,
        });
      }

      // Track token usage
      const { tokens, extra } = calculateStepTokensUsage(step);
      statReport("tokens", tokens, {
        reportedBy: "universal",
        userId,
        ...extra,
      });

      // Sync workspace to disk after each step
      await saveUserWorkspace(userId, sandbox);
    },
    onFinish: async () => {
      await saveUserWorkspace(userId, sandbox);
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
