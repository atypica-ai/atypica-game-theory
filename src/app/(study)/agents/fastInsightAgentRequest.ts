import {
  appendChunkToStreamingMessage,
  createDebouncePersistentMessage,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { fastInsightSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { initStudyStatReporter } from "@/ai/tools/stats";
import {
  generatePodcastTool,
  generateReportTool,
  handleToolCallError,
  planPodcastTool,
  toolCallError,
  webFetchTool,
  webSearchTool,
} from "@/ai/tools/tools";
import { AgentToolConfigArgs, ToolName } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { deepResearchTool } from "@/app/(deepResearch)/deepResearch";
import { trackEventServerSide } from "@/lib/analytics/server";
import { generateChatTitle, setUserChatError } from "@/lib/userChat/lib";
import { safeAbort } from "@/lib/utils";
import { Analyst, AnalystKind, UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import {
  ImagePart,
  smoothStream,
  stepCountIs,
  streamText,
  TextPart,
  ToolChoice,
  TypedToolResult,
  UIMessageStreamWriter,
} from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { backgroundChatUntilCancel, raceForUserChat } from "./background";
import { notifyStudyInterruption } from "./notify";
import {
  calculateToolUsage,
  outOfBalance,
  setBedrockCache,
  waitUntilAttachmentsProcessed,
} from "./utils";

// autopolot 模式设置一个较大的值，后面 stop when 会判断是否要停止的
const MAX_STEPS_EACH_ROUND = 10;

/**
 * Fast Insight agent request handler for podcast-first research workflow.
 *
 * Data Flow:
 * - Tools return results only, no database updates
 * - All analyst updates (topic, kind) are handled in onStepFinish:
 *   - planPodcast result → analyst.topic, analyst.kind
 *
 * 参考了 https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#storing-messages 的设计来实现
 */
export async function fastInsightAgentRequest({
  userChat: {
    id: studyUserChatId,
    // extra: userChatExtra,
    analyst,
  },
  userId,
  // teamId,
  // reqSignal,
  logger,
  locale,
  streamWriter,
}: {
  userChat: {
    id: number;
    extra: UserChatExtra;
    analyst: Analyst;
  };
  userId: number;
  teamId: number | null;
  reqSignal: AbortSignal | null;
  logger: Logger;
  locale: Locale;
  streamWriter: UIMessageStreamWriter;
}) {
  await setUserChatError(studyUserChatId, null);

  const { statReport } = initStudyStatReporter({ userId, studyUserChatId, logger });
  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    studyUserChatId,
    5000,
    logger,
  ); // 5s debounce

  // Tools
  const toolAbortController = new AbortController();
  const studyAbortController = new AbortController();

  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortController.signal,
    statReport,
    logger: logger,
  };

  // Build tools object: start with regular tools, then merge MCP tools
  // Using the same pattern as createSubAgent for type compatibility
  // Note: Tools only return results; analyst.topic is saved in onStepFinish
  const allTools = {
    [ToolName.webFetch]: webFetchTool({ locale }),
    [ToolName.webSearch]: webSearchTool({ provider: "perplexity", ...agentToolArgs }),
    // ⚠️ planPodcast tool returns planning result; analyst.topic will be updated in onStepFinish below
    [ToolName.planPodcast]: planPodcastTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.generatePodcast]: generatePodcastTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.generateReport]: generateReportTool({ studyUserChatId, ...agentToolArgs }),
    // 直接使用 tool，没必要用 mcp 了，因为已经写死了 tool name
    // ⚠️ deepResearch tool returns result in plainText, which enters messages for studyLog generation
    [ToolName.deepResearch]: deepResearchTool({ userId, ...agentToolArgs }),
    [ToolName.toolCallError]: toolCallError,
  };

  // Load DeepResearch MCP to get the deepResearchTool
  // const deepResearchClient = await createDeepResearchMcpClient(userId);
  // const deepResearchToolName = "atypica_deep_research";
  // const deepResearchToolSet = await deepResearchClient.tools();
  // const deepResearchTool = deepResearchToolSet[deepResearchToolName];
  // if (!deepResearchTool) {
  //   throw new Error("Deep research tool not found");
  // }

  // // Add MCP tool using Object.assign for type compatibility
  // Object.assign(allTools, {
  //   [ToolName.deepResearch]: deepResearchTool({ userId, ...agentToolArgs }),
  // });
  const { coreMessages, streamingMessage, toolUseCount } = await prepareMessagesForStreaming(
    studyUserChatId,
    { tools: allTools },
  );

  const parsedAttachments = await waitUntilAttachmentsProcessed({
    analyst: analyst,
    locale,
    streamWriter,
    streamingMessage: streamingMessage, // 和后面 toUIMessageStream 固定 messageId 同理，要固定 messageId, 不然 waitUntilAttachmentsProcessed 里面的消息在 UI 上会显示 2 条，因为后面 toUIMessageStream 会改变 id
  });

  const tools = allTools;
  const toolChoice: ToolChoice<typeof allTools> = "auto";
  const maxTokens: number | undefined = undefined;
  let maxSteps = MAX_STEPS_EACH_ROUND;

  if (
    (toolUseCount[ToolName.generateReport] ?? 0) >= 1 ||
    (toolUseCount[ToolName.generatePodcast] ?? 0) >= 1
  ) {
    maxSteps = 2;
  }

  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);
  const system = fastInsightSystem({
    locale,
  });

  const modelMessages = coreMessages;

  if (parsedAttachments.length) {
    modelMessages.unshift({
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
    });
  }

  let streamStartTime = Date.now();
  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: defaultProviderOptions,
    system: system,
    messages: modelMessages,
    tools: tools,
    toolChoice: toolChoice,
    experimental_repairToolCall: handleToolCallError,
    maxOutputTokens: maxTokens,

    stopWhen: [
      stepCountIs(maxSteps),
      ({ steps }) => {
        return steps.some((step) =>
          step.toolResults.some(
            (toolResult) =>
              toolResult?.toolName === ToolName.generatePodcast ||
              toolResult?.toolName === ToolName.generateReport,
          ),
        );
      },
    ],

    prepareStep: async ({ messages: modelMessages }) => {
      logger.info({ msg: "studyAgentRequest prepareStep", messagesLength: modelMessages.length });
      const toolUseCount = calculateToolUsage(modelMessages);
      let activeTools: (keyof typeof allTools)[] | undefined = undefined;
      if (
        (toolUseCount[ToolName.generateReport] ?? 0) > 0 ||
        (toolUseCount[ToolName.generatePodcast] ?? 0) > 0
      ) {
        activeTools = [
          ToolName.generateReport as const,
          ToolName.generatePodcast as const,
          ToolName.toolCallError as const,
        ];
      } else {
        if (
          ((toolUseCount[ToolName.planStudy] ?? 0) < 1 &&
            (toolUseCount[ToolName.webSearch] ?? 0) >= 1) ||
          (toolUseCount[ToolName.webSearch] ?? 0) >= 3
        ) {
          activeTools = (Object.keys(allTools) as (keyof typeof allTools)[]).filter(
            (toolName) => toolName !== ToolName.webSearch,
          );
        }
      }
      const messages = setBedrockCache("claude-sonnet-4", [...modelMessages]);
      return {
        messages,
        activeTools,
      };
    },

    // https://sdk.vercel.ai/docs/ai-sdk-ui/smooth-stream-chinese
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    onChunk: async ({ chunk }) => {
      appendChunkToStreamingMessage(streamingMessage, chunk);
      await debouncePersistentMessage(streamingMessage, {
        immediate:
          chunk.type !== "text-delta" &&
          chunk.type !== "reasoning-delta" &&
          chunk.type !== "tool-input-delta",
        // 只在 text-delta 类型的时候才 debounce，靠谱点。see https://github.com/bmrlab/atypica-llm-app/issues/40
        // immediate: chunk.type === "tool-call" || chunk.type === "tool-result",
      });
    },

    onStepFinish: async (step) => {
      await immediatePersistentMessage();
      // 注意，stepFinish 一定要保存，并且 immediate:true，前面等待中的 chunk persistent 会被去掉，没影响
      // 有时候 llm 返回的消息很少，前面 onChunk 的 persistent 还在 debounce 的时候，后面 user 的 continue 消息已经保存了，这就会导致
      // - assistant 消息还来不及 create，新的 user 消息会覆盖前一条 user 消息
      // - assistant 消息还不完整，新一轮对话拿到的 messages 不完整
      // 到了这里的 tool calling step 一定是有 result 的，所以得在上面 onChunk 里面获取 call 阶段的 tool
      // v5 和 v4 的 step.toolCalls 的格式差不多，这一点不同于 message.parts
      const toolCalls = step.toolCalls.map((call) => call?.toolName ?? "unknown");
      const { tokens, extra } = calculateStepTokensUsage(step);
      logger.info({
        msg: "fastInsightAgentRequest streamText onStepFinish",
        toolCalls,
        usage: extra.usage,
        cache: extra.cache,
      });
      if (statReport) {
        const reportedBy = "fastInsight chat";
        const seconds = Math.floor((Date.now() - streamStartTime) / 1000);
        streamStartTime = Date.now();
        const promises = [
          statReport("duration", seconds, { reportedBy }),
          statReport("steps", toolCalls.length, { reportedBy, toolCalls }),
          statReport("tokens", tokens, { reportedBy, ...extra }),
        ];
        await Promise.all(promises);
      }
      if (await outOfBalance({ userId })) {
        logger.warn("User out of balance, aborting fastInsight agent");
        // 用完 tokens 以后，只要停止 streamText 就行，不需要做其他事情
        // 到 onStepFinish 的时候，所有 tool 肯定都已经停止，只需要 abort study
        safeAbort(studyAbortController);
      }

      // ⚠️ Store planPodcast result in analyst.topic and kind
      const planPodcastTool = step.toolResults.find(
        (tool) => tool?.toolName === ToolName.planPodcast,
      ) as Extract<TypedToolResult<typeof allTools>, { toolName: ToolName.planPodcast }>;
      if (planPodcastTool && planPodcastTool.output?.text) {
        const { analyst } = await prisma.userChat.findUniqueOrThrow({
          where: { id: studyUserChatId, kind: "study" },
          select: { analyst: { select: { id: true } } },
        });
        if (analyst) {
          await prisma.analyst.update({
            where: { id: analyst.id },
            data: {
              role: "Podcast Researcher",
              topic: planPodcastTool.output.text,
              kind: AnalystKind.fastInsight,
              locale: locale,
            },
          });
          // Generate chat title after saving analyst
          waitUntil(generateChatTitle(studyUserChatId));
        }
      }

      {
        const generateReportOrPodcastTool = step.toolResults.find(
          (tool) =>
            tool?.toolName === ToolName.generateReport ||
            tool?.toolName === ToolName.generatePodcast,
        ) as
          | Extract<
              (typeof step.toolResults)[number],
              { toolName: ToolName.generateReport | ToolName.generatePodcast }
            >
          | undefined;
        if (generateReportOrPodcastTool) {
          // notifyReportCompletion({
          //   // reportToken: generateReportTool.args.reportToken,
          //   reportToken:
          //     generateReportTool.output.reportToken || generateReportTool.input.reportToken, // 要先取 result 里的
          //   studyUserChatId,
          //   logger,
          // }).catch(() => {}); //不 await
          trackEventServerSide({
            userId,
            event: "Study Session Completed",
            properties: { userChatId: studyUserChatId },
          });
        }
      }
    },

    onFinish: async ({ usage, providerMetadata }) => {
      // MCP clients are shared and preloaded, no need to close them here
      const cache = providerMetadata?.bedrock?.usage;
      logger.info({ msg: "fastInsightAgentRequest streamText onFinish", usage, cache });
      await clearBackgroundToken();
    },

    onError: async ({ error }) => {
      // 如果 tool calling 里面直接 throw 异常，会进入这里的 onError
      if (/Error executing tool.*abortSignal received/.test((error as Error).message)) {
        logger.warn(`fastInsightAgentRequest tool call aborted: ${(error as Error).message}`);
        // 不需要 abort study，发起 abort tool 的地方一定会 abort study
        // 不需要 clear background token，因为发起 abort tool 的原因就是 background token 被清空，就算不是，也会在接下来 abort study 以后被清空
        // 不需要记录错误信息或者 notifyStudyInterruption
        return;
      }
      logger.error(`fastInsightAgentRequest streamText onError: ${(error as Error).message}`);
      // @IMPORTANT 这很重要, 中断所有的 tool calling 里可能还在运行的 streamText
      safeAbort(toolAbortController);
      await clearBackgroundToken();
      try {
        // 记录错误信息到数据库
        await setUserChatError(studyUserChatId, (error as Error).message);
      } catch (dbError) {
        logger.error(`Error saving error to database: ${(dbError as Error).message}`);
      }
      // 因为 token 不足 abort 不会触发 onError，如果要通知 token 不足，需要单独触发
      notifyStudyInterruption({
        studyUserChatId,
        logger,
      }).catch(() => {}); //不 await
    },

    abortSignal: studyAbortController.signal,
  });

  studyAbortController.signal.addEventListener("abort", async () => {
    await clearBackgroundToken();
  });

  backgroundChatUntilCancel({
    logger,
    studyUserChatId,
    backgroundToken,
    streamTextResult,
    toolAbortController,
    studyAbortController,
  });

  // return streamTextResult.toUIMessageStreamResponse({
  //   // 注意，这里要使用 streamingMessage 的 id，虽然目前不指定只有 study agent 会遇到问题
  //   // 问题是这样，保存数据库用的是 streamingMessage.id，但是 streamText 会给新的 assistant 消息生成一个新的 id，并且在 toDataStreamResponse 里返回给前端
  //   // 当前端调用 addToolResult 的时候，会返回来一条新 id 的 assistang 消息，然后调用 persistentAIMessageToDB 插入的时候，会插入一条新的消息
  //   generateMessageId: () => streamingMessage.id,
  // });
  streamWriter.merge(
    streamTextResult.toUIMessageStream({
      generateMessageId: () => streamingMessage.id,
    }),
  );
}
