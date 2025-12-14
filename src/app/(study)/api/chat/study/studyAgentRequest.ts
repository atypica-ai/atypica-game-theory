import {
  appendChunkToStreamingMessage,
  createDebouncePersistentMessage,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { studySystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { getMcpClientManager } from "@/ai/tools/mcp/client";
import { initStudyStatReporter } from "@/ai/tools/stats";
import {
  buildPersonaTool,
  createSubAgentTool,
  generatePodcastTool,
  generateReportTool,
  handleToolCallError,
  interviewChatTool,
  planStudyTool,
  reasoningThinkingTool,
  requestInteractionTool,
  saveAnalystStudySummaryTool,
  saveAnalystTool,
  scoutTaskChatTool,
  searchPersonasTool,
  toolCallError,
  webSearchTool,
} from "@/ai/tools/tools";
import { AgentToolConfigArgs, ToolName } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { getTeamConfigWithDefault } from "@/app/team/teamConfig/lib";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { trackEventServerSide } from "@/lib/analytics/server";
import { setUserChatError } from "@/lib/userChat/lib";
import { safeAbort } from "@/lib/utils";
import { Analyst, UserChatExtra } from "@/prisma/client";
import {
  ImagePart,
  smoothStream,
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

// autopolot 模式默认 15 步，webSearch 2 + saveAnalyst 1 + searchPersonas 1 + scoutTaskChat 2 + buildPersona 2 + interviewChat 2 + saveAnalystStudySummary 1 + generateReport 1
const MAX_STEPS_EACH_ROUND = 15;
// const TOKENS_COMSUME_LIMIT = 1_000_000; // 最新统计来看，100 万 tokens 足够

// 参考了 https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#storing-messages 的设计来实现
export async function studyAgentRequest({
  userChat: { id: studyUserChatId, extra: userChatExtra, analyst },
  userId,
  teamId,
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
  // 清除之前的错误信息（如果有的话）
  await setUserChatError(studyUserChatId, null);

  // 从 new study interview 过来或者是有参考研究的，不需要再 clarify
  const briefStatus: "CLARIFIED" | "DRAFT" =
    userChatExtra?.briefUserChatId || userChatExtra?.referenceUserChats?.length
      ? "CLARIFIED"
      : "DRAFT";
  // Get reference study contexts if available
  const referenceStudyContext = userChatExtra?.referenceUserChats
    ? await buildReferenceStudyContext({
        referenceTokens: userChatExtra.referenceUserChats,
        userId,
        locale,
      })
    : null;

  const { statReport } = initStudyStatReporter({ userId, studyUserChatId, logger });
  const { debouncePersistentMessage, immediatePersistentMessage } = createDebouncePersistentMessage(
    studyUserChatId,
    5000,
    logger,
  ); // 5s debounce

  // Tools
  const toolAbortController = new AbortController();
  const studyAbortController = new AbortController();

  // Load MCP clients (team-specific from DB, empty for personal users)
  const manager = getMcpClientManager();
  const clients = teamId ? await manager.getClientsForTeam(teamId) : []; // Personal users have no MCP clients
  logger.info({ msg: "Loaded mcp clients", clients, teamId });
  const teamStudySystemPrompt = teamId
    ? await getTeamConfigWithDefault(teamId, TeamConfigName.studySystemPrompt, {
        "zh-CN": "",
        "en-US": "",
      })
    : null;
  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal: toolAbortController.signal,
    statReport,
    logger: logger,
  };
  const allTools = {
    [ToolName.requestInteraction]: requestInteractionTool,
    [ToolName.webSearch]: webSearchTool({ provider: "tavily", studyUserChatId, ...agentToolArgs }),
    [ToolName.saveAnalyst]: saveAnalystTool({ studyUserChatId }),
    [ToolName.reasoningThinking]: reasoningThinkingTool({ ...agentToolArgs }),
    [ToolName.searchPersonas]: searchPersonasTool({ userId, ...agentToolArgs }),
    [ToolName.scoutTaskChat]: scoutTaskChatTool({ userId, ...agentToolArgs }),
    [ToolName.buildPersona]: buildPersonaTool({ userId, ...agentToolArgs }),
    [ToolName.interviewChat]: interviewChatTool({ userId, studyUserChatId, ...agentToolArgs }),
    [ToolName.saveAnalystStudySummary]: saveAnalystStudySummaryTool({ studyUserChatId }),
    [ToolName.generateReport]: generateReportTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.generatePodcast]: generatePodcastTool({ studyUserChatId, ...agentToolArgs }),
    [ToolName.planStudy]: planStudyTool({
      studyUserChatId,
      teamStudySystemPrompt,
      ...agentToolArgs,
    }),
    ...(clients.length > 0
      ? {
          [ToolName.createSubAgent]: createSubAgentTool({
            userId,
            clients: clients,
            ...agentToolArgs,
          }),
        }
      : {}),
    [ToolName.toolCallError]: toolCallError,
  };
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

  // todo remove false
  if (coreMessages.length == 1 && coreMessages[0].role == "user") {
    const shouldDecide = await shouldDecidePersonaTier({
      locale,
      userId,
      studyUserChatId,
      streamWriter,
      streamingMessage: streamingMessage,
    });
    if (shouldDecide) {
      // shouldDecidePersonaTier 里面会写入 stream, 这里直接退出就好
      return;
    }
  }

  const tools: Partial<typeof allTools> = allTools;
  const toolChoice: ToolChoice<typeof allTools> = "auto";
  const maxTokens: number | undefined = undefined;
  let maxSteps = MAX_STEPS_EACH_ROUND;

  if (
    (toolUseCount[ToolName.generateReport] ?? 0) >= 1 ||
    (toolUseCount[ToolName.generatePodcast] ?? 0) >= 1
  ) {
    // 一旦报告或播客生成，后面就不允许构建人设和搜索等其他操作了，但是可以继续进行问答，也可以重新生成报告或播客
    // tools = Object.fromEntries(
    //   Object.entries(allTools).filter(([key]) =>
    //     [
    //       // ToolName.requestInteraction,
    //       ToolName.generateReport,
    //       ToolName.generatePodcast,
    //       ToolName.reasoningThinking,
    //       ToolName.toolCallError,
    //     ].includes(key as ToolName),
    //   ),
    // ) as typeof allTools;
    // 👀 上面这部分目前放进 prepareStep 里用 activeTools 来控制了，但是，maxSteps 还是在这里控制
    maxSteps = 2;
  }

  if (briefStatus === "CLARIFIED") {
    delete tools[ToolName.requestInteraction];
  }

  // const tokensConsumed =
  //   (
  //     await prisma.chatStatistics.aggregate({
  //       where: { userChatId: studyUserChatId, dimension: "tokens" },
  //       _sum: { value: true },
  //     })
  //   )._sum.value ?? 0;
  // 超出 tokens 限制以后，这时候每 chat 一次，就是一个很大的 input tokens 数量，所以，不能再继续发送消息，直接返回一个特定的消息
  // 不过现在做了 prompt cache，是不是不大容易超出了？要留意一段日子
  // if (tokensConsumed >= TOKENS_COMSUME_LIMIT) {
  //   studyLog.error(`tokensConsumed ${tokensConsumed} exceeds limit ${TOKENS_COMSUME_LIMIT}`);
  //   const locale = await getLocale();
  //   const message =
  //     locale === "zh-CN"
  //       ? "当前研究已达 Token 上限，无法继续。您可以创建一个新的研究项目继续，或通过右下角的客服聊天窗口联系我们获取帮助"
  //       : "You have reached the tokens limit for this study. You can create a new study project to continue, or contact us through the customer service chat window in the lower right corner for assistance.";
  //   return createDataStreamResponse({
  //     execute: async (dataStream) => {
  //       dataStream.write(formatDataStreamPart("start_step", { messageId: "study-tokens-limit" }));
  //       dataStream.write(formatDataStreamPart("text", message));
  //       dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
  //     },
  //   });
  // }

  const { clearBackgroundToken, backgroundToken } = await raceForUserChat(studyUserChatId);
  const system = studySystem({
    locale,
    briefStatus,
    teamStudySystemPrompt,
    // 为了 prompt cache 生效，需要一个固定的 system prompt，之前放在 system prompt 里面的 tokensStat, toolUseStat 现在去掉了
  });

  const modelMessages = coreMessages;
  // Insert reference study context as the first user message if available
  if (referenceStudyContext) {
    modelMessages.unshift({
      role: "user",
      content: referenceStudyContext,
    });
  }
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
    // model: llm("claude-sonnet-4"),
    model: llm("claude-3-7-sonnet"),
    providerOptions: defaultProviderOptions,
    system: system,
    messages: modelMessages,
    tools: tools,
    toolChoice: toolChoice,
    experimental_repairToolCall: handleToolCallError,
    stopWhen: stepCountIs(maxSteps),
    maxOutputTokens: maxTokens,

    prepareStep: async ({ messages: modelMessages }) => {
      // Object.fromEntries(
      //   Object.entries(allTools).filter(([key]) =>
      //     [
      //       // ToolName.requestInteraction,
      //       ToolName.generateReport,
      //       ToolName.reasoningThinking,
      //       ToolName.toolCallError,
      //     ].includes(key as ToolName),
      //   ),
      // ) as typeof allTools;
      let artifactsGenerated = false;
      for (const message of modelMessages) {
        if (message.role === "tool") {
          for (const part of message.content) {
            if (
              part.toolName === ToolName.generateReport ||
              part.toolName === ToolName.generatePodcast
            ) {
              artifactsGenerated = true;
              break;
            }
          }
        }
        if (artifactsGenerated) break;
      }
      const activeTools = artifactsGenerated
        ? [
            // ToolName.requestInteraction,
            ToolName.generateReport as const,
            ToolName.generatePodcast as const,
            ToolName.reasoningThinking as const,
            ToolName.toolCallError as const,
          ]
        : undefined;
      /**
       * ⚠️ 由于整个过程是一气呵成的，cache 必须在这里面设置，之前调用 streamText 前设置好的 cache 其实大部分没生效
       * 因为比如 messages 长度到 8 的时候，streamText 还在自动跑，始终没有结束
       */
      const messages = setBedrockCache("claude-3-7-sonnet", [...modelMessages]);
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

    onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof allTools> }) => {
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

    onStepFinish: async (step: StepResult<Partial<typeof allTools>>) => {
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
        msg: "studyAgentRequest streamText onStepFinish",
        toolCalls,
        usage: extra.usage,
        cache: extra.cache,
      });
      if (statReport) {
        const reportedBy = "study chat";
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
        logger.warn("User out of balance, aborting study agent");
        // 用完 tokens 以后，只要停止 streamText 就行，不需要做其他事情
        // 到 onStepFinish 的时候，所有 tool 肯定都已经停止，只需要 abort study
        safeAbort(studyAbortController);
      }
      {
        const generateReportTool = step.toolResults.find(
          (tool) => tool?.toolName === ToolName.generateReport,
        ) as
          | Extract<(typeof step.toolResults)[number], { toolName: ToolName.generateReport }>
          | undefined;
        if (generateReportTool) {
          notifyReportCompletion({
            // reportToken: generateReportTool.args.reportToken,
            reportToken:
              generateReportTool.output.reportToken || generateReportTool.input.reportToken, // 要先取 result 里的
            studyUserChatId,
            logger,
          }).catch(() => {}); //不 await
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
      logger.info({ msg: "studyAgentRequest streamText onFinish", usage, cache });
      await clearBackgroundToken();
    },

    onError: async ({ error }) => {
      // 如果 tool calling 里面直接 throw 异常，会进入这里的 onError
      if (/Error executing tool.*abortSignal received/.test((error as Error).message)) {
        logger.warn(`studyAgentRequest tool call aborted: ${(error as Error).message}`);
        // 不需要 abort study，发起 abort tool 的地方一定会 abort study
        // 不需要 clear background token，因为发起 abort tool 的原因就是 background token 被清空，就算不是，也会在接下来 abort study 以后被清空
        // 不需要记录错误信息或者 notifyStudyInterruption
        return;
      }
      logger.error(`studyAgentRequest streamText onError: ${(error as Error).message}`);
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
